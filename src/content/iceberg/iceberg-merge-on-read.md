---
term: "Merge-on-Read (MoR) in Iceberg"
description: "Merge-on-Read (MoR) is an Iceberg write strategy where UPDATE and DELETE operations write small delete files instead of rewriting data files, enabling fast writes at the cost of applying accumulated deletes during reads, ideal for high-frequency streaming workloads."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-copy-on-write"
  - "iceberg-delete-files"
  - "iceberg-positional-deletes"
  - "iceberg-equality-deletes"
  - "iceberg-compaction"
  - "iceberg-row-level-deletes"
keywords:
  - iceberg merge on read
  - mor iceberg
  - iceberg streaming deletes
  - iceberg write strategy
  - iceberg delete files reads
lastUpdated: 2026-05-14
---

## Merge-on-Read (MoR) in Apache Iceberg

**Merge-on-Read (MoR)** is one of two Iceberg write strategies for `UPDATE`, `DELETE`, and `MERGE INTO` operations. Unlike Copy-on-Write, MoR does **not** rewrite existing data files when rows are deleted or updated. Instead, it writes small **delete files** that record which rows are deleted, and the actual merging of deletes happens at read time.

## How Merge-on-Read Works

Consider a data file `part-001.parquet` with 1,000,000 rows, and a `DELETE` statement that removes 100 rows:

**MoR Behavior:**

1. The engine identifies which rows match the DELETE predicate.
2. It writes a small **positional delete file** (or equality delete file) listing the 100 deleted rows.
3. The new snapshot references both the original data file AND the new delete file.
4. `part-001.parquet` is NOT rewritten — it still contains all 1,000,000 rows.

When a subsequent query reads the table:

1. The engine reads `part-001.parquet`.
2. The engine applies the delete file to filter out the 100 deleted rows.
3. The query sees 999,900 rows.

## When to Use Merge-on-Read

MoR is optimal when:

- **Write throughput is high**: Streaming CDC pipelines, real-time ingestion with corrections.
- **Delete fraction is small**: If each transaction deletes/updates only a tiny fraction of each file, rewriting the full file is wasteful.
- **Write latency is critical**: Writing a delete file takes milliseconds; rewriting a 512MB Parquet file takes seconds.
- **Followed by regular compaction**: MoR write speed + periodic compaction (which converts to CoW-equivalent state) gives the best overall throughput.

## Types of Delete Files in MoR

### Positional Delete Files

Record exact `(file_path, row_position)` pairs. Used when the engine knows the physical location of deleted rows (e.g., Flink streaming with row tracking).

### Equality Delete Files

Record column values identifying deleted rows (e.g., `WHERE id = 12345`). More general but requires a join-like scan during reads.

See [Iceberg Delete Files](/iceberg/iceberg-delete-files/) for the full comparison.

## MoR SQL Configuration

```sql
CREATE TABLE orders (order_id BIGINT, status STRING)
USING iceberg
TBLPROPERTIES (
  'write.delete.mode' = 'merge-on-read',
  'write.update.mode' = 'merge-on-read',
  'write.merge.mode' = 'merge-on-read'
);
```

## Read Performance Degradation Over Time

The key downside of MoR is that **read performance degrades as delete files accumulate**. Each new delete file is another layer the engine must apply during reads:

- 1 delete file: minimal overhead
- 10 delete files: noticeable overhead
- 100 delete files: significant read degradation

This is why **compaction is mandatory** for MoR tables used in production. Compaction reads all delete files, applies them to the data, and writes new clean data files — resetting delete file count to zero.

## V1 vs. V2 MoR Support

MoR (via delete files) requires **Iceberg Spec v2**. Spec v1 only supports Copy-on-Write for DML operations. All modern Iceberg engines default to creating v2 tables.

## Flink and MoR: The Natural Pairing

Apache Flink is the engine most naturally suited to MoR, because:

1. Flink's streaming CDC pipelines produce exactly the right access pattern for MoR: high-frequency, targeted deletes/updates on specific rows.
2. Flink knows the exact position of each row it processes, making positional delete files (the most efficient delete type) the natural output.
3. Flink + Iceberg MoR + periodic Spark compaction is the standard architecture for streaming lakehouses.

## MoR in the Context of Dremio

Dremio's Intelligent Query Engine handles both MoR and CoW tables seamlessly. For tables with pending delete files, Dremio applies deletes efficiently during query execution. Dremio's OPTIMIZE TABLE command can be used to compact MoR tables into clean CoW-equivalent state, and Dremio Cloud supports automatic background optimization to keep MoR tables performant without manual intervention.
