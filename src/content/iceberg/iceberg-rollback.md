---
term: "Iceberg Table Rollback"
description: "Rolling back an Apache Iceberg table reverts its current state to a prior snapshot, effectively undoing all writes since that snapshot in a metadata-only operation with no data rewriting, providing instant disaster recovery for bad ETL runs or data corruption events."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-time-travel"
  - "iceberg-branching-tagging"
  - "iceberg-expire-snapshots"
  - "iceberg-acid-transactions"
keywords:
  - iceberg rollback
  - iceberg revert snapshot
  - iceberg undo write
  - iceberg disaster recovery
  - iceberg bad data rollback
lastUpdated: 2026-05-14
---

## Iceberg Table Rollback

**Rolling back an Apache Iceberg table** reverts the table's current snapshot pointer to a previous snapshot, instantly undoing all writes committed since that point. Because Iceberg uses immutable snapshots, a rollback is a **metadata-only operation**: no data files are moved, deleted, or rewritten. The rollback completes in milliseconds regardless of table size.

This is one of Iceberg's most powerful operational capabilities: the ability to instantly undo any bad write: a corrupted ETL run, an accidentally-dropped partition, a bad `UPDATE` that modified the wrong rows, without any data recovery tools or backup restoration.

## When to Use Rollback

- A batch ETL job loaded corrupted data into a production table.
- An incorrect `DELETE` statement removed the wrong rows.
- A code bug caused incorrect transformations to be applied to a table.
- A schema migration went wrong and needs to be undone.
- A `MERGE INTO` applied incorrect business logic.

## Rolling Back to a Specific Snapshot

### Apache Spark

```sql
-- Step 1: Find the target snapshot (before the bad write)
SELECT snapshot_id, committed_at, operation, summary
FROM db.orders.snapshots
ORDER BY committed_at DESC;

-- Identify the last good snapshot ID (e.g., 8027658604211071520)

-- Step 2: Roll back to that snapshot
CALL system.rollback_to_snapshot('db.orders', 8027658604211071520);

-- Or roll back to a timestamp (last known-good time)
CALL system.rollback_to_timestamp('db.orders', TIMESTAMP '2026-05-14 10:00:00');
```

After the rollback:

- The table's `current-snapshot-id` in metadata points to the target snapshot.
- All subsequent reads see the table state as of that snapshot.
- The bad snapshots (post-rollback) are still in the snapshot history but are not reachable from the main branch.

### PyIceberg

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog("my_catalog", **{...})
table = catalog.load_table("db.orders")

# Roll back to a specific snapshot
table.manage_snapshots() \
    .rollback_to_snapshot(snapshot_id=8027658604211071520) \
    .commit()

# Or roll back to a timestamp
from datetime import datetime
target_time = int(datetime(2026, 5, 14, 10, 0, 0).timestamp() * 1000)
table.manage_snapshots() \
    .rollback_to_timestamp(target_time) \
    .commit()
```

## Rollback vs. Time Travel Query

These are distinct operations:

| Operation         | What It Does                                                | Affects Production? |
| ----------------- | ----------------------------------------------------------- | ------------------- |
| Time travel query | Read old data without changing current state                | No                  |
| Rollback          | Change the current snapshot pointer (sets table state back) | Yes                 |

Time travel is for **reading** historical data. Rollback is for **restoring** the table to a past state for all subsequent operations.

## Identifying the Rollback Target

```sql
-- View full snapshot history with timestamps and operations
SELECT
    snapshot_id,
    committed_at,
    operation,
    summary['added-records'] as records_added,
    summary['deleted-records'] as records_deleted,
    summary['changed-partition-count'] as partitions_affected
FROM db.orders.snapshots
ORDER BY committed_at DESC;
```

Look for:

- The last snapshot before the bad write (where `committed_at` is just before the problematic time).
- The snapshot with `operation = 'append'` or `'overwrite'` that introduced the bad data: roll back to the one immediately before it.

## Rollback and Snapshot Expiration

After a rollback, the "rolled-back" snapshots (the bad ones) still exist in the snapshot history but are not reachable from the current branch. When you run `expire_snapshots`, these orphaned snapshots can be safely expired:

```sql
-- After rollback, clean up the bad snapshots
CALL system.expire_snapshots(
  table => 'db.orders',
  older_than => TIMESTAMP '2026-05-14 10:05:00',  -- just after the bad write
  retain_last => 5
);
```

## Rollback vs. Branching for Recovery

For **planned** quality workflows, use [Iceberg Branching](/iceberg/iceberg-branching-tagging/) (WAP pattern) to prevent bad data from reaching production in the first place.

For **unplanned** production incidents (bad data already committed to main), use rollback to immediately restore the table to its last known-good state while you debug the root cause.

## Zero-Downtime Rollback

Because Iceberg reads and writes are atomic and snapshot-based, a rollback does not require any downtime:

- Ongoing queries reading the current (bad) snapshot complete normally.
- After the rollback commit, new queries automatically read from the restored snapshot.
- No query interruption, no reader consistency issues, no table locking.

This is fundamentally different from traditional database rollback operations, which require exclusive locks and can interrupt active connections.
