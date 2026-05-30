---
term: "Iceberg Upsert (MERGE INTO)"
description: "Iceberg upsert operations using MERGE INTO enable atomic insert-or-update workflows against Iceberg tables, implementing the full SCD Type 1 and CDC apply pattern via row-level delete + insert semantics across Copy-on-Write and Merge-on-Read strategies."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-row-level-deletes"
  - "iceberg-merge-on-read"
  - "iceberg-copy-on-write"
  - "iceberg-cdc"
  - "flink-apache-iceberg"
  - "spark-apache-iceberg"
keywords:
  - iceberg upsert
  - iceberg merge into
  - iceberg cdc upsert
  - iceberg scd
  - iceberg insert update
lastUpdated: 2026-05-14
---

## Iceberg Upsert (MERGE INTO)

**Upsert** (update-or-insert) is a critical data operation for lakehouses: if a record with a given key already exists, update it; if it doesn't exist, insert it. Iceberg implements upserts via the `MERGE INTO` SQL statement: a standard ANSI SQL construct that atomically applies a combination of inserts, updates, and deletes from a source dataset to a target Iceberg table.

## Why Upserts Matter

Upserts are the fundamental operation for:

- **CDC (Change Data Capture)**: Applying database change events (INSERT/UPDATE/DELETE) to lakehouse tables.
- **SCD Type 1**: Overwriting dimension records with current values (no history kept).
- **Deduplication**: Ensuring a record exists only once regardless of how many times it was received in an event stream.
- **Late-arriving data corrections**: Updating records that arrived in the wrong state and were subsequently corrected.
- **Operational database mirroring**: Keeping lakehouse copies of OLTP tables in sync.

## MERGE INTO SQL Syntax

### Full MERGE INTO (Insert + Update + Delete)

```sql
MERGE INTO db.orders AS target
USING staging.order_updates AS source
ON target.order_id = source.order_id
WHEN MATCHED AND source.action = 'delete' THEN DELETE
WHEN MATCHED AND source.action = 'update' THEN
    UPDATE SET
        status = source.status,
        total = source.total,
        updated_at = source.updated_at
WHEN NOT MATCHED AND source.action != 'delete' THEN
    INSERT (order_id, customer_id, total, status, created_at, updated_at)
    VALUES (source.order_id, source.customer_id, source.total,
            source.status, source.created_at, source.updated_at);
```

### Insert-or-Update Only (Common Upsert)

```sql
MERGE INTO db.customers AS target
USING updated_customers AS source
ON target.customer_id = source.customer_id
WHEN MATCHED THEN
    UPDATE SET name = source.name, email = source.email
WHEN NOT MATCHED THEN
    INSERT (customer_id, name, email) VALUES (source.customer_id, source.name, source.email);
```

## MERGE INTO Execution Modes

### Copy-on-Write Mode

Iceberg rewrites entire data files that contain matched rows. Produces clean data files with no pending deletes. Preferred for:

- Low-frequency batch upserts
- Read-heavy tables served to BI tools

### Merge-on-Read Mode

Iceberg writes delete files for old row versions and new data files for updated/inserted rows. No data file rewriting. Preferred for:

- High-frequency streaming upserts
- CDC pipelines

```sql
-- Control merge mode per table
ALTER TABLE db.orders SET TBLPROPERTIES ('write.merge.mode' = 'merge-on-read');
```

## CDC Apply Pattern with MERGE INTO

The most common production upsert pattern is CDC application:

```python
# Flink: continuous CDC upsert stream
# (Flink handles this natively with upsert=True in FlinkSink)

# Spark: batch CDC apply (e.g., hourly micro-batch from Kafka)
spark.sql("""
    MERGE INTO db.orders AS target
    USING (
        SELECT
            order_id,
            customer_id,
            total,
            status,
            op_type  -- 'I', 'U', 'D' from CDC event
        FROM kafka_cdc_batch
        WHERE batch_time >= '2026-05-14 10:00:00'
    ) AS source
    ON target.order_id = source.order_id
    WHEN MATCHED AND source.op_type = 'D' THEN DELETE
    WHEN MATCHED AND source.op_type IN ('I', 'U') THEN
        UPDATE SET status = source.status, total = source.total
    WHEN NOT MATCHED AND source.op_type != 'D' THEN
        INSERT *
""")
```

## Upsert Performance Considerations

MERGE INTO performance depends heavily on:

1. **Join key cardinality**: MERGE requires a join between source and target on the match condition. High-cardinality keys (UUIDs, order IDs) perform well; low-cardinality keys create skew.

2. **Target table size**: Larger tables have more data files to evaluate for matches.

3. **Partitioning**: If the match key aligns with the partition scheme, Iceberg can limit the MERGE scan to only relevant partitions.

4. **Write mode (CoW vs. MoR)**: MoR MERGE is much faster for high-frequency small updates; CoW MERGE is faster for subsequent reads.

## MERGE INTO vs. Alternative Patterns

| Pattern                  | When to Use                               |
| ------------------------ | ----------------------------------------- |
| MERGE INTO               | Full upsert/delete, CDC apply, SCD Type 1 |
| INSERT OVERWRITE         | Replace entire partition (batch ETL)      |
| Streaming upsert (Flink) | Continuous CDC with low latency           |
| DELETE + INSERT          | Simple programmatic upsert without SQL    |

For most CDC and upsert use cases, `MERGE INTO` is the cleanest and most expressive approach. For streaming CDC at high throughput, Flink's native upsert sink is more efficient than batch `MERGE INTO` operations.
