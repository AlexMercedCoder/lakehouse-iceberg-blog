---
term: "Iceberg Performance Tuning Guide"
description: "A comprehensive guide to optimizing Apache Iceberg query and write performance, covering partition pruning effectiveness, compaction strategies, manifest organization, predicate pushdown, caching, and engine-specific tuning parameters for production lakehouse workloads."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-predicate-pushdown"
  - "iceberg-compaction"
  - "iceberg-sort-order"
  - "iceberg-bloom-filters"
  - "iceberg-rewrite-manifests"
  - "iceberg-table-design"
keywords:
  - iceberg performance tuning
  - iceberg query performance
  - iceberg optimization
  - iceberg slow queries
  - iceberg performance guide
lastUpdated: 2026-05-14
---

## Iceberg Performance Tuning Guide

Iceberg performance problems typically fall into one of three categories: **slow reads** (poor data skipping or excessive file count), **slow writes** (suboptimal distribution or configuration), or **slow metadata operations** (excessive manifest count or large metadata files). This guide addresses all three.

## Diagnosing Performance Issues

### Step 1: Understand Your Query Pattern

Before tuning, identify what type of query is slow:

- **Point lookup**: `WHERE user_id = 12345` → needs bloom filters or clustering by user_id.
- **Range scan**: `WHERE order_date BETWEEN ... AND ...` → needs partition + sort by date.
- **Full aggregation**: `SELECT SUM(...) FROM large_table` → needs compaction + vectorized execution.
- **Join**: Two large tables joined → needs Z-order clustering on join keys.

### Step 2: Inspect Table Health Metrics

```sql
-- File count and average size (should be 100MB-500MB avg)
SELECT
    COUNT(*) as file_count,
    ROUND(AVG(file_size_in_bytes) / 1024.0 / 1024.0, 1) as avg_mb,
    ROUND(SUM(file_size_in_bytes) / 1024.0 / 1024.0 / 1024.0, 2) as total_gb
FROM analytics.orders.files;

-- Manifest count (should be hundreds, not thousands)
SELECT COUNT(*) as manifest_count FROM analytics.orders.manifests;

-- Column statistics tightness (lower overlap = better data skipping)
SELECT
    COUNT(*) as files,
    ROUND(AVG(CAST(upper_bounds['customer_id'] AS BIGINT) -
              CAST(lower_bounds['customer_id'] AS BIGINT)), 0) as avg_cust_range
FROM analytics.orders.files;

-- Snapshot count (how many are accumulating?)
SELECT COUNT(*) as snapshot_count FROM analytics.orders.snapshots;
```

## Read Performance Tuning

### 1. Compaction: The #1 Read Performance Fix

Most Iceberg read performance problems trace back to too many small files:

```sql
-- Check if compaction is needed
SELECT COUNT(*) as small_files
FROM analytics.orders.files
WHERE file_size_in_bytes < 67108864;  -- files smaller than 64MB

-- If small_files > 10% of total, run compaction
CALL system.rewrite_data_files(
    table => 'analytics.orders',
    strategy => 'binpack',
    options => map(
        'min-file-size-bytes', '67108864',     -- merge files < 64MB
        'target-file-size-bytes', '268435456', -- target 256MB output
        'max-concurrent-file-group-rewrites', '5'
    )
);
```

### 2. Partition Alignment

If queries filter on a column that's not a partition column, pruning can't help:

```sql
-- Current partition: months(order_date)
-- Query: WHERE customer_id = 12345 -- no partition benefit!

-- Solution A: Bloom filter on customer_id (fast to add)
ALTER TABLE analytics.orders SET TBLPROPERTIES (
    'write.parquet.bloom-filter-enabled.column.customer_id' = 'true',
    'write.parquet.bloom-filter-fpp.column.customer_id' = '0.05'
);
-- Then compact to generate bloom filters in new files

-- Solution B: Add a second partition level (partition evolution)
ALTER TABLE analytics.orders
ADD PARTITION FIELD bucket(customer_id, 16);
```

### 3. Z-Order Clustering for Multi-Dimensional Queries

When queries filter on multiple non-partition columns:

```sql
CALL system.rewrite_data_files(
    table => 'analytics.orders',
    strategy => 'sort',
    sort_order => 'zorder(customer_id, product_id)'
);
-- After Z-order: queries filtering on customer_id OR product_id skip more files
```

### 4. Manifest Consolidation

Excessive manifests slow query planning:

```sql
CALL system.rewrite_manifests('analytics.orders');
-- Consolidates thousands of small manifests into fewer, larger ones
-- Reduces planning time without touching data files
```

### 5. Parquet-Level Tuning

```sql
ALTER TABLE analytics.orders SET TBLPROPERTIES (
    -- Larger row groups: more data per read I/O call
    'write.parquet.row-group-size-bytes' = '134217728',  -- 128MB row groups

    -- Smaller pages: better page-level skipping
    'write.parquet.page-size-bytes' = '1048576',          -- 1MB pages

    -- Dictionary encoding for low-cardinality columns
    'write.parquet.dict-size-bytes' = '2097152'           -- 2MB dict threshold
);
```

## Write Performance Tuning

### 1. Right-Size Your Commit Interval (Streaming)

```python
# Too frequent commits (every 10 seconds) → massive small file accumulation
trigger(processingTime="10 seconds")  # ❌ too small

# Better: 5-minute commits balance freshness vs. file size
trigger(processingTime="5 minutes")   # ✅
```

### 2. Tune Write Parallelism

```python
# Spark: match write parallelism to table partition count
spark.conf.set("spark.sql.shuffle.partitions", "200")  # adjust to cluster size

# Set target output file count per partition
spark.conf.set("spark.sql.files.maxPartitionBytes", "268435456")  # 256MB
```

### 3. Use Hash Distribution for Partitioned Writes

```sql
ALTER TABLE analytics.events SET TBLPROPERTIES (
    'write.distribution-mode' = 'hash'  -- group partition data per task
);
-- Prevents cross-partition data within files
```

### 4. Disable Fanout for Sorted Sources

```python
# For sources that are already sorted by partition column
FlinkSink.forRowData(stream)
    .tableLoader(tableLoader)
    .overwrite(false)
    .build()
    # fanout-enabled=false (default): assumes data arrives partition-ordered
    # fanout-enabled=true: handles out-of-order partition data (more memory)
```

## Spark-Specific Tuning

```python
# Critical Spark configs for Iceberg performance
spark.conf.set("spark.sql.adaptive.enabled", "true")          # AQE
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")

# Iceberg-specific
spark.conf.set("spark.sql.iceberg.split-size", "268435456")   # 256MB splits
spark.conf.set("spark.sql.iceberg.target-file-size-bytes", "268435456")

# Vectorized Parquet reading
spark.conf.set("spark.sql.parquet.enableVectorizedReader", "true")
spark.conf.set("spark.sql.parquet.columnarReaderBatchSize", "4096")
```

## Dremio-Specific Performance

Dremio's Intelligent Query Engine provides several Iceberg-specific performance features:

- **Reflections**: Pre-computed, stored materializations of frequently-queried Iceberg views. Sub-millisecond response times for dashboards.
- **Automatic file pruning**: Dremio's planner evaluates Iceberg manifest statistics aggressively.
- **Arrow Flight delivery**: Results returned via Arrow Flight for near-zero deserialization overhead.
- **Automatic table optimization**: Dremio Cloud auto-compacts Iceberg tables without manual scheduling.

## Performance Tuning Checklist

| Issue               | Diagnosis                        | Fix                               |
| ------------------- | -------------------------------- | --------------------------------- |
| Slow range queries  | Many small files                 | Compaction + sort order           |
| Slow point lookups  | No bloom filters                 | Enable bloom filters + compact    |
| Slow query planning | Thousands of manifests           | `rewrite_manifests`               |
| Full table scans    | Wrong partition scheme           | Partition evolution               |
| Slow writes         | Small commit intervals           | Increase batch size / interval    |
| High storage cost   | Many old snapshots               | `expire_snapshots`                |
| Uneven file sizes   | No sort order / bad distribution | `write.distribution-mode` = range |
