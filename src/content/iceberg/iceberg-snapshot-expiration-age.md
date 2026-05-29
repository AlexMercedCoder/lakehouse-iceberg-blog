---
term: "Iceberg Snapshot Expiration Age"
description: "A table configuration property that defines the maximum age of snapshots before they become eligible for deletion during cleanup operations."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-expire-snapshots"
  - "iceberg-orphan-files"
keywords:
  - snapshot expiration age
  - max snapshot age ms
  - table cleanups
lastUpdated: 2026-05-29
---

## Iceberg Snapshot Expiration Age

**Iceberg Snapshot Expiration Age** is a configuration parameter that governs the retention period of historical snapshots in an Apache Iceberg table. Represented by the table property `history.expire.max-snapshot-age-ms`, this setting determines when a snapshot is considered stale and becomes eligible to be deleted by maintenance routines (such as the `expire_snapshots` procedure).

### How Expiration and Cleanup Work

Each commit to an Iceberg table creates a snapshot, preserving previous states for time travel queries and rollbacks. Over time, these files accumulate, increasing metadata file size and storage costs.

To manage this, administrators schedule cleanup tasks. When the snapshot expiration procedure executes, it performs two main tasks:

1.  **Metadata Pruning**: Identifies snapshots older than the expiration threshold and removes their listings from the active `.metadata.json` history.
2.  **Physical File Garbage Collection**: Identifies data, delete, and manifest files that were exclusively referenced by the expired snapshots and deletes them from cloud object storage.

### Configuration Syntax

You configure retention policies using table properties during table creation or modification:

```sql
/* Configure the table to expire snapshots older than 7 days (604,800,000 milliseconds) */
ALTER TABLE sales.orders SET TBLPROPERTIES (
    'history.expire.max-snapshot-age-ms' = '604800000',
    /* Ensure that a minimum of 5 historical snapshots are always preserved */
    'history.expire.min-snapshots-to-keep' = '5'
);
```

### Balancing Retention Against Query Duration

When establishing the snapshot expiration age, administrators must consider query execution times. If a snapshot is expired while a long-running query is actively reading it, the query will fail with file-not-found errors as the underlying data files are physically deleted.

As a best practice, the snapshot expiration age should be set to a value longer than the maximum expected duration of any active analytical queries.
