---
term: "Apache Iceberg Spec v1 vs v2"
description: "Apache Iceberg Spec v2 introduced row-level deletes (delete files), sequence numbers, required field tracking, and improved partition evolution over Spec v1, and is now the default for all modern table creation across all major engines."
category: "Core Concepts"
relatedTerms:
  - "iceberg-table-format"
  - "iceberg-delete-files"
  - "iceberg-positional-deletes"
  - "iceberg-equality-deletes"
  - "iceberg-sequence-number"
  - "iceberg-merge-on-read"
keywords:
  - iceberg spec v1 vs v2
  - iceberg format version 1 2
  - iceberg v2 features
  - iceberg upgrade spec version
  - iceberg row level deletes version
lastUpdated: 2026-05-14
---

## Apache Iceberg Spec v1 vs v2

The Apache Iceberg specification has two major versions — **Spec v1** (the original format) and **Spec v2** (released with Iceberg 0.9.0 and finalized in 1.x). Understanding the differences is important for operators managing existing v1 tables, teams evaluating when to upgrade, and developers building against the Iceberg API.

**Spec v2 is now the default for all new table creation** across Spark, Flink, Trino, Dremio, PyIceberg, and every other major Iceberg-compatible engine. New tables should always be created as v2. The primary reason to understand v1 is to manage or migrate older tables.

## What Changed in Spec v2

### 1. Row-Level Delete Files (The Core Addition)

The single most important addition in Spec v2 is **delete files** — the metadata primitive that enables Merge-on-Read (MoR) for `UPDATE`, `DELETE`, and `MERGE` operations without rewriting data files.

Spec v1 had no concept of delete files. The only way to perform a `DELETE` or `UPDATE` was to rewrite the entire affected data file (Copy-on-Write). For high-frequency CDC and streaming update workloads, this was prohibitively expensive.

Spec v2 adds:

- **Positional delete files**: Record `(file_path, row_position)` pairs for efficiently skipping specific rows.
- **Equality delete files**: Record column values identifying rows to exclude (join-like application at read time).

See [Iceberg Delete Files](/iceberg/iceberg-delete-files/) for full detail.

### 2. Sequence Numbers

Spec v2 introduces a **sequence number** — a monotonically increasing integer assigned to each snapshot and to each data/delete file. Sequence numbers solve a critical correctness problem with overlapping delete files:

> If a row is deleted, then a new row with the same value is inserted, the equality delete file from before the insert should NOT apply to the new row.

Sequence numbers enforce this: a delete file only applies to data files with a **lower or equal sequence number**. Data files written after the delete file (higher sequence number) are immune to that delete.

In Spec v1, this ambiguity was a known limitation — equality deletes couldn't safely coexist with inserts of the same values.

### 3. Required Field Tracking

Spec v2 adds a `required` flag to schema fields. In v1, all fields were effectively nullable. In v2:

- Required fields cannot be NULL.
- Adding a required field requires a default value (so existing rows can be backfilled).
- The schema evolution safety model is tighter.

### 4. Partition Spec and Sort Order Tracking Improvements

Spec v2 clarifies how partition specs and sort orders evolve over time, particularly around how transforms interact with nested types and how sequence numbers apply to manifest entries for different spec versions.

### 5. Manifest File Schema Changes

Spec v2 manifests include additional fields:

- `sequence_number` per data file entry
- `file_sequence_number` per data file (when the file was first added)
- `content` field: `0 = DATA`, `1 = POSITION_DELETES`, `2 = EQUALITY_DELETES`

Spec v1 manifests only track data files. Spec v2 manifests can track both data files and delete files, separated by the `content` field.

## Spec v1 vs v2: Feature Comparison

| Feature                       | Spec v1 | Spec v2        |
| ----------------------------- | ------- | -------------- |
| Data files                    | Yes     | Yes            |
| Positional delete files       | No      | Yes            |
| Equality delete files         | No      | Yes            |
| Sequence numbers              | No      | Yes            |
| Required fields with defaults | No      | Yes            |
| Merge-on-Read                 | No      | Yes            |
| Copy-on-Write                 | Yes     | Yes            |
| Time travel                   | Yes     | Yes            |
| Schema evolution              | Yes     | Yes (improved) |
| Partition evolution           | Yes     | Yes (improved) |
| Branching and tagging         | No      | Yes            |

## Upgrading a Table from v1 to v2

Upgrading is a metadata-only operation — no data files are rewritten:

```sql
-- Spark: upgrade a v1 table to v2
ALTER TABLE db.orders SET TBLPROPERTIES ('format-version' = '2');
```

```python
# PyIceberg: upgrade to v2
from pyiceberg.catalog import load_catalog

catalog = load_catalog("my_catalog", **{...})
with catalog.load_table("db.orders").transaction() as tx:
    tx.upgrade_table_version(2)
```

After upgrading:

- New snapshots use v2 manifest format.
- Existing manifests remain v1 format until rewritten (via compaction or manifest rewrite).
- Engines reading the table see a mixed v1/v2 manifest set transparently.

## When v1 Tables Still Appear

You may encounter Spec v1 tables in:

- Tables migrated from Hive using early versions of Iceberg (pre-1.0).
- Tables created by older Spark/Flink jobs before v2 became the default.
- Legacy Delta→Iceberg or Hudi→Iceberg migrations that preserved file metadata.

**Action**: Upgrade all v1 tables to v2 to unlock MoR DML, delete files, and the full Iceberg feature set. The upgrade is safe, non-destructive, and takes seconds.

## Engine Compatibility with v2

All actively maintained Iceberg engines support Spec v2:

| Engine                  | v2 Support                  |
| ----------------------- | --------------------------- |
| Apache Spark 3.3+       | Full                        |
| Apache Flink 1.17+      | Full                        |
| Trino 398+              | Full                        |
| Dremio Cloud/Enterprise | Full                        |
| PyIceberg 0.5+          | Full                        |
| DuckDB 0.10+            | Read (write in development) |
| AWS Athena              | Full                        |
| Snowflake               | Full                        |
