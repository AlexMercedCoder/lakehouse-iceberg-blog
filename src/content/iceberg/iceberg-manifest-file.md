---
term: "Iceberg Manifest File"
description: "An Iceberg manifest file is an Avro metadata file that tracks a subset of an Iceberg table's data files, recording each file's location, partition values, record counts, and column-level statistics used for data skipping."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-manifest-list"
  - "iceberg-snapshot"
  - "iceberg-data-files"
  - "iceberg-delete-files"
  - "iceberg-table-format"
keywords:
  - iceberg manifest file
  - iceberg file tracking
  - iceberg column statistics
  - iceberg data skipping
  - iceberg manifest avro
lastUpdated: 2026-05-14
---

## Iceberg Manifest File

An **Iceberg manifest file** is the third level in Iceberg's metadata hierarchy, sitting between the manifest list (snapshot level) and the actual data files. Each manifest file is an Avro-format metadata file that tracks a subset of the table's data files (or delete files), recording detailed statistics about each tracked file.

Manifests are the workhorse of Iceberg's query planning engine: the column-level statistics they contain are what enable **data skipping** — eliminating data files from a query before they are opened based on their min/max values.

## Position in the Metadata Hierarchy

```
Snapshot → Manifest List → Manifest File ← you are here
                                 └── Data File entries (with stats)
```

## Contents of a Manifest File Entry

Each row in a manifest file describes one data file (or delete file) and contains:

| Field                | Description                                 |
| -------------------- | ------------------------------------------- |
| `status`             | ADDED, EXISTING, or DELETED                 |
| `snapshot_id`        | Which snapshot added this file              |
| `sequence_number`    | Write order for conflict resolution         |
| `file_path`          | Full URI of the data file in object storage |
| `file_format`        | PARQUET, ORC, or AVRO                       |
| `partition`          | The partition values for this file          |
| `record_count`       | Number of rows in the file                  |
| `file_size_in_bytes` | Physical file size                          |
| `column_sizes`       | Map of column ID → byte size in the file    |
| `value_counts`       | Map of column ID → non-null value count     |
| `null_value_counts`  | Map of column ID → null value count         |
| `nan_value_counts`   | Map of column ID → NaN count (for floats)   |
| `lower_bounds`       | Map of column ID → serialized minimum value |
| `upper_bounds`       | Map of column ID → serialized maximum value |

## The Power of Column-Level Statistics

The `lower_bounds` and `upper_bounds` fields are what enable **data skipping** — one of the most impactful performance features of Iceberg.

### Example: Column Statistics in Action

A table `orders` has 10,000 data files. A query runs:

```sql
SELECT * FROM orders WHERE total_amount > 500.00;
```

Without column statistics, the engine must open all 10,000 files to find rows where `total_amount > 500`.

With Iceberg manifest statistics, the engine reads the manifests and checks `lower_bounds` and `upper_bounds` for `total_amount` in each file entry:

- Files where `upper_bound(total_amount) <= 500` → skip entirely (guaranteed no matching rows)
- Files where `lower_bound(total_amount) > 500` → read all rows (all match)
- Files where `lower_bound(total_amount) <= 500 AND upper_bound(total_amount) > 500` → read and filter

In a typical dataset with reasonable data clustering, this eliminates the majority of files before they are opened.

## Manifest File Reuse

A key performance optimization in Iceberg: manifests are **reused across snapshots**. When a new snapshot is created by appending new data, Iceberg only creates a new manifest for the newly added files. The existing manifests from the previous snapshot are referenced unchanged in the new manifest list.

This means snapshot creation is `O(new_files)`, not `O(total_files)` — critically important for tables that accumulate millions of files.

## Data Manifests vs. Delete Manifests

In Iceberg Spec v2 (which introduced row-level deletes), there are two types of manifests:

- **Data manifests**: Track data files (Parquet/ORC/Avro files containing actual rows).
- **Delete manifests**: Track delete files (positional delete files or equality delete files that record which rows should be excluded during reads).

The manifest list differentiates these via the `content` field: `0 = DATA`, `1 = DELETES`.

## Compaction and Manifest Merging

Over time, tables with frequent small writes accumulate many small manifests (each small write creates a new manifest). This creates overhead because query planning must open many manifest files. **Compaction** (specifically, manifest rewriting) merges small manifests into larger ones, reducing metadata overhead.

```sql
-- Spark: rewrite manifests to reduce manifest count
CALL system.rewrite_manifests('db.orders');
```

## Inspecting Manifest File Contents

```sql
-- Spark: view all data files tracked across manifests
SELECT * FROM db.orders.files;

-- Key columns returned:
-- file_path, file_format, record_count, file_size_in_bytes,
-- column_sizes, value_counts, null_value_counts,
-- lower_bounds, upper_bounds
```
