---
term: "Iceberg Decimal Type Widening"
description: "A metadata-only schema evolution rule in Apache Iceberg that permits promoting the precision of a decimal field while keeping the scale constant."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-schema-evolution"
  - "iceberg-nested-type-system"
keywords:
  - decimal type widening
  - iceberg decimal precision
  - schema evolution decimal
lastUpdated: 2026-05-29
---

## Iceberg Decimal Type Widening

**Iceberg Decimal Type Widening** is a schema evolution feature defined by the Apache Iceberg specification. It allows data engineers to promote the precision of a decimal column to a larger value, provided that the scale of the decimal remains unchanged. This type promotion is completed entirely within the table metadata, requiring no modifications or rewrites to existing physical data files.

### Widening Specification Rules

When defining a column as `decimal(precision, scale)` (often abbreviated as `decimal(P, S)`), the precision (P) represents the total number of digits, and the scale (S) represents the number of digits to the right of the decimal point.

Iceberg permits type widening under the following conditions:

- **Increase Precision**: Promotes `decimal(P, S)` to `decimal(P', S)` where `P' > P`.
- **Constant Scale**: The scale value (S) must remain exactly the same. Modifying the scale is not permitted, as changing the scale alters the underlying storage layout of the decimal bytes in Parquet or Avro, which would corrupt historical data reads.

For example, promoting `decimal(9, 2)` to `decimal(18, 2)` is fully supported, whereas promoting `decimal(9, 2)` to `decimal(9, 4)` is prohibited.

### Metadata-Only Evolution

To widen a decimal column, administrators execute an alteration statement through a query engine:

```sql
/* Promote the amount column precision from 10 to 18 digits */
ALTER TABLE sales.orders ALTER COLUMN amount TYPE decimal(18, 2);
```

When this query runs, Iceberg writes a new metadata JSON file updating the column's type definition. During subsequent read operations, the query engine reads the older values written with lower precision and promotes them in memory to the wider precision at runtime.
