---
term: "Row-Level Deletes in Apache Iceberg"
description: "Row-level deletes in Apache Iceberg enable precise removal or modification of individual rows within existing data files through two mechanisms—positional deletes and equality deletes—without rewriting entire Parquet files, introduced in Iceberg Spec v2."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-delete-files"
  - "iceberg-merge-on-read"
  - "iceberg-copy-on-write"
  - "iceberg-upsert"
  - "iceberg-positional-deletes"
  - "iceberg-equality-deletes"
keywords:
  - iceberg row level deletes
  - iceberg delete statement
  - iceberg gdpr delete
  - iceberg cdc deletes
  - iceberg v2 row deletes
lastUpdated: 2026-05-14
---

## Row-Level Deletes in Apache Iceberg

**Row-level deletes** in Apache Iceberg enable the precise removal of individual rows from a table without requiring a full rewrite of the containing data file. Introduced in Apache Iceberg Spec v2, row-level deletes are one of the most practically important features for production lakehouses that must handle:

- **GDPR right-to-erasure**: Delete all records containing a specific user's personal data.
- **CDC (Change Data Capture)**: Apply streaming delete records from upstream operational databases.
- **Data corrections**: Remove erroneous records identified after ingestion.
- **SCD (Slowly Changing Dimensions)**: Update dimension records with current values.

## Before Row-Level Deletes: The Hive Problem

Before Iceberg Spec v2, handling row-level deletes in a data lake was extremely painful:

1. **Read the entire partition** containing the rows to be deleted.
2. **Filter out** the deleted rows in memory.
3. **Rewrite the entire partition** without those rows.
4. **Swap** the old partition with the new one.

For a single-row GDPR deletion in a 1TB partition, this requires reading and writing 1TB of data. For compliance workloads with thousands of users requesting deletion, this becomes operationally impossible.

## Iceberg's Solution: Delete Files

Iceberg Spec v2 introduces **delete files** — small metadata files that record which rows should be excluded during reads — without touching the original data files at all.

Two types of delete files implement row-level deletes:

### Positional Delete Files

Record the exact file path and row position of deleted rows. The query engine reads the data file and skips rows whose positions appear in the applicable positional delete files.

```
DELETE FROM orders WHERE order_id = 12345;
-- Iceberg writes a positional delete file:
-- s3://bucket/data/part-001.parquet, row_position: 42
```

Positional deletes are the most efficient type — the engine knows exactly which row to skip, with no value comparison required.

### Equality Delete Files

Record the column values of deleted rows. The engine filters out any row whose column values match an equality delete entry.

```
DELETE FROM users WHERE user_id = 99876;
-- Iceberg writes an equality delete file:
-- {user_id: 99876}
```

Equality deletes are more flexible (no need to know physical row position) but require value comparison for every row scanned.

## Row-Level UPDATE via Deletes

`UPDATE` statements in Iceberg (in Merge-on-Read mode) are implemented as a delete + insert:

1. Write a delete file identifying the old row version.
2. Write a new data file (or append) with the updated row.

```sql
UPDATE orders SET status = 'cancelled' WHERE order_id = 12345;
-- Internally: delete old row + insert updated row
```

## MERGE INTO (Upsert)

`MERGE INTO` combines inserts, updates, and deletes in a single operation:

```sql
MERGE INTO orders AS target
USING updates AS source
ON target.order_id = source.order_id
WHEN MATCHED AND source.action = 'delete' THEN DELETE
WHEN MATCHED THEN UPDATE SET status = source.status
WHEN NOT MATCHED THEN INSERT VALUES (source.*);
```

In Merge-on-Read mode, matches produce delete files + new data files. In Copy-on-Write mode, all affected data files are rewritten.

## GDPR Compliance with Row-Level Deletes

The GDPR right-to-erasure use case is one of the most compelling for row-level deletes:

```sql
-- Delete all records for a specific user across multiple tables
DELETE FROM users WHERE user_id = 12345;
DELETE FROM orders WHERE customer_id = 12345;
DELETE FROM events WHERE user_id = 12345;
DELETE FROM activity_log WHERE user_id = 12345;
```

With equality delete files, these operations complete in seconds. Without row-level deletes, each would require a full partition rewrite.

After deletion, **schedule compaction** to physically remove the deleted row data from storage (fulfilling the "erasure" requirement in full):

```sql
CALL system.rewrite_data_files('db.users');
```

## Performance Considerations

Row-level deletes in Merge-on-Read mode degrade read performance as delete files accumulate. For read-heavy tables, regular compaction is essential to convert accumulated delete files into clean data files.

For compliance workloads (GDPR erasure), the workflow is:

1. Write equality delete files immediately (fast, fulfills the logical deletion requirement).
2. Schedule compaction to physically erase the data (fulfills the physical erasure requirement, required for true GDPR compliance).
