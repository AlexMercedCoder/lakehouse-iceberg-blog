---
term: "Iceberg Orphan Files"
description: "Orphan files in Apache Iceberg are data files written to object storage during failed transactions that were never committed to a snapshot, accumulating silently over time and requiring periodic cleanup via the remove_orphan_files maintenance procedure."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-data-files"
  - "iceberg-snapshot"
  - "iceberg-expire-snapshots"
  - "iceberg-compaction"
  - "iceberg-table-format"
keywords:
  - iceberg orphan files
  - iceberg dangling files
  - iceberg cleanup
  - iceberg storage optimization
  - iceberg remove orphan files
lastUpdated: 2026-05-14
---

## Iceberg Orphan Files

**Orphan files** are data files (Parquet, ORC, or Avro files) that were written to object storage during an Iceberg write transaction but were never successfully committed to a snapshot. Because Iceberg data files are written before the metadata commit, a failed transaction (job crash, write error, network failure after file creation) leaves behind data files that are invisible to any snapshot and will never be read by any query.

Over time, orphan files accumulate silently in object storage: consuming storage space and increasing storage costs, until the `remove_orphan_files` maintenance procedure is run.

## How Orphan Files Form

The Iceberg write protocol:

1. Write new data files to object storage ← **If the process fails here**, the files become orphans.
2. Create manifest files referencing the new data files.
3. Create a new snapshot referencing the new manifests.
4. Atomically commit the new snapshot to the catalog.

If the process fails at step 1 or 2, the data files exist in object storage but have never been referenced by a snapshot. No query will ever read them. They are orphans.

Common causes:

- Spark executor OOM between writing files and committing the snapshot
- Flink job failure before checkpoint completion
- Network timeout during the catalog commit call
- Manual interruption of a long-running write job

## Orphan Files vs. Expired Snapshot Files

These are distinct categories that require different cleanup operations:

| Category               | What They Are                              | Cleanup Mechanism     |
| ---------------------- | ------------------------------------------ | --------------------- |
| Orphan files           | Files not referenced by ANY snapshot       | `remove_orphan_files` |
| Expired snapshot files | Files referenced only by expired snapshots | `expire_snapshots`    |

`expire_snapshots` does NOT remove orphan files. Both operations are required for complete storage cleanup.

## Removing Orphan Files

The `remove_orphan_files` procedure scans the table's storage location, lists all files, compares them against the files referenced in all current snapshots (via manifests), and deletes any files that are not referenced.

### Apache Spark

```sql
-- Remove orphan files older than 72 hours (safety buffer)
CALL system.remove_orphan_files(
  table => 'db.orders',
  older_than => TIMESTAMP '2026-05-11 00:00:00'
);

-- With explicit location (if table has multiple locations)
CALL system.remove_orphan_files(
  table => 'db.orders',
  location => 's3://bucket/warehouse/db/orders'
);

-- Dry run: see what would be deleted without deleting
CALL system.remove_orphan_files(
  table => 'db.orders',
  dry_run => true
);
```

### PyIceberg

```python
from pyiceberg.catalog import load_catalog
from datetime import datetime, timedelta

catalog = load_catalog("my_catalog", **{...})
table = catalog.load_table("db.orders")

# Remove orphan files older than 72 hours
cutoff = datetime.now() - timedelta(hours=72)
table.remove_orphan_files(cutoff)
```

## The Safety Buffer: Why `older_than` Matters

The `older_than` parameter is critical and should always be set to at least **24–48 hours before the current time**. This safety buffer prevents deleting files that are part of an **in-progress write transaction**.

Consider this scenario:

1. A Spark job starts writing files to S3.
2. You run `remove_orphan_files` immediately.
3. The orphan file cleanup deletes the newly-written files (which haven't been committed yet).
4. The Spark job's commit fails because the files it wrote are now gone.

The safety buffer ensures that any file being written right now is safe: only files older than the buffer are candidates for removal.

**Recommended**: Set `older_than` to at least `now - 72 hours` in production.

## Monitoring Orphan File Accumulation

There's no built-in Iceberg metric for orphan file count, but you can estimate accumulation by:

1. Listing all files in the table's storage location.
2. Listing all files referenced in current manifests (`SELECT * FROM db.orders.files`).
3. Comparing the two lists.

For automated monitoring, schedule a regular `remove_orphan_files` with `dry_run = true` and alert if the count exceeds a threshold.

## Recommended Maintenance Schedule

| Operation                         | Frequency                               |
| --------------------------------- | --------------------------------------- |
| `expire_snapshots`                | Weekly (or per retention policy)        |
| `remove_orphan_files`             | Weekly (after expire_snapshots)         |
| `rewrite_data_files` (compaction) | Daily to weekly (based on write volume) |
| `rewrite_manifests`               | Monthly or after major compaction       |

Running `remove_orphan_files` after `expire_snapshots` ensures maximum cleanup: first remove expired snapshots (making their exclusive files eligible for orphan removal), then remove all unreferenced files.
