---
term: "Iceberg Table Statistics (Puffin)"
description: "Iceberg table statistics are advanced column-level metrics — including NDV (number of distinct values) estimates using Apache DataSketches — stored in Puffin files and used by cost-based query optimizers to improve join ordering, cardinality estimation, and query planning accuracy."
category: "Core Concepts"
relatedTerms:
  - "iceberg-puffin-files"
  - "iceberg-manifest-file"
  - "iceberg-data-skipping"
  - "iceberg-bloom-filters"
  - "dremio-apache-iceberg"
keywords:
  - iceberg statistics
  - iceberg ndv statistics
  - iceberg cost based optimizer
  - iceberg analyze table
  - iceberg column statistics
lastUpdated: 2026-05-14
---

## Iceberg Table Statistics

Apache Iceberg supports two levels of statistics for query optimization:

1. **Per-file manifest statistics** (available in all tables): min/max bounds, null counts, value counts per column per data file — stored in manifest entries. Used for data skipping.

2. **Table-level statistics** (via Puffin files): advanced aggregate statistics across the entire table — NDV estimates, histograms, bloom filter indexes — stored in Puffin files attached to snapshots. Used for cost-based query planning.

This page covers the **table-level statistics** layer — the more advanced layer that requires explicit computation.

## Why Table-Level Statistics Matter

Per-file min/max statistics tell query engines which files to skip. Table-level statistics tell query engines **how to plan the query** — specifically how to estimate the cardinality of operations:

- **Join ordering**: Which table to use as the probe side vs. build side of a hash join? The smaller estimated output goes on the build side. Without NDV statistics, planners use heuristics; with NDV, they use accurate estimates.
- **Aggregation memory**: How much memory should be allocated for a GROUP BY operation? NDV of the grouping column determines estimated output rows.
- **Subquery unnesting**: Cost-based decisions about when to unnest correlated subqueries depend on cardinality estimates.

## Statistics Types

### NDV (Number of Distinct Values)

The most important table statistic. Answers: "How many unique values does `customer_id` have across the entire table?"

Stored as an **Apache DataSketches Theta sketch** or **HLL (HyperLogLog++) sketch** in a Puffin file blob. These are probabilistic data structures that approximate NDV within a tunable error bound (~3% error with typical settings) using very compact memory.

```
NDV(customer_id) ≈ 1,250,000 distinct customers
NDV(status) ≈ 5 (pending, processing, shipped, delivered, cancelled)
NDV(product_id) ≈ 48,320 distinct products
```

A query planner uses these estimates to:

- Order `JOIN orders o JOIN customers c` correctly (orders is larger → join orders last)
- Allocate GROUP BY buffers appropriately
- Choose between broadcast join (small table) and shuffle join (large table)

## Computing Statistics

Statistics must be explicitly computed — they don't update automatically on each write.

### Apache Spark

```sql
-- Compute NDV statistics for all columns
ANALYZE TABLE db.orders COMPUTE STATISTICS FOR ALL COLUMNS;

-- Compute for specific columns only
ANALYZE TABLE db.orders COMPUTE STATISTICS FOR COLUMNS customer_id, product_id, order_date;
```

### PyIceberg (programmatic)

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog("my_catalog", **{...})
table = catalog.load_table("db.orders")

# Statistics computation requires a compute engine
# Use Spark via PySpark for the actual computation
```

### Dremio

Dremio's Intelligent Query Engine can compute and use Iceberg statistics automatically as part of its cost-based optimization. Statistics can be refreshed via:

```sql
-- Dremio: refresh table metadata including statistics
REFRESH TABLE METADATA db.orders;
```

## Inspecting Statistics

```sql
-- Spark: view statistics attached to current snapshot
SELECT * FROM db.orders.snapshot_statistics;

-- Or inspect the snapshot metadata directly
SELECT snapshot_id, statistics
FROM db.orders.snapshots
WHERE snapshot_id = (SELECT current_snapshot_id FROM db.orders.metadata_log LIMIT 1);
```

## Statistics Lifecycle

Statistics are tied to a specific snapshot. When the table is updated:

- New data files are written → existing statistics become stale.
- You must recompute statistics after significant data changes.
- Old statistics (from expired snapshots) are cleaned up automatically with `expire_snapshots`.

**Best practice**: Recompute statistics:

- After initial bulk data loads.
- After large batch updates or compaction runs.
- Before important analytical workloads where join performance matters.
- On a schedule (weekly or after each significant table change).

## Statistics and the Query Planning Pipeline

The full statistics hierarchy a query planner uses:

```
1. Table-level statistics (Puffin NDV)
   → Join ordering, memory allocation, subquery planning

2. Manifest-level statistics (min/max per file)
   → Partition pruning, file-level data skipping

3. Parquet row group statistics (min/max per row group)
   → Sub-file row group skipping

4. Actual data read
   → Row-level predicate evaluation
```

Each layer provides a progressively finer-grained filter, ensuring queries touch the minimum amount of data at every stage.
