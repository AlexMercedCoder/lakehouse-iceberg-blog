---
term: "Iceberg Table Design Best Practices"
description: "Iceberg table design best practices cover partition strategy, sort order selection, file format and compression choices, schema conventions, and maintenance configuration: the foundational decisions that determine query performance, write throughput, and operational efficiency for the lifetime of a table."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-hidden-partitioning"
  - "iceberg-sort-order"
  - "iceberg-write-distribution"
  - "iceberg-compaction"
  - "iceberg-parquet"
  - "iceberg-table-properties"
keywords:
  - iceberg table design
  - iceberg best practices
  - iceberg partition design
  - iceberg table optimization
  - iceberg schema design
lastUpdated: 2026-05-14
---

## Iceberg Table Design Best Practices

The decisions made when creating an Iceberg table determine its performance, cost, and maintainability for years. Unlike traditional databases where you can add indexes after the fact with minimal disruption, Iceberg table design choices (partitioning, sort order, file format) have lasting impact. This guide covers the foundational best practices.

## 1. Partition Strategy

### Align Partitioning with Your Primary Filter

The most important partition design principle: **partition by the column(s) that appear most frequently in WHERE clauses**. A good partition scheme eliminates 90%+ of files before scanning begins.

```sql
-- ✅ Good: partition by the primary time dimension
CREATE TABLE analytics.events (
    event_id BIGINT, user_id BIGINT, event_ts TIMESTAMP, event_type STRING
) USING iceberg
PARTITIONED BY (days(event_ts));   -- most queries filter by date range

-- ❌ Poor: partition by a low-cardinality column with uniform distribution
-- PARTITIONED BY (event_type)     -- if event types are uniform, no skipping benefit
```

### Partition Granularity

| Table size / growth rate         | Recommended granularity                |
| -------------------------------- | -------------------------------------- |
| Small (< 10GB)                   | None (partition overhead not worth it) |
| Medium (10GB - 1TB), daily loads | `months()` or `days()`                 |
| Large (1TB+), hourly loads       | `days()`                               |
| Very large (10TB+), streaming    | `hours()` or `days()`                  |

Avoid over-partitioning: too many small partitions produce more small files and more manifest entries: degrading metadata scan performance.

### Multi-Column Partitioning

```sql
-- Partition by time + region for queries that filter both
PARTITIONED BY (months(order_date), region)
-- Good for: "SELECT ... WHERE order_date >= '2026-05' AND region = 'AMER'"
-- Bad for: "SELECT ... WHERE customer_id = 12345" (no benefit)
```

Use multi-column partitioning only when most queries include all partition columns as filters.

### Use Hidden Partitioning

Always use **hidden partition transforms** (Iceberg's native partitioning) rather than creating derived partition columns:

```sql
-- ✅ Hidden partitioning (Iceberg manages the derived column)
PARTITIONED BY (months(order_date))

-- ❌ Hive-style physical partition column (avoid in new Iceberg tables)
-- PARTITIONED BY (order_month)  -- requires users to know the partition column
```

## 2. Sort Order

Sort order determines within-file row arrangement and dramatically affects data skipping effectiveness:

```sql
-- For high-cardinality ID lookups + time range queries
WRITE ORDERED BY customer_id, order_date;

-- For tables with few dominant query dimensions
WRITE ORDERED BY region, order_date;
```

**Z-Order** for multi-dimensional filtering:

```sql
-- Z-order clusters for efficient filtering on ANY subset of dimensions
CALL system.rewrite_data_files(
    table => 'analytics.orders',
    strategy => 'sort',
    sort_order => 'zorder(customer_id, product_id, order_date)'
);
```

## 3. File Format and Compression

**Always use Parquet** for new tables (unless migrating from Hive ORC):

```sql
CREATE TABLE analytics.orders (...)
USING iceberg
TBLPROPERTIES (
    'write.format.default' = 'parquet',           -- always parquet
    'write.parquet.compression-codec' = 'zstd',   -- best compression/speed balance
    'write.parquet.compression-level' = '3',       -- level 3 = good balance
    'write.target-file-size-bytes' = '268435456'  -- 256MB target
);
```

**Compression choices**:

- `zstd`: Best for analytical workloads: excellent compression ratio, fast decompression.
- `snappy`: Faster writes, slightly lower ratio: use for write-heavy streaming.
- `gzip`: Maximum compression, slower: use for cold/archive storage.

**File size target**:

- Production analytical tables: `268435456` (256MB) or `536870912` (512MB).
- Hot streaming tables: `134217728` (128MB): balance between write latency and file count.

## 4. Table Properties Configuration

Set these properties on every production table:

```sql
CREATE TABLE analytics.orders (...) USING iceberg
TBLPROPERTIES (
    -- Format
    'format-version' = '2',                               -- always v2 for new tables
    'write.format.default' = 'parquet',
    'write.parquet.compression-codec' = 'zstd',
    'write.target-file-size-bytes' = '268435456',         -- 256MB

    -- Snapshot retention
    'history.expire.min-snapshots-to-keep' = '10',
    'history.expire.max-snapshot-age-ms' = '604800000',   -- 7 days

    -- Manifest
    'write.manifest.target-size-bytes' = '8388608',       -- 8MB per manifest

    -- Delete strategy
    'write.delete.mode' = 'merge-on-read',               -- MoR for DML-heavy tables
    'write.update.mode' = 'merge-on-read',
    'write.merge.mode' = 'merge-on-read',

    -- Metadata
    'write.metadata.delete-after-commit.enabled' = 'true',
    'write.metadata.previous-versions-max' = '100',

    -- Documentation
    'comment' = 'Canonical orders table. Source of truth for all order analytics.',
    'owner' = 'orders-team@company.com'
);
```

## 5. Schema Conventions

```sql
-- ✅ Good schema practices
CREATE TABLE analytics.orders (
    -- Use BIGINT for all IDs (INT is risky at scale)
    order_id     BIGINT NOT NULL,
    customer_id  BIGINT NOT NULL,
    product_id   BIGINT NOT NULL,

    -- Use DECIMAL for money (never FLOAT/DOUBLE for financial values)
    total_usd    DECIMAL(18, 2) NOT NULL,

    -- Use DATE for date-only, TIMESTAMP for time-included
    order_date   DATE NOT NULL,
    created_at   TIMESTAMP NOT NULL,

    -- Use STRING (not VARCHAR) for Iceberg string columns
    status       STRING NOT NULL,
    region       STRING NOT NULL,

    -- Nullable columns last
    notes        STRING,
    coupon_code  STRING
) USING iceberg;
```

**Column ID stability**: Iceberg's field ID system means column names can change via `RENAME COLUMN` without data rewrites. However, use descriptive names from the start: schema evolution should be for growth, not correction.

## 6. Write Distribution for Clustering

Enable range distribution for read-heavy tables to produce well-clustered files at write time:

```sql
ALTER TABLE analytics.orders SET TBLPROPERTIES (
    'write.distribution-mode' = 'range'  -- globally sorted output
);
```

For streaming tables where write throughput is priority:

```sql
ALTER TABLE analytics.events SET TBLPROPERTIES (
    'write.distribution-mode' = 'none'   -- maximum write speed, compact later
);
```

## 7. Spec Version Selection

| Scenario                             | Recommended spec version                        |
| ------------------------------------ | ----------------------------------------------- |
| New production table                 | `format-version = '2'` (stable, all engines)    |
| Frequent point updates + deletes     | Consider `'3'` when engine support is confirmed |
| Read-mostly, infrequent writes       | `'2'` (no benefit to upgrading)                 |
| Semi-structured data (JSON payloads) | `'3'` (Variant type)                            |

## Common Mistakes to Avoid

- ❌ **Partitioning by UUID or random ID**: No rows sharing a partition → every partition has one file → compaction can't merge files.
- ❌ **Too many small partitions**: Hourly partitions on a table that only receives daily loads → 24x the manifests needed.
- ❌ **Using INT instead of BIGINT for IDs**: INT maxes out at ~2.1 billion: will overflow in large tables.
- ❌ **Float/Double for money columns**: Use `DECIMAL(18,2)` for monetary values.
- ❌ **No sort order on DML-heavy tables**: Without a sort order, compaction can't cluster effectively.
