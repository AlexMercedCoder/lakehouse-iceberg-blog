---
term: "Small File Problem in Apache Iceberg"
description: "The small file problem in Apache Iceberg occurs when frequent write transactions generate many small Parquet files, degrading query performance through high metadata overhead, reduced data skipping effectiveness, and excessive object storage API calls."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-compaction"
  - "iceberg-clustering"
  - "iceberg-streaming"
  - "iceberg-data-files"
  - "iceberg-manifest-file"
keywords:
  - iceberg small file problem
  - iceberg too many small files
  - iceberg file size optimization
  - iceberg file management
lastUpdated: 2026-05-14
---

## Small File Problem in Apache Iceberg

The **small file problem** is one of the most common operational challenges in Apache Iceberg deployments. It occurs when high-frequency write operations (streaming ingestion, micro-batch jobs, frequent appends) produce many small data files, progressively degrading query performance, increasing metadata overhead, and raising object storage costs.

Understanding and managing the small file problem is essential for running Iceberg in production.

## Why Small Files Form

Every Iceberg write transaction produces at least one data file per write task. The number of files produced equals:

```
files_per_commit = num_write_tasks × num_partitions_touched
```

For a Flink job with 20 tasks committing every minute to a table partitioned by `day(event_time)`:

- 20 tasks × 1 partition = 20 files per commit
- 20 files × 60 commits/hour = 1,200 files/hour
- 1,200 × 24 = **28,800 small files per day**

Each file might be 1–10MB instead of the optimal 256MB, resulting in 25–250x more files than necessary.

## Why Small Files Are Harmful

### 1. Query Performance Degradation

Each file requires:

- An object storage API call to open
- Reading the Parquet file footer (metadata, column statistics, schema)
- Applying any relevant positional/equality delete files
- Row group deserialization

For 28,800 files, this overhead dominates query execution time — even if most files are skipped by partition pruning, the manifest scanning overhead is proportional to file count.

### 2. Reduced Data Skipping Effectiveness

Column min/max statistics in small files cover fewer rows, making bounds less selective:

- A 256MB file covering 5M rows with `customer_id` range 1–10,000: wide bounds, moderate skipping.
- A 1MB file covering 20K rows with the same `customer_id` range: similar bounds, but 256× more files to check.

Small files don't improve column statistics quality relative to their overhead cost.

### 3. Manifest File Growth

Each small file has an entry in the manifest. More files = larger manifests = more time to read and parse manifests during query planning.

### 4. Object Storage Costs

Object storage charges per API request (GET, PUT, LIST). Each file requires multiple requests during its lifecycle (write, read per query, delete on expiration). Thousands of small files → thousands of extra API requests → higher cloud bills.

### 5. Catalog and Snapshot Overhead

More files = more entries per snapshot = larger metadata files = more time to load and process table metadata.

## Diagnosing the Small File Problem

```sql
-- Check average file size for a table (Spark)
SELECT
    AVG(file_size_in_bytes) / 1024 / 1024 as avg_size_mb,
    COUNT(*) as total_files,
    MIN(file_size_in_bytes) / 1024 as min_size_kb,
    MAX(file_size_in_bytes) / 1024 / 1024 as max_size_mb
FROM db.orders.files
WHERE status = 'EXISTING';
```

**Warning thresholds**:

- Average file size < 64MB → compaction overdue
- Total files > 10,000 for a single partition → compaction critical
- More than 50% of files below 10MB → aggressive compaction needed

## Solutions

### 1. Regular Compaction (Primary Solution)

Merge small files into optimally-sized files via `rewrite_data_files`:

```sql
CALL system.rewrite_data_files(
  table => 'db.orders',
  options => map(
    'min-file-size-bytes', '67108864',    -- rewrite files < 64MB
    'target-file-size-bytes', '268435456', -- target 256MB output files
    'max-file-size-bytes', '536870912'     -- cap at 512MB
  )
);
```

### 2. Increase Write Batch Size

For batch jobs, increase the partition output size per task:

```python
# Spark: larger write batches
spark.conf.set("spark.sql.files.maxRecordsPerFile", "5000000")  # 5M rows per file
```

### 3. Increase Flink Commit Interval

For streaming jobs, less frequent commits produce larger files per commit:

```java
// Flink: commit every 5 minutes instead of every 60 seconds
env.enableCheckpointing(300000);  // 5 minutes
```

### 4. Use Dremio Auto-Optimization

Dremio Cloud and Enterprise support automatic background table optimization — automatically monitoring file sizes and triggering compaction when needed, without manual scheduling.

## Optimal File Size

The target file size for Iceberg tables depends on workload:

| Workload                         | Target File Size       |
| -------------------------------- | ---------------------- |
| General analytics                | 256MB–512MB            |
| BI with low latency              | 128MB–256MB            |
| Large-scale batch                | 512MB–1GB              |
| Object storage pricing sensitive | 256MB (fewer requests) |

The Iceberg default target file size is 512MB (configurable via `write.target-file-size-bytes`).
