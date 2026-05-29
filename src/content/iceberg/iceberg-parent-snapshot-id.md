---
term: "Iceberg Parent Snapshot ID"
description: "A reference property stored in snapshot metadata that links a snapshot to its immediate ancestor, establishing the table's historical lineage."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-time-travel"
  - "iceberg-rollback"
keywords:
  - parent snapshot id
  - snapshot lineage
  - iceberg snapshot history
lastUpdated: 2026-05-29
---

## Iceberg Parent Snapshot ID

The **Iceberg Parent Snapshot ID** is a metadata reference property stored inside each snapshot definition within the table's master `metadata.json` file. By pointing to the unique identifier of the snapshot that immediately preceded it, the `parent-snapshot-id` establishes a chronological, linked lineage of table states. This parent-child relationship allows query engines to traverse the table's history for time travel, incremental reading, and transaction rollback operations.

### History Trees and Lineage

Each write operation in Iceberg generates a new snapshot with its own unique `snapshot-id`. The metadata links these snapshots sequentially:

- **Root Snapshot**: The first snapshot committed to a table has a `parent-snapshot-id` value of `null`, indicating the base state.
- **Subsequent Snapshots**: Each new commit records the ID of the snapshot that was current at the start of the transaction as its parent.
- **Branching**: In advanced workflows (such as Write-Audit-Publish), a table can have multiple child snapshots branching from a single parent snapshot, forming a historical tree rather than a simple flat line.

### Metadata Representation

The following excerpt from an Iceberg table metadata file illustrates how the parent reference links snapshots:

```json
{
  "snapshots": [
    {
      "snapshot-id": 100000000000001,
      "timestamp-ms": 1716982400000,
      "summary": { "operation": "append" }
      /* parent-snapshot-id is omitted or null for the initial snapshot */
    },
    {
      "snapshot-id": 100000000000002,
      "parent-snapshot-id": 100000000000001,
      "timestamp-ms": 1716982460000,
      "summary": { "operation": "overwrite" }
    }
  ]
}
```

### Time Travel and Rollbacks

Query engines rely on these parent pointers to trace the table's state backward in time. For example, when executing a time travel query to look at data from a specific timestamp, the query engine reads the metadata log, finds the active snapshot at that time, and uses the chain of parent IDs to reconstruct the exact set of manifest files that made up the table state during that historical transaction.
