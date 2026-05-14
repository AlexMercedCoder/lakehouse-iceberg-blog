---
term: "Iceberg Predicate Pushdown"
description: "Predicate pushdown in Apache Iceberg propagates WHERE clause filter conditions from the query layer down through the manifest list, manifest files, and Parquet row groups to eliminate data at each level before reading, achieving sub-second filtering on petabyte-scale tables."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-data-skipping"
  - "iceberg-manifest-file"
  - "iceberg-hidden-partitioning"
  - "iceberg-bloom-filters"
  - "iceberg-parquet"
keywords:
  - iceberg predicate pushdown
  - iceberg filter pushdown
  - iceberg query optimization
  - iceberg where clause optimization
  - iceberg scan planning
lastUpdated: 2026-05-14
---

## Predicate Pushdown in Apache Iceberg

**Predicate pushdown** is the query optimization technique that moves filter conditions ("predicates") from the query execution layer down to the data storage layer — eliminating irrelevant data as early as possible, at the lowest possible level, before any bytes are transferred or decompressed.

In Apache Iceberg, predicate pushdown works at **three progressive levels**: the manifest list (snapshot level), manifest files (file group level), and Parquet row groups (sub-file level). Together, these three levels can reduce the data actually read to a tiny fraction of the total table size.

## Level 1: Manifest List Pruning (Partition Elimination)

The outermost filter. The manifest list contains a summary of which partitions are covered by each manifest file:

```
Query: WHERE order_date = '2026-05-14'

Manifest List:
  manifest-1.avro → covers partitions: 2026-01-xx, 2026-02-xx  → SKIP
  manifest-2.avro → covers partitions: 2026-03-xx, 2026-04-xx  → SKIP
  manifest-3.avro → covers partitions: 2026-05-xx              → READ
```

Only `manifest-3.avro` is opened. The engine never reads manifests 1 or 2.

This is **partition elimination** — eliminates manifests (and all their data files) for irrelevant partitions in a single metadata-level check.

## Level 2: Manifest File Pruning (File Elimination)

The manifest file contains per-file column statistics (min/max, null count) for every data file. The engine applies the predicate to these statistics:

```
manifest-3.avro:
  data-file-001.parquet → order_date min=2026-05-01, max=2026-05-07  → SKIP
  data-file-002.parquet → order_date min=2026-05-08, max=2026-05-14  → READ
  data-file-003.parquet → order_date min=2026-05-15, max=2026-05-21  → SKIP
  data-file-004.parquet → order_date min=2026-05-22, max=2026-05-31  → SKIP

Only data-file-002 is opened. 3 files are skipped based on manifest statistics.
```

This is **file-level data skipping** — eliminates files that can be proven to not contain matching rows based on min/max statistics.

## Level 3: Row Group Pruning (Sub-File Elimination)

Once a Parquet file is opened, Parquet's native row group statistics provide a third filter level:

```
data-file-002.parquet:
  Row Group 1 → order_date min=2026-05-08, max=2026-05-10  → SKIP
  Row Group 2 → order_date min=2026-05-11, max=2026-05-14  → READ
  Row Group 3 → order_date min=2026-05-12, max=2026-05-14  → READ (overlap)

2 row groups read out of 3.
```

## Level 4: Column Chunk and Page Filter (Innermost)

Within a row group, Parquet can further skip:

- **Column chunks**: Only read the columns referenced in SELECT + WHERE (column projection pushdown).
- **Pages**: With Parquet dictionary pages, skip entire pages where the dictionary doesn't contain the queried value.
- **Bloom filters**: Skip row groups or pages where the bloom filter proves absence.

## Pushdown with Complex Predicates

Iceberg's scan planner evaluates complex predicates for pushdown:

```sql
-- Multi-predicate pushdown
SELECT * FROM db.orders
WHERE order_date >= '2026-05-01'  -- partition elimination
  AND region = 'AMER'             -- column statistics pushdown
  AND total > 1000.00             -- column statistics pushdown
  AND customer_id = 12345;        -- bloom filter pushdown (if enabled)
```

Each predicate is evaluated at the appropriate level:

- `order_date >=` → Manifest list + manifest file statistics.
- `region =` → Manifest file statistics (if region has low cardinality, highly effective).
- `total > 1000.00` → Manifest file statistics (min/max).
- `customer_id = 12345` → Bloom filter (if enabled) + Parquet row group stats.

## OR Predicates and Pushdown

OR predicates are harder to push down:

```sql
WHERE region = 'AMER' OR region = 'EMEA'
```

Iceberg's expression evaluator converts this to a union bound: files where `region_max >= 'AMER' AND region_min <= 'EMEA'` survive. Files entirely outside this range are skipped.

```sql
-- Complex OR across columns (difficult for min/max)
WHERE status = 'failed' OR total > 10000
```

This is harder — files must be kept if they might satisfy either condition independently. Iceberg may fall back to reading all files and applying the predicate at the compute layer.

## Monitoring Pushdown Effectiveness

```sql
-- Check how many files were scanned vs. total
-- (requires query profiling — Spark's EXPLAIN, Dremio's query profile)
EXPLAIN SELECT * FROM db.orders WHERE order_date = '2026-05-14';

-- Look for:
-- "FileScanTask: 1/847 files" → only 1 of 847 files was read (excellent pushdown)
-- vs. "FileScanTask: 847/847 files" → full table scan (no pushdown benefit)
```

## Maximizing Pushdown Effectiveness

| Strategy                            | Pushdown Benefit                            |
| ----------------------------------- | ------------------------------------------- |
| Partition by query filter columns   | Level 1: manifest list elimination          |
| Sort/cluster by filter columns      | Level 2: tight file-level min/max           |
| Run compaction to reduce file count | Fewer manifest entries to evaluate          |
| Enable bloom filters on ID columns  | Level 2-3: hash-based file skipping         |
| Use hidden partitioning correctly   | Avoids partition column inclusion in SELECT |
