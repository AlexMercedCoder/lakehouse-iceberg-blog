---
term: "Iceberg Spark Procedure expire_snapshots"
description: "A Spark SQL procedure in Apache Iceberg used to remove expired snapshots and physically delete their unreferenced data and delete files."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-expire-snapshots"
  - "iceberg-snapshot-expiration-age"
keywords:
  - expire_snapshots spark
  - iceberg snapshot cleanup
  - spark sql call expire_snapshots
lastUpdated: 2026-05-29
---

## Iceberg Spark Procedure expire_snapshots

The **Iceberg Spark Procedure expire_snapshots** is a maintenance function executed via Spark SQL to purge historical snapshots that are older than a specified retention threshold. When a snapshot is expired, its reference pointer is removed from the table's metadata log, and any data files or delete files that were exclusively associated with the expired snapshot are physically deleted from storage.

### Syntax and Parameters

The procedure provides options to customize the cleanup range. You can target snapshots older than a specific timestamp while maintaining a minimum number of recent snapshots:

```sql
/* Expire snapshots older than May 1st, 2026, while preserving at least 5 snapshots */
CALL prod.system.expire_snapshots(
    table => 'db.web_logs',
    older_than => TIMESTAMP '2026-05-01 00:00:00.000',
    retain_last => 5
);
```

### Operational Importance

Running snapshot expiration periodically is essential to control storage costs and optimize planning speed:

- **Preventing Metadata Bloat**: Pruning old snapshots keeps the `metadata.json` master control file small, reducing the memory footprint during query compilation.
- **Physical File Deletion**: In standard operations, deleting a row only marks it as deleted in a new snapshot. Running `expire_snapshots` is the operation that physically purges the deleted data blocks from the cloud storage bucket.
