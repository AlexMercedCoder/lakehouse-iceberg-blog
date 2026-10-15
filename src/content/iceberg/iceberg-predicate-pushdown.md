---
term: "Iceberg Predicate Pushdown"
metaTitle: "Iceberg Predicate Pushdown: How Filters Skip Files"
description: "Iceberg predicate pushdown checks WHERE filters against manifest list summaries, manifest file stats, and Parquet row groups, so engines skip files early."
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
lastUpdated: 2026-10-15
---

## Predicate Pushdown in Apache Iceberg

In Iceberg, predicate pushdown means the engine hands your `WHERE` filter to Iceberg's scan planner, which checks it against partition summaries in the manifest list and column min/max stats in manifests to drop whole manifests and data files before any data is read. The file reader then applies the same filter to Parquet row groups.

**Predicate pushdown** is the query optimization technique that moves filter conditions ("predicates") from the query execution layer down to the data storage layer, eliminating irrelevant data as early as possible, at the lowest possible level, before any bytes are transferred or decompressed.

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

This is **partition elimination**: eliminates manifests (and all their data files) for irrelevant partitions in a single metadata-level check.

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

This is **file-level data skipping**: eliminates files that can be proven to not contain matching rows based on min/max statistics.

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
- **Dictionaries**: When a column chunk is fully dictionary-encoded, the reader can skip the row group if the dictionary lacks the queried value.
- **Page indexes**: Readers that support Parquet column indexes can skip individual pages using page-level min/max.
- **Bloom filters**: Skip row groups where a Parquet bloom filter proves the value is absent (enable with `write.parquet.bloom-filter-enabled.column.<col>`).

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

Iceberg's expression evaluators check each side against a file's bounds: a file survives if its `region` range could contain `'AMER'` or could contain `'EMEA'`. Files that can contain neither are skipped.

```sql
-- Complex OR across columns (difficult for min/max)
WHERE status = 'failed' OR total > 10000
```

This is harder: a file must be kept if it might satisfy either condition independently, so skipping only happens for files that fail both. In practice this often keeps most files, and the engine applies the full predicate after reading.

## Monitoring Pushdown Effectiveness

```sql
-- Confirm the filter reaches the Iceberg scan
EXPLAIN SELECT * FROM db.orders WHERE order_date = '2026-05-14';

-- Then compare files scanned vs. files skipped in the engine's
-- scan metrics (Spark UI Iceberg scan node, Dremio query profile).
-- A handful of result files out of hundreds means pushdown is working;
-- result files equal to total files means no pruning happened.
```

## Maximizing Pushdown Effectiveness

| Strategy                            | Pushdown Benefit                            |
| ----------------------------------- | ------------------------------------------- |
| Partition by query filter columns   | Level 1: manifest list elimination          |
| Sort/cluster by filter columns      | Level 2: tight file-level min/max           |
| Run compaction to reduce file count | Fewer manifest entries to evaluate          |
| Enable bloom filters on ID columns  | Level 3: row group skipping on equality     |
| Use hidden partitioning correctly   | Avoids partition column inclusion in SELECT |
