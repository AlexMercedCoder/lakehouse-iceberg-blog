---
term: "Iceberg Truncate Partition Transform"
description: "An Iceberg partition transform that truncates string values to a specific width or groups numeric values into fixed-size ranges."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-hidden-partitioning"
  - "iceberg-identity-partition-transform"
  - "iceberg-bucket-partition-transform"
keywords:
  - iceberg truncate partition
  - truncate transform
  - partition string prefix
lastUpdated: 2026-05-29
---

## Iceberg Truncate Partition Transform

The **Iceberg Truncate Partition Transform** partitions data by grouping similar values into broad buckets using truncation rules. For string columns, it truncates text to a specified prefix length. For numeric columns (integers, longs, decimals), it divides and rounds values into fixed-size intervals. This transform reduces partition cardinality while ensuring related data remains co-located.

By grouping keys into wider partition buckets, this strategy prevents the "small file problem" associated with high-cardinality partitions while still allowing engines to skip files during query scans.

### Syntax and Behavior

The transform is specified using the syntax `truncate(width, column)`:

```sql
/* Partition the log table by a 4-character prefix of the message and ranges of 100 on code */
CREATE TABLE systems.events (
    event_id bigint,
    error_code int,
    message string
)
USING iceberg
PARTITIONED BY (truncate(4, message), truncate(100, error_code));
```

#### Behavior by Data Type:

- **Strings**: Truncates the text to the specified number of characters. For example, `truncate(4, message)` maps `"application_error"` to `"appl"` and `"app_crash"` to `"app_"`.
- **Integers/Longs**: Grouped into ranges of the specified width. For example, `truncate(10, error_code)` maps values `0` through `9` to partition `0`, and values `10` through `19` to partition `10`.
- **Decimals**: Scales values to the specified width. For example, `truncate(10, price)` groups prices in intervals of `10.00`.

### Query Optimization

When a user filters on a column that has been partitioned using a truncate transform, the query engine automatically translates the filter predicate to match the partition layout:

```sql
/* The planner automatically scans only the 'appl' partition folder */
SELECT * FROM systems.events WHERE message = 'application_error';
```

Because the transformation is tracked inside the table's metadata, query engines handle this translation transparently, requiring no manual partition clauses from developers or analytical users.
