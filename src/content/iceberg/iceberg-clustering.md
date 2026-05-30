---
term: "Iceberg Table Clustering"
description: "Table clustering in Apache Iceberg co-locates related rows within the same data files to maximize column statistics selectivity and data skipping, implemented through sort-based compaction (linear sort or Z-order) to dramatically reduce query scan size."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-zorder"
  - "iceberg-compaction"
  - "iceberg-hidden-partitioning"
  - "iceberg-manifest-file"
  - "iceberg-data-files"
keywords:
  - iceberg clustering
  - iceberg sort order
  - iceberg data layout
  - iceberg query optimization
  - iceberg co-location
lastUpdated: 2026-05-14
---

## Iceberg Table Clustering

**Table clustering** in Apache Iceberg refers to organizing data within files so that rows with similar values in queried columns are co-located in the same data files. Well-clustered tables provide dramatically better query performance through tighter column statistics and more effective data skipping.

Clustering is the complement to partitioning: while partitioning eliminates entire directories of files based on coarse-grained partition predicates, clustering eliminates individual files within partitions based on fine-grained column value ranges.

## Why Clustering Matters

Without clustering, data within a partition is written in arrival order (random/insertion order). Consider a partition containing 1,000 data files, each with `customer_id` values randomly spread across all customers. A query for `WHERE customer_id = 12345` must scan all 1,000 files because every file's `customer_id` range includes 12345.

With clustering on `customer_id`:

- All rows for `customer_id = 12345` are in the same few files.
- The min/max statistics for `customer_id` in most files exclude 12345 entirely.
- The engine skips 990+ files and reads only the few that contain customer 12345.

## Clustering is Applied via Compaction

Clustering is not a write-time operation: it is applied retroactively during **compaction** (data file rewriting). The compaction job sorts data by the clustering key and writes new files, each containing a contiguous range of key values.

```sql
-- Sort-based compaction in Spark: cluster by customer_id
CALL system.rewrite_data_files(
  table => 'db.orders',
  strategy => 'sort',
  sort_order => 'customer_id ASC NULLS LAST',
  options => map(
    'target-file-size-bytes', '268435456'  -- 256MB target
  )
);
```

## Sort Orders in Iceberg

Iceberg supports defining a **sort order** for a table: the column(s) by which data should be physically ordered when written or compacted. The sort order is stored in table metadata and used by compaction jobs:

```sql
-- Define a sort order for the table
ALTER TABLE db.orders WRITE ORDERED BY customer_id, order_date;

-- View current sort orders
SELECT * FROM db.orders.metadata;
```

When a sort order is defined:

- Compaction jobs use it automatically without specifying `sort_order` in the CALL.
- Some engines (like Spark) can use it as a hint during writes to produce pre-sorted output.

## Clustering Strategies

### Single-Column Linear Sort

Best for tables with one dominant filter column:

```sql
sort_order => 'customer_id ASC'
```

Excellent for `WHERE customer_id = X`, poor for `WHERE product_id = Y`.

### Multi-Column Linear Sort

For tables with a primary + secondary filter column:

```sql
sort_order => 'region ASC, customer_id ASC'
```

Good for `WHERE region = 'us-east' AND customer_id = X`, but poor for queries on `customer_id` without `region`.

### Z-Order (Multi-Dimensional Clustering)

For tables with multiple filter columns used in various combinations:

```sql
sort_order => 'zorder(customer_id, product_id, order_date)'
```

Good for any combination of the listed columns. Best all-purpose approach for multi-predicate workloads. See [Z-Order Clustering](/iceberg/iceberg-zorder/) for details.

## Partitioning vs. Clustering

| Aspect            | Partitioning                                   | Clustering                               |
| ----------------- | ---------------------------------------------- | ---------------------------------------- |
| Granularity       | Coarse (eliminates whole partitions)           | Fine (eliminates individual files)       |
| Applied at        | Write time (automatic)                         | Compaction time (retroactive)            |
| Storage impact    | Directory structure                            | File content ordering                    |
| Query requirement | No filter required (hidden partitioning)       | No filter required (stats-based)         |
| Effectiveness     | Eliminates most files for partition predicates | Reduces files for value-range predicates |

The optimal table layout uses **both**: partition by a coarse time dimension (day, month) to eliminate most partitions for time-range queries, then cluster by frequently-filtered columns within each partition to eliminate most files within the remaining partitions.

## Clustering and Column Statistics Quality

The effectiveness of clustering is directly tied to how tight the column statistics (min/max bounds) become after clustering:

- **Perfect clustering**: Every file contains exactly one customer's rows → min==max for customer_id in each file → 100% data skipping for any specific customer query.
- **Good clustering**: Files contain a narrow range of customer IDs → tight bounds → high skip rate.
- **No clustering**: Files contain all customer IDs → wide bounds → no meaningful skipping.

Monitoring the width of column min/max bounds via `SELECT * FROM db.orders.files` gives insight into clustering quality.

## Maintenance Schedule

Clustering must be reapplied periodically as new data arrives and disrupts the clustered layout:

- **Streaming tables**: Compact hourly or daily to re-cluster newly appended data.
- **Batch-loaded tables**: Compact after each batch load.
- **Low-write tables**: Monthly or quarterly clustering refresh.
