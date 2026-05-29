---
term: "Iceberg Z-Order Compaction"
description: "A multi-dimensional clustering compaction strategy in Apache Iceberg that sorts data along a Z-order space-filling curve to optimize queries filtering on multiple columns."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-compaction"
  - "iceberg-bin-packing-compaction"
  - "iceberg-sort-based-compaction"
keywords:
  - zorder compaction
  - iceberg z-order
  - multi dimensional clustering
lastUpdated: 2026-05-29
---

## Iceberg Z-Order Compaction

**Iceberg Z-Order Compaction** is a clustering strategy that organizes data along a multi-dimensional space-filling curve. While standard sort-based compaction optimizes queries for a single column, Z-Ordering maps multiple columns into a one-dimensional space, ensuring that data is clustered along all specified dimensions. This layout allows query engines to skip files when queries filter on any combination of the Z-Ordered columns.

### The Z-Order Curve Concept

Z-Ordering projects multi-dimensional coordinates onto a single dimension by interleaving the binary representations of column values.

For example, if you cluster by `age` and `salary`, the binary bits of both values are interleaved to generate a Z-value. When the table is sorted by this Z-value, rows with similar ages and salaries are grouped together in the same data files.

### Syntax and Implementation

Z-Order compaction is executed via Spark SQL by specifying the `zorder` strategy and the target clustering columns:

```sql
/* Execute Z-Order compaction on the customers table */
CALL prod.system.rewrite_data_files(
    table => 'db.customers',
    strategy => 'sort',
    sort_order => 'zorder(age, income)'
);
```

### When to Use Z-Ordering

Z-Ordering is ideal for tables with specific query patterns:

- **Multi-Column Queries**: When users query tables using various combinations of fields (e.g. `WHERE age > 30` or `WHERE income > 50000` or both).
- **High-Cardinality Dimensions**: Best applied to columns that are frequently filtered but have too many unique values to be used as physical partition keys (which would cause the small file problem).
- **Resource Cost**: Z-Ordering is the most compute-intensive compaction strategy, requiring extensive shuffles, and should be scheduled during maintenance windows.
