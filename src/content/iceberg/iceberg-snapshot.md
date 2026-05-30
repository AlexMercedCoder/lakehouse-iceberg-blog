---
term: "Apache Iceberg Snapshot"
description: "An Iceberg snapshot is an immutable, point-in-time view of a table's complete data state, recorded as a manifest list that references all current data files, enabling time travel, ACID reads, and incremental processing."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-manifest-list"
  - "iceberg-manifest-file"
  - "iceberg-metadata-file"
  - "iceberg-time-travel"
  - "iceberg-expire-snapshots"
  - "iceberg-branching-tagging"
keywords:
  - iceberg snapshot
  - apache iceberg snapshot id
  - iceberg table versioning
  - iceberg snapshot history
lastUpdated: 2026-05-14
---

## Apache Iceberg Snapshot

A **snapshot** in Apache Iceberg is an immutable, complete record of a table's data state at a specific point in time. Every write operation that changes table data: an `INSERT`, `DELETE`, `UPDATE`, `MERGE`, or partition overwrite, produces a new snapshot. The snapshot system is the foundation of Iceberg's ACID guarantees, time travel capability, and incremental processing support.

## Anatomy of a Snapshot

A snapshot consists of:

| Field                | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `snapshot-id`        | Unique long integer identifying the snapshot                     |
| `timestamp-ms`       | When the snapshot was committed (epoch milliseconds)             |
| `manifest-list`      | Path to the manifest list file for this snapshot                 |
| `parent-snapshot-id` | ID of the previous snapshot (null for the first)                 |
| `operation`          | Type of operation: `append`, `replace`, `overwrite`, `delete`    |
| `summary`            | Key-value metadata: added files count, added records count, etc. |
| `schema-id`          | The schema version active when this snapshot was written         |

## The Snapshot Chain

Snapshots form a **linear chain** (or tree with branches): each snapshot points to its parent. The current table state is always the "tip" of the chain: the most recently committed snapshot. All prior snapshots remain accessible until expired.

```
Snapshot 1 (initial load)
  └── Snapshot 2 (append batch 1)
        └── Snapshot 3 (delete old records)
              └── Snapshot 4 (append batch 2)  ← current
```

## How Snapshots Are Used

### ACID Reads

When a query begins, it reads the **current snapshot pointer** from the catalog. For the duration of the query, it uses that frozen snapshot: even if new commits land during query execution. This provides snapshot isolation.

### Time Travel

Any historical snapshot can be targeted:

```sql
SELECT * FROM orders AS OF TIMESTAMP '2026-01-15 00:00:00';
SELECT * FROM orders VERSION AS OF 8027658604211071520;
```

### Incremental Processing

The diff between two snapshots (`added_files`, `deleted_files`) drives efficient incremental pipelines:

```python
# Files added between two snapshots
table.inspect.snapshots()  # view all snapshots
```

### Rollback

Rolling back to a previous snapshot is a catalog-only operation: no data is rewritten:

```sql
CALL system.rollback_to_snapshot('db.orders', 8027658604211071520);
```

## Snapshot Operations

Iceberg classifies writes by their `operation` type:

- **`append`**: New data files added; existing files unchanged. Additive writes only.
- **`overwrite`**: Existing files replaced (e.g., partition overwrite, `DELETE`, `UPDATE`). This is the typical result of DML operations.
- **`replace`**: A compaction or rewrite that logically replaces files with rewritten versions. Table data is equivalent, but physical files are new.
- **`delete`**: A snapshot that only deletes files (e.g., from expiring old partitions).

## Snapshot Lifecycle

Snapshots accumulate indefinitely and must be managed explicitly. The **expire snapshots** maintenance procedure removes snapshot entries (and their referenced orphan data files) older than a retention window:

```sql
CALL system.expire_snapshots(
  table => 'db.orders',
  older_than => TIMESTAMP '2026-04-01 00:00:00',
  retain_last => 10  -- always keep at least 10 snapshots
);
```

After expiration, time travel to expired snapshots is no longer possible. Configure retention carefully based on compliance requirements and operational rollback needs.

## Snapshot Metadata Summary

Each snapshot includes a `summary` map with useful operational metrics:

```json
{
  "operation": "append",
  "added-files-size": "1073741824",
  "added-data-files": "12",
  "added-records": "1500000",
  "total-records": "45000000",
  "total-data-files": "180"
}
```

This information is invaluable for monitoring pipeline health and auditing data volumes.

## Snapshots and Branching

Iceberg Spec v2 introduces **branches**: named, independent snapshot chains that diverge from the main chain. Branches enable isolated development, testing ETL logic against real data without affecting production, or running CI/CD pipelines. A branch is simply a named pointer to a snapshot that evolves independently.

See [Table Branching and Tagging](/iceberg/iceberg-branching-tagging/) for details.
