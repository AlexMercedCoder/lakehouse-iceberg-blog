---
term: "Iceberg Snapshot References"
description: "Iceberg snapshot references are named pointers (branches and tags) stored in the table metadata that reference specific snapshots by ID, forming the foundation for Iceberg's branching and tagging system and enabling concurrent development branches and immutable historical markers."
category: "Core Concepts"
relatedTerms:
  - "iceberg-branching-tagging"
  - "iceberg-snapshot"
  - "iceberg-wap-pattern"
  - "iceberg-rollback"
  - "project-nessie"
keywords:
  - iceberg snapshot references
  - iceberg named references
  - iceberg branch ref
  - iceberg tag ref
  - iceberg ref metadata
lastUpdated: 2026-05-14
---

## Iceberg Snapshot References

**Snapshot references** are the formal Iceberg metadata construct that enables branches and tags. A snapshot reference is a named pointer to a specific snapshot ID, stored in the table metadata alongside configuration for retention and staleness behavior. All of Iceberg's branching and tagging functionality is built on snapshot references.

## The refs Section in Table Metadata

Every Iceberg table has a `refs` object in its metadata JSON that maps reference names to snapshot IDs:

```json
{
  "current-snapshot-id": 8027658604211071520,
  "refs": {
    "main": {
      "snapshot-id": 8027658604211071520,
      "type": "branch",
      "min-snapshots-to-keep": 10,
      "max-snapshot-age-ms": 604800000
    },
    "staging": {
      "snapshot-id": 7935847293847561234,
      "type": "branch",
      "min-snapshots-to-keep": 3,
      "max-snapshot-age-ms": 86400000
    },
    "v2.0-release": {
      "snapshot-id": 6891234567890123456,
      "type": "tag",
      "max-ref-age-ms": 31536000000
    }
  }
}
```

## Branch References

A **branch reference** points to the latest snapshot on a line of development. When new writes occur on a branch, the reference is updated to point to the new snapshot.

### Branch Properties

| Property                | Description                                                       | Default          |
| ----------------------- | ----------------------------------------------------------------- | ---------------- |
| `type`                  | Always `"branch"` for branches                                    | —                |
| `min-snapshots-to-keep` | Minimum snapshot count to retain on this branch                   | 1                |
| `max-snapshot-age-ms`   | Maximum age of snapshots retained on this branch                  | Retention policy |
| `max-ref-age-ms`        | Maximum age of this reference itself (auto-delete stale branches) | —                |

The `main` branch always exists and cannot be deleted. Other branches can be auto-expired via `max-ref-age-ms`.

### Branch Lifecycle

```sql
-- Create branch
ALTER TABLE db.orders CREATE BRANCH staging RETAIN 3 SNAPSHOTS;

-- Write to branch (Spark)
spark.conf.set("spark.wap.branch", "staging")
spark.sql("INSERT INTO db.orders VALUES ...")

-- Read from branch
spark.conf.set("spark.wap.branch", "staging")
spark.sql("SELECT * FROM db.orders")

-- Fast-forward (merge branch to main by moving the main pointer)
CALL system.fast_forward('db.orders', 'main', 'staging');

-- Drop branch (doesn't delete data — only the reference)
ALTER TABLE db.orders DROP BRANCH staging;
```

## Tag References

A **tag reference** points to a specific snapshot and is **immutable** — the snapshot it references cannot change. Tags are used for marking specific states (data version releases, compliance checkpoints, model training datasets).

### Tag Properties

| Property         | Description                                 |
| ---------------- | ------------------------------------------- |
| `type`           | Always `"tag"` for tags                     |
| `max-ref-age-ms` | Maximum age before this tag is auto-expired |

Tags do not have `min-snapshots-to-keep` — they reference a single fixed snapshot.

### Tag Lifecycle

```sql
-- Create a tag on the current snapshot
ALTER TABLE db.orders CREATE TAG `v2-release`;

-- Create a tag on a specific snapshot (historical tagging)
ALTER TABLE db.orders CREATE TAG `2026-q1-final`
AS OF VERSION 8027658604211071520;

-- Read from a tag
spark.conf.set("spark.wap.branch", "2026-q1-final")
spark.sql("SELECT * FROM db.orders")  -- reads the tagged snapshot

-- Drop a tag
ALTER TABLE db.orders DROP TAG `v2-release`;
```

## The main Branch

The `main` branch is special:

- It always exists — cannot be dropped.
- It is the default branch: reads and writes without explicit branch selection use `main`.
- Its `snapshot-id` is always the same as `current-snapshot-id` in the metadata.
- The `main` pointer is what advances when a WAP staging branch is fast-forwarded.

## Snapshot Reference Retention Interaction

Snapshot references interact with snapshot expiration: a snapshot that is pointed to by any active reference will never be expired, even if it is older than the retention policy.

```
Snapshot 1001 (committed 8 days ago, normally expirable)
  → tagged by "compliance-checkpoint-2026-05" tag
  → Protected: will not be expired until the tag is dropped
```

This enables long-term retention of specific historical snapshots (for compliance or ML reproducibility) while still expiring other snapshots on the normal schedule.

## Listing and Inspecting References

```sql
-- Spark: list all snapshot references for a table
SELECT * FROM db.orders.refs;

-- Example output:
-- name              | type   | snapshot_id         | max_ref_age_ms
-- main              | BRANCH | 8027658604211071520  | null (never expires)
-- staging           | BRANCH | 7935847293847561234  | null
-- v2.0-release      | TAG    | 6891234567890123456  | 31536000000 (1 year)
```

```python
# PyIceberg: inspect snapshot references
table = catalog.load_table("db.orders")

for ref_name, ref in table.metadata.refs.items():
    print(f"{ref_name}: type={ref.snapshot_ref_type}, snapshot={ref.snapshot_id}")
```
