---
term: "Iceberg Data Skipping"
description: "Data skipping in Apache Iceberg is the multi-level mechanism by which query engines eliminate irrelevant files and row groups before reading data, using partition pruning at the manifest list level and column min/max statistics at the manifest and Parquet row group levels."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-manifest-file"
  - "iceberg-manifest-list"
  - "iceberg-parquet"
  - "iceberg-clustering"
  - "iceberg-hidden-partitioning"
  - "iceberg-zorder"
keywords:
  - iceberg data skipping
  - iceberg file skipping
  - iceberg predicate pushdown
  - iceberg partition pruning
  - iceberg column statistics skipping
lastUpdated: 2026-05-14
---

## Data Skipping in Apache Iceberg

**Data skipping** is the collection of techniques Iceberg uses to eliminate irrelevant data files and row groups before reading them, dramatically reducing query scan size and improving performance. Data skipping is the primary reason well-designed Iceberg tables can deliver sub-second query performance over petabyte-scale datasets.

## Why Data Skipping Matters

Without data skipping, a query like `WHERE customer_id = 12345` on a 10TB table requires reading every byte of every file to find the matching rows. With data skipping, the engine eliminates 99.9%+ of files before opening a single one: reading only the handful that could possibly contain `customer_id = 12345`.

Data skipping is fundamentally about using **metadata** (statistics, partition values) to prove that a file cannot contain matching rows and therefore can be safely ignored.

## Three Levels of Data Skipping in Iceberg

### Level 1: Partition Pruning (Manifest List Level)

The **manifest list** for each snapshot contains partition summary statistics for each manifest file. The query engine evaluates the query predicate against these partition bounds to eliminate entire manifests.

Example: Table partitioned by `days(event_time)`. Query: `WHERE event_time >= '2026-05-14'`.

- Manifest list entries for dates before May 14 have `upper_bound(event_time) < '2026-05-14'`.
- The engine eliminates all manifests for dates before May 14 without opening them.
- Only manifests for May 14 and later are read.

This is the coarsest but most powerful level of skipping, eliminating entire chunks of the table.

### Level 2: Column Statistics Skipping (Manifest File Level)

Each **manifest file** entry for a data file contains column-level `lower_bounds` and `upper_bounds` statistics. The engine evaluates the query predicate against these statistics to eliminate individual data files.

Example: Query: `WHERE total > 1000.00`.

- Files where `upper_bound(total) <= 1000.00` → skip (no row can match).
- Files where `lower_bound(total) > 1000.00` → read all rows (all match).
- Files where bounds overlap with 1000.00 → read and filter.

For well-clustered data, the majority of files fall into the first category and are skipped entirely.

### Level 3: Parquet Row Group Skipping (File Level)

Within a data file that wasn't skipped at the manifest level, Apache Parquet's row group statistics provide a third skipping level. Each Parquet row group (typically covering 128MB of data) has its own min/max statistics per column.

The Parquet reader evaluates the predicate against row group statistics before decompressing row group data, skipping row groups that can't contain matching rows.

This is the finest-grained level of skipping, eliminating sub-file sections.

## Two-Level Iceberg + Parquet Skipping Pipeline

```
Query: WHERE event_date = '2026-05-14' AND customer_id = 12345

Manifest List Level:
  - 365 manifests (one per day)
  - 364 manifests pruned by partition stats
  - 1 manifest remains (May 14)

Manifest File Level:
  - May 14 manifest has 1,000 data file entries
  - 990 files pruned by column stats (customer_id not in range)
  - 10 data files remain

Parquet Row Group Level:
  - 10 files × 4 row groups = 40 row groups
  - 35 row groups pruned by Parquet stats (customer_id not in range)
  - 5 row groups scanned
  - Matching rows returned
```

Without any skipping: 365 × 1,000 = 365,000 file reads.
With Iceberg + Parquet skipping: 5 row group reads.
**Effective reduction: 99.999%**.

## What Affects Data Skipping Effectiveness

### 1. Data Clustering

The most important factor. When rows with similar values in queried columns are co-located in the same files, column min/max bounds become tight (narrow ranges), enabling high skip rates.

- Random data order → wide bounds → poor skipping
- Clustered data (sorted or Z-ordered) → tight bounds → excellent skipping

### 2. Partition Granularity

Partitions that match query patterns (e.g., daily partitions for daily queries) enable maximum partition pruning. Over-partitioned tables (millions of tiny partitions) shift skipping overhead to file-level statistics.

### 3. File Size

Larger files cover more rows per statistics entry: better coverage per metadata read. Very small files require reading many metadata entries for little data benefit.

### 4. Query Predicate Coverage

Predicates on columns with statistics-covered bounds provide skipping. Predicates on computed or derived expressions typically bypass statistics.

## Monitoring Data Skipping Effectiveness

```sql
-- Check after a query (Spark)
SELECT
  scan_table,
  files_count,
  skipped_files_count,
  skipped_files_count / files_count * 100 as skip_percentage
FROM (
  -- Actual scan stats come from query explain / metrics
  SELECT * FROM db.orders.files
);

-- Better: use EXPLAIN to see planning details
EXPLAIN SELECT * FROM db.orders WHERE total > 500;
```

Look for `Files skipped: X` or `Partition pruning eliminated N partitions` in the execution plan output.
