---
term: "Iceberg Rollback Snapshot Procedures"
description: "SQL procedures used to revert the active state of an Apache Iceberg table to a specific snapshot ID or historical timestamp."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-spark-procedure-expire-snapshots"
keywords:
  - rollback snapshot
  - rollback table
  - rollback_to_snapshot
  - rollback_to_timestamp
lastUpdated: 2026-05-29
---

## Iceberg Rollback Snapshot Procedures

**Iceberg Rollback Snapshot Procedures** are specialized SQL commands that change the active pointer of an Apache Iceberg table to a previous state. If an ingestion pipeline writes bad data or an accidental delete occurs, developers can execute a rollback. This operation instantly restores the table to its previous state without copying or rewriting files, making it a key component of disaster recovery in data lakehouses.

### Rollback Syntax

In Apache Spark, rollbacks are performed via two system procedures: `rollback_to_snapshot` and `rollback_to_timestamp`.

#### Rolling Back to a Specific Snapshot ID

If the target snapshot ID is known (obtained from the `.snapshots` metadata table), you can revert the table directly:

```sql
/* Roll back the table to the specified snapshot ID */
CALL prod.system.rollback_to_snapshot(
    table => 'db.orders',
    snapshot_id => 4589201938502394812
);
```

#### Rolling Back to a Specific Point in Time

If the snapshot ID is unknown, you can specify a timestamp. The catalog automatically resolves this to the closest snapshot that occurred at or before that moment:

```sql
/* Roll back the table to its state on May 28, 2026 */
CALL prod.system.rollback_to_timestamp(
    table => 'db.orders',
    timestamp => TIMESTAMP '2026-05-28 12:00:00.000'
);
```

### Commit Behavior and Safety

Rolling back a table is a metadata-only operation. The catalog coordinator updates the table's current snapshot pointer to the target historical snapshot and commits this change to create a new version of the metadata.

Because the physical data files of the rolled-back snapshots are still tracked in the manifest files, they remain safe. However, running a snapshot expiration procedure (like `expire_snapshots`) after a rollback will permanently prune the abandoned snapshots and their associated physical data files from storage.
