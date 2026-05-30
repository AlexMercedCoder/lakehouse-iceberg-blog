---
term: "Z-Order Clustering in Apache Iceberg"
description: "Z-Order (or Z-curve) clustering in Apache Iceberg is a multi-dimensional data layout optimization that co-locates rows with similar values across multiple columns within the same data files, dramatically improving data skipping for multi-column filter queries."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-clustering"
  - "iceberg-compaction"
  - "iceberg-data-files"
  - "iceberg-manifest-file"
  - "iceberg-hidden-partitioning"
keywords:
  - iceberg zorder
  - z-order iceberg
  - iceberg multi column clustering
  - iceberg z-curve
  - iceberg optimize zorder
lastUpdated: 2026-05-14
---

## Z-Order Clustering in Apache Iceberg

**Z-Order** (also called Z-curve or Morton curve ordering) is a space-filling curve algorithm used in Apache Iceberg to cluster data files along multiple dimensions simultaneously. It solves the fundamental problem that traditional linear sorting (sort by column A, then B) provides good skipping for queries filtering on A, but poor skipping for queries filtering only on B.

Z-Order interleaves the bits of multiple column values to produce a single sort key that preserves locality in all dimensions. The result: data files contain rows with similar values across all Z-ordered columns, giving column statistics (min/max bounds) high selectivity for any combination of those columns.

## Why Linear Sort Is Insufficient

Consider a table with `customer_id` and `product_id`, sorted by `(customer_id, product_id)`:

```
Query: WHERE customer_id = 12345 → good file skipping (primary sort key)
Query: WHERE product_id = 999    → poor file skipping (secondary sort key, dispersed)
Query: WHERE customer_id = 12345 AND product_id = 999 → partial skipping
```

A linear sort optimizes only for the leading sort column. Queries on any other column must scan through many files.

## How Z-Order Works

Z-Order interleaves bits from multiple column values to compute a single position on the Z-curve. Rows with similar values in all Z-ordered columns land near each other on the curve: and since files are written in Z-curve order, rows with similar combined values end up in the same files.

For two dimensions (customer_id, product_id), the Z-curve looks like a fractal Z pattern when plotted on a 2D grid. Points near each other in the Z-curve come from a compact region of the 2D grid: meaning they have similar values in both dimensions.

## Applying Z-Order via Compaction

Z-Order is applied during compaction (data file rewriting):

### Apache Spark

```sql
CALL system.rewrite_data_files(
  table => 'db.orders',
  strategy => 'sort',
  sort_order => 'zorder(customer_id, product_id, order_date)',
  options => map(
    'target-file-size-bytes', '268435456'
  )
);
```

### Dremio

```sql
OPTIMIZE TABLE db.orders
REWRITE DATA USING SORT
(customer_id, product_id, order_date);
```

Dremio's optimizer can also automatically apply Z-Order-style clustering based on observed query patterns.

## Z-Order vs. Linear Sort: Which to Choose

| Query Pattern                                 | Recommended Layout                            |
| --------------------------------------------- | --------------------------------------------- |
| Filter on one dominant column                 | Linear sort (single column)                   |
| Filter on 2–4 columns in various combinations | Z-Order                                       |
| Filter on partition column + one other        | Partition + linear sort within partition      |
| Ad-hoc analytics across many columns          | Z-Order on the most commonly filtered columns |

Z-Order typically makes sense when queries involve 2–4 high-cardinality columns in varying combinations. Beyond 4–5 columns, the locality guarantee of Z-Order weakens and the overhead of computing the Z-curve key increases.

## Data Skipping Improvement with Z-Order

The benefit of Z-Order comes from **tighter column statistics** in data files. After Z-Order clustering:

- Each file contains rows with similar values in all Z-ordered columns.
- Column min/max bounds in manifest files become tighter.
- Queries filtering on any subset of the Z-ordered columns skip more files.

Example improvement: A table with 10,000 files and random data distribution might provide 0% data skipping for a combined predicate `WHERE customer_id = X AND product_id = Y`. After Z-Order compaction, the same query might skip 95%+ of files.

## Z-Order and Partitioning

Z-Order works within partitions. For a table partitioned by `day(event_date)`:

1. Partition pruning eliminates most partitions based on the date filter.
2. Within each remaining day-partition, Z-Order on `(customer_id, product_id)` provides fine-grained file skipping.

This two-level approach (partition pruning + Z-Order skipping) is the optimal layout strategy for most production Iceberg tables with complex query patterns.

## Performance Considerations

Z-Order compaction is more expensive than simple bin-packing (more compute required to sort along the Z-curve) but provides much better query performance. The trade-off is worthwhile for tables that:

- Are read heavily in interactive/BI contexts
- Have multi-column filter predicates
- Justify the compaction compute cost with the query savings
