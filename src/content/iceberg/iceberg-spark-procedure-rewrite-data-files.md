---
term: "Iceberg Spark Procedure rewrite_data_files"
description: "A Spark SQL metadata procedure in Apache Iceberg used to consolidate small files and apply sorting or clustering strategies to optimize table layouts."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-bin-packing-compaction"
  - "iceberg-sort-based-compaction"
  - "iceberg-z-order-compaction"
keywords:
  - rewrite_data_files spark
  - iceberg compaction spark
  - spark sql call rewrite_data_files
lastUpdated: 2026-05-29
---

## Iceberg Spark Procedure rewrite_data_files

The **Iceberg Spark Procedure rewrite_data_files** is a maintenance function executed via Spark SQL to perform file compaction. Over time, streaming ingest or frequent updates can write many small files, which degrades query planning and read performance (known as the small file problem). This procedure consolidates small files into optimal target sizes (commonly 512 MB or 1 GB) and optionally sorts or clusters data.

### Syntax and Strategies

The procedure is executed using the Spark SQL `CALL` syntax. It supports several parameters and optimization strategies:

```sql
/* Execute compaction on a table using the binpack strategy */
CALL prod.system.rewrite_data_files(
    table => 'db.web_logs',
    strategy => 'binpack',
    options => map('target-file-size-bytes', '536870912')
);
```

#### Supported Strategies:

- **`binpack`**: The default strategy. It groups small files into larger files without changing the sort order of the rows, providing a fast compaction.
- **`sort`**: Combines files and sorts the records globally by specified columns to speed up range queries:
  ```sql
  CALL prod.system.rewrite_data_files(
      table => 'db.web_logs',
      strategy => 'sort',
      sort_order => 'event_type ASC, created_at DESC'
  );
  ```
- **`zorder`**: Applies Z-Ordering across multiple columns, optimizing multidimensional search queries.

### Performance Tuning

Writers can limit the compaction scope by passing a filter map. This restricts the compaction to specific partitions (e.g. older historical data), leaving active write partitions untouched to minimize write conflicts.
