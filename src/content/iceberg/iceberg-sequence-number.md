---
term: "Iceberg Sequence Number"
description: "The Iceberg sequence number is a monotonically increasing integer assigned to each snapshot and each data/delete file, introduced in Spec v2 to correctly scope delete files so they only apply to data written before them, preventing phantom deletions of newly inserted rows."
category: "Core Concepts"
relatedTerms:
  - "iceberg-spec-v1-vs-v2"
  - "iceberg-snapshot"
  - "iceberg-delete-files"
  - "iceberg-equality-deletes"
  - "iceberg-manifest-file"
keywords:
  - iceberg sequence number
  - iceberg delete file ordering
  - iceberg spec v2 sequence
  - iceberg concurrent write ordering
lastUpdated: 2026-05-14
---

## Iceberg Sequence Number

The **sequence number** is a monotonically increasing integer counter introduced in Apache Iceberg Spec v2 that solves a fundamental correctness problem with row-level delete files: how do you ensure that a delete file targeting rows with a specific value doesn't accidentally delete newly inserted rows with the same value?

Without sequence numbers, an equality delete file saying "delete all rows where `user_id = 12345`" would apply to both old rows (the ones you wanted to delete) AND any new rows inserted after the delete — breaking the semantics of the operation.

## The Problem Sequence Numbers Solve

Consider this sequence of events on a Spec v1 table (no sequence numbers):

1. Row `{user_id: 12345, name: "Alice"}` is inserted.
2. Row is deleted: engine writes equality delete file `{user_id: 12345}`.
3. New row `{user_id: 12345, name: "Bob"}` is inserted (new user, same ID recycled).
4. Query reads the table: equality delete file matches both old Alice row AND new Bob row → Bob is incorrectly deleted.

This "phantom deletion" bug is real and was a known limitation of early Iceberg delete file semantics.

## How Sequence Numbers Fix This

In Spec v2, every data file and every delete file is assigned a **sequence number** when it is first added to the table. Sequence numbers:

- Are assigned per-snapshot: all files added in a single snapshot share the same sequence number.
- Are monotonically increasing: each new snapshot's sequence number is strictly greater than any previous snapshot's.
- Are stored per manifest entry in the manifest file.

**The rule**: A delete file only applies to data files with a **sequence number less than or equal to the delete file's sequence number**.

Replaying the scenario with sequence numbers:

1. `{user_id: 12345, name: "Alice"}` inserted → sequence number 1.
2. Equality delete file `{user_id: 12345}` written → sequence number 2.
3. New row `{user_id: 12345, name: "Bob"}` inserted → sequence number 3.
4. Query: Delete file (seq 2) only applies to data files with seq ≤ 2. Bob's file has seq 3 → immune. Only Alice is deleted. ✅

## Sequence Number Fields in Manifest Entries

In Spec v2 manifest files, each entry has two sequence number fields:

| Field                  | Description                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `sequence_number`      | The snapshot sequence number when this file was **committed** (becomes the file's permanent ID) |
| `file_sequence_number` | The sequence number when this file was **first added** (used for delete file scoping)           |

These are usually the same value. They differ when a file is inherited across snapshots (e.g., during append operations that don't rewrite existing manifests).

## Sequence Numbers and Compaction

When compaction rewrites data files that have accumulated equality delete files:

1. The new, clean data files get the **current snapshot's sequence number** (higher than any existing delete file).
2. The old delete files are removed from the manifest.
3. Future delete files (higher seq) can now apply to the new files.

This is why compaction is "safe" — it doesn't accidentally re-expose rows that were previously deleted, because the delete semantics are governed by sequence numbers, not just file identity.

## Sequence Numbers and Concurrent Writers

Sequence numbers also provide a global ordering for concurrent write resolution:

- Writer A reads the table at sequence number 5.
- Writer B concurrently reads and commits at sequence number 6.
- Writer A's commit attempt sees that the current sequence number is 6 (not 5) — it retries with conflict detection logic to determine whether the concurrent commit is compatible with its own changes.

This is part of Iceberg's optimistic concurrency control mechanism.

## Inspecting Sequence Numbers

```sql
-- Spark: view sequence numbers for data files
SELECT file_path, content, sequence_number, file_sequence_number
FROM db.orders.files
ORDER BY sequence_number;

-- View sequence numbers in snapshot history
SELECT snapshot_id, sequence_number, committed_at
FROM db.orders.snapshots
ORDER BY sequence_number;
```

Sequence numbers are typically transparent to end users but are invaluable for debugging delete file scoping issues or understanding concurrent write conflicts in Iceberg systems.
