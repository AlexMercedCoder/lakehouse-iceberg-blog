---
term: "Iceberg Sort Order"
description: "An Iceberg sort order is a table-level specification stored in metadata that defines how data should be physically ordered within data files, enabling engines and compaction jobs to produce well-clustered files that maximize column statistics selectivity and data skipping."
category: "Core Concepts"
relatedTerms:
  - "iceberg-clustering"
  - "iceberg-zorder"
  - "iceberg-compaction"
  - "iceberg-hidden-partitioning"
  - "iceberg-table-properties"
  - "iceberg-manifest-file"
keywords:
  - iceberg sort order
  - iceberg table sort
  - iceberg write ordered by
  - iceberg physical ordering
  - iceberg clustering sort
lastUpdated: 2026-05-14
---

## Iceberg Sort Order

The **Iceberg sort order** is a first-class table-level concept stored in the table metadata that describes how data within a table should be physically ordered in its data files. Sort orders are the formal specification behind table clustering — they tell compaction jobs and write engines exactly how to arrange rows to maximize data skipping effectiveness.

Unlike ad-hoc sort specifications passed as compaction job parameters, a table's sort order is **persistent metadata** that any engine can read and apply automatically.

## Sort Order Specification

A sort order is composed of one or more **sort fields**, each with:

- A **source column** (identified by column ID, not name — safe across renames)
- A **transform** (same transforms as partition specs: `identity`, `bucket`, `truncate`, `year`, `month`, `day`, `hour`)
- A **direction**: `ASC` or `DESC`
- A **null order**: `NULLS FIRST` or `NULLS LAST`

```json
{
  "order-id": 1,
  "fields": [
    {
      "transform": "identity",
      "source-id": 3,
      "direction": "asc",
      "null-order": "nulls-last"
    },
    {
      "transform": "identity",
      "source-id": 5,
      "direction": "asc",
      "null-order": "nulls-last"
    }
  ]
}
```

This specifies: sort by column with ID 3 (e.g., `customer_id`) ascending, then by column with ID 5 (e.g., `order_date`) ascending.

## Defining a Sort Order

```sql
-- Define a sort order at table creation (Spark SQL)
CREATE TABLE db.orders (
    order_id    BIGINT,
    customer_id BIGINT,
    order_date  DATE,
    total       DOUBLE
)
USING iceberg
PARTITIONED BY (months(order_date))
WRITE ORDERED BY customer_id, order_date;

-- Change the sort order after creation
ALTER TABLE db.orders WRITE ORDERED BY customer_id ASC NULLS LAST, total DESC;

-- Remove sort order (set to unsorted)
ALTER TABLE db.orders WRITE UNORDERED;
```

## Sort Order ID and History

Like partition specs and schemas, Iceberg tracks the full history of sort orders with unique `order-id` values. When the sort order is changed:

- A new sort order entry is added to the metadata.
- The `default-sort-order-id` in the table metadata is updated to the new order.
- Existing data files retain metadata indicating which sort order (if any) was used when they were written — though this is informational only.

The **unsorted order** has `order-id: 0` and is the default for new tables unless explicitly specified.

## How Sort Orders Are Used

### Compaction Jobs

The most important consumer of the sort order is the compaction job. When `rewrite_data_files` runs:

```sql
-- Spark: compaction respects the table's defined sort order
CALL system.rewrite_data_files(
  table => 'db.orders',
  strategy => 'sort'
  -- no sort_order needed — uses the table's default sort order
);
```

If the table has a defined sort order, compaction reads it and sorts output files accordingly without requiring explicit specification each time.

### Write Engines

Some engines (particularly Spark with certain configurations) can use the sort order as a hint to sort data at write time, producing pre-sorted output files. This means even without compaction, new files may be reasonably clustered.

```python
# Spark: enable sort-based write using table sort order
spark.conf.set("spark.sql.iceberg.write-data-location", "sorted")
```

## Sort Order vs. Partition Spec

These are complementary, separate metadata concepts:

| Concept        | Purpose                               | Granularity                          |
| -------------- | ------------------------------------- | ------------------------------------ |
| Partition spec | Groups rows into directories/segments | Coarse (eliminates whole partitions) |
| Sort order     | Orders rows within segments           | Fine (improves column statistics)    |

Best practice: use **both** together. Partition by time (eliminates old partitions) + sort by high-cardinality business keys (enables file-level data skipping within the remaining partitions).

## Z-Order as a Sort Order

Z-order is implemented as a special sort order transform in Iceberg. When using Z-order via compaction:

```sql
CALL system.rewrite_data_files(
  table => 'db.orders',
  strategy => 'sort',
  sort_order => 'zorder(customer_id, product_id)'
);
```

This can also be defined as the table's default sort order using the Iceberg API (though SQL syntax for Z-order sort orders varies by engine). See [Z-Order Clustering](/iceberg/iceberg-zorder/) for details.

## Monitoring Sort Order Effectiveness

After applying a sort order via compaction, monitor column statistics quality:

```sql
-- Check how tight the bounds are for the sort key columns
SELECT
  file_path,
  lower_bounds['customer_id'] as min_customer,
  upper_bounds['customer_id'] as max_customer
FROM db.orders.files
ORDER BY min_customer;
```

Tight (narrow) bounds between min and max per file indicate effective clustering. Wide bounds (min ≈ global min, max ≈ global max for every file) indicate the sort is not being applied or data is too small for meaningful clustering.
