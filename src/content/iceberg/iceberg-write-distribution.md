---
term: "Iceberg Write Distribution Modes"
description: "Iceberg write distribution modes control how data is distributed across parallel write tasks before being written to output files, with hash and range distribution enabling pre-sorted, well-clustered output that reduces post-write compaction overhead."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-sort-order"
  - "iceberg-clustering"
  - "iceberg-compaction"
  - "iceberg-table-properties"
  - "spark-apache-iceberg"
keywords:
  - iceberg write distribution
  - iceberg hash distribution
  - iceberg range distribution
  - iceberg write mode
  - iceberg distributed write
lastUpdated: 2026-05-14
---

## Iceberg Write Distribution Modes

**Write distribution mode** controls how rows are distributed across parallel write tasks before being written to output Parquet files. The right distribution mode enables write-time clustering, producing well-organized files that require less post-write compaction to achieve good data skipping performance.

Write distribution is controlled by the table property `write.distribution-mode` and can be overridden per-operation.

## Distribution Modes

### `none` (Default)

Each write task writes whatever data it receives in whatever order it arrives. No coordination between tasks, no sorting within tasks.

```sql
ALTER TABLE db.orders SET TBLPROPERTIES ('write.distribution-mode' = 'none');
```

**Result**: Files contain data in arrival order. Column statistics (min/max) per file are wide: poor data skipping. Fast writes, low overhead.

**Use when**: Maximum write throughput is more important than read performance. Compaction will handle clustering post-write.

### `hash`

Before writing, rows are shuffled (hash-partitioned) by the table's partition keys. All rows that belong to the same partition go to the same write task.

```sql
ALTER TABLE db.orders SET TBLPROPERTIES ('write.distribution-mode' = 'hash');
```

**Result**: Each output file contains rows from exactly one partition. Files align perfectly with partition boundaries. Prevents cross-partition data within a single file.

**Use when**: The table is partitioned by a high-cardinality key and you want clean partition-aligned files.

### `range`

Before writing, rows are sorted by the table's sort order and distributed across tasks in sorted ranges. Combined with the sort order, this produces files where each file contains a contiguous, non-overlapping range of sort key values.

```sql
ALTER TABLE db.orders SET TBLPROPERTIES (
    'write.distribution-mode' = 'range',
    'write.sort-order' = 'customer_id ASC NULLS LAST'
);
```

**Result**: Files contain sorted, non-overlapping ranges of `customer_id`. Column statistics are maximally tight. Excellent data skipping without compaction.

**Use when**: You want write-time clustering to minimize the need for post-write compaction. Requires more memory and coordination overhead than `none`.

## Setting Distribution Mode in Spark

```python
# For the current SparkSession (all writes in this session)
spark.conf.set("spark.sql.iceberg.write.distribution-mode", "range")

# For a single INSERT (using SparkWriteConf hints)
spark.sql("""
    INSERT INTO db.orders /*+ RANGE_DISTRIBUTE_BY(customer_id) */
    SELECT * FROM staging.orders
""")
```

## Setting Distribution Mode in Flink

```java
FlinkSink.forRowData(stream)
    .tableLoader(tableLoader)
    .distributionMode(DistributionMode.HASH)  // or RANGE, NONE
    .build();
```

## Distribution Mode and Sort Order: Working Together

Distribution mode and sort order work together to produce well-clustered files:

| Distribution | Sort Order        | Result                                                             |
| ------------ | ----------------- | ------------------------------------------------------------------ |
| `none`       | none              | Random order files                                                 |
| `none`       | `customer_id ASC` | Each task sorts independently: sort within task, not globally     |
| `hash`       | none              | Partition-aligned files, random within partition                   |
| `hash`       | `customer_id ASC` | Partition-aligned + sorted within partition                        |
| `range`      | `customer_id ASC` | Globally sorted, non-overlapping ranges per file ← best clustering |
| `range`      | `zorder(a, b)`    | Z-order distributed globally ← best multi-column clustering        |

## Performance Considerations

**`range` distribution overhead**:

- Requires a two-pass approach: first sample the data to determine range boundaries, then distribute and write.
- Increases write latency vs. `none` (often 20-50% slower writes).
- Reduces compaction frequency needed (saves long-term compute cost).

**When the write-time cost is worth it**:

- Read-heavy tables (many queries per write cycle).
- Tables served to BI dashboards or AI agents where query latency matters.
- Large batch loads where the one-time write overhead is amortized over many reads.

**When `none` + periodic compaction is better**:

- Streaming tables with continuous small appends (compaction handles clustering).
- Write-heavy tables where write throughput is the priority.
- Early-stage tables where access patterns are not yet known.

## Verifying Clustering After Write

```sql
-- Check column statistics tightness after a range-distributed write
SELECT
    file_path,
    lower_bounds['customer_id'] as min_cust,
    upper_bounds['customer_id'] as max_cust,
    (CAST(upper_bounds['customer_id'] AS BIGINT) -
     CAST(lower_bounds['customer_id'] AS BIGINT)) as range_width
FROM db.orders.files
ORDER BY min_cust;
```

For range-distributed writes, each file should show a narrow, non-overlapping range of `min_cust` to `max_cust`. Wide, overlapping ranges indicate the distribution didn't produce well-clustered files.
