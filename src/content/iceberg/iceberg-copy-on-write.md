---
term: "Copy-on-Write (CoW) in Iceberg"
description: "Copy-on-Write (CoW) is an Iceberg write mode where UPDATE and DELETE operations rewrite entire affected data files to produce new, clean files without any pending deletes, optimizing read performance at the cost of higher write amplification."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-merge-on-read"
  - "iceberg-delete-files"
  - "iceberg-row-level-deletes"
  - "iceberg-compaction"
  - "iceberg-upsert"
keywords:
  - iceberg copy on write
  - cow iceberg
  - iceberg write mode
  - iceberg update delete strategy
  - iceberg rewrite on update
lastUpdated: 2026-05-14
---

## Copy-on-Write (CoW) in Apache Iceberg

**Copy-on-Write (CoW)** is one of two write strategies Iceberg supports for `UPDATE`, `DELETE`, and `MERGE INTO` operations. In CoW mode, when rows in an existing data file need to be updated or deleted, Iceberg **rewrites the entire affected data file**, producing a new, clean file that contains only the surviving rows, without any pending delete files.

## How Copy-on-Write Works

Consider a data file `part-001.parquet` with 1,000,000 rows, and a `DELETE` statement that removes 100 rows:

**CoW Behavior:**

1. The engine reads all 1,000,000 rows from `part-001.parquet`.
2. It filters out the 100 rows matching the DELETE predicate.
3. It writes a new file `part-001-new.parquet` with 999,900 rows.
4. The new snapshot replaces the old file reference with the new file reference.
5. `part-001.parquet` becomes an orphan, cleaned up by snapshot expiration.

The result: zero delete files in the new snapshot. All data is in clean Parquet files.

## When to Use Copy-on-Write

CoW is optimal when:

- **Reads vastly outnumber writes**: Since reads never need to apply delete files, CoW produces maximum read performance.
- **Write frequency is low**: Rewriting entire files is expensive; CoW makes sense when updates/deletes happen in large batches rather than continuously.
- **Compliance requires clean reads**: Some use cases require that data files be "clean" (no delete file application). CoW guarantees this.
- **BI dashboards and reporting**: For tables serving high-concurrency analytics workloads, CoW's read efficiency is worth the write cost.

## Write Amplification

The cost of CoW is **write amplification**. Updating 1 row in a 512MB Parquet file requires rewriting all 512MB. For use cases with:

- Frequent targeted updates (CDC, GDPR deletions)
- High write throughput (streaming ingestion with corrections)
- Small delete fractions per file

...CoW write amplification becomes prohibitive. In these cases, [Merge-on-Read](/iceberg/iceberg-merge-on-read/) is more appropriate.

## Copy-on-Write SQL Configuration

In Apache Spark:

```sql
-- Create a table with CoW as the default write mode
CREATE TABLE orders (order_id BIGINT, status STRING)
USING iceberg
TBLPROPERTIES (
  'write.delete.mode' = 'copy-on-write',
  'write.update.mode' = 'copy-on-write',
  'write.merge.mode' = 'copy-on-write'
);
```

## CoW vs. MoR: Decision Framework

| Scenario                         | Recommended Strategy         |
| -------------------------------- | ---------------------------- |
| High read / low write ratio      | Copy-on-Write                |
| Streaming deletes (CDC)          | Merge-on-Read                |
| Batch corrections (nightly)      | Copy-on-Write                |
| GDPR erasure (frequent targeted) | Merge-on-Read → then compact |
| BI-serving table                 | Copy-on-Write                |
| Event log with corrections       | Merge-on-Read                |

Many production architectures use **mixed strategies**: CoW for final serving tables (optimized for read), MoR for staging/ingestion tables (optimized for write throughput), and a scheduled compaction job that converts MoR tables to CoW-equivalent clean state.

## CoW and Compaction

Even for MoR tables, **compaction** produces CoW-equivalent results. The compaction job reads all data files, applies all pending delete files, and writes new clean data files: equivalent to what CoW would have produced if used from the beginning. This is why some teams use MoR for writes and schedule regular compaction to maintain CoW-like read performance.
