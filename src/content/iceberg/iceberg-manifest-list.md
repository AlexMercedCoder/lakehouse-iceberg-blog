---
term: "Iceberg Manifest List"
description: "An Iceberg manifest list is a file associated with each snapshot that lists all the manifest files making up that snapshot, along with partition-level summary statistics used for pruning queries without opening individual manifests."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-manifest-file"
  - "iceberg-metadata-file"
  - "iceberg-data-files"
  - "iceberg-table-format"
keywords:
  - iceberg manifest list
  - iceberg snapshot file
  - iceberg manifest list file
  - iceberg query planning metadata
lastUpdated: 2026-05-14
---

## Iceberg Manifest List

The **manifest list** (also called the "snapshot file") is the second level of Iceberg's three-tier metadata hierarchy. Every snapshot has exactly one manifest list. It is an Avro file stored in object storage that records all the **manifest files** that collectively describe the complete set of data files in the table at that snapshot.

The manifest list is the critical link between a snapshot and the actual data: and it is designed for maximum query planning efficiency.

## Position in the Metadata Hierarchy

```
Table Metadata File (metadata.json)
  └── Snapshot
        └── Manifest List  ← you are here
              ├── Manifest File 1
              │     ├── Data File A
              │     └── Data File B
              ├── Manifest File 2
              │     └── Data File C
              └── Manifest File N
                    └── Data File ...
```

## Contents of a Manifest List Entry

Each entry in the manifest list represents one manifest file and contains:

| Field                  | Description                                                               |
| ---------------------- | ------------------------------------------------------------------------- |
| `manifest_path`        | Location of the manifest file in object storage                           |
| `manifest_length`      | Size of the manifest file in bytes                                        |
| `partition_spec_id`    | Which partition spec was used for this manifest                           |
| `content`              | DATA or DELETES (whether this manifest tracks data files or delete files) |
| `sequence_number`      | When this manifest was added (for ordering)                               |
| `added_files_count`    | How many data files were added in this manifest                           |
| `existing_files_count` | How many data files existed before this manifest                          |
| `deleted_files_count`  | How many data files were deleted via this manifest                        |
| `partitions`           | Partition summary statistics (min/max values per partition field)         |

## The Critical Role of Partition Statistics

The `partitions` field in each manifest list entry contains **partition-level statistics**: specifically, the minimum and maximum values of each partition field across all files in the manifest. This enables the query engine to do **manifest-level pruning** before even opening individual manifest files.

### Example Query Planning with Manifest Pruning

Consider a table partitioned by `day(event_time)` with 365 manifest files (one per day of 2025):

```sql
SELECT * FROM events WHERE event_time BETWEEN '2025-11-01' AND '2025-11-30';
```

Query planning:

1. Engine reads the manifest list (one small Avro file).
2. Engine compares the `partitions` min/max values in each manifest list entry against `event_time BETWEEN '2025-11-01' AND '2025-11-30'`.
3. Engine identifies that only 30 manifest entries fall within the range.
4. Engine opens only those 30 manifests (ignoring 335).
5. Engine reads only the relevant data files.

**Without manifest list partition statistics**, the engine would have to open all 365 manifests to determine which data files to read. The manifest list makes this a `O(manifests)` operation rather than `O(data_files)`: a massive performance difference at scale.

## Manifest List File Format

Manifest list files use the **Avro** format (not Parquet). Avro was chosen because manifest lists are small, schema-fixed files that benefit from fast sequential reads, not columnar analytics. A typical manifest list file is kilobytes to low megabytes in size.

## Manifest List Growth and Maintenance

Like the table metadata file, manifest lists grow as more manifests are added. After compaction operations, old manifests are removed and replaced with new, merged manifests. Snapshot expiration removes old manifest lists (and eventually old manifest files and orphaned data files) from storage.

## Inspecting Manifest Lists

```sql
-- Spark SQL: inspect manifests for the current snapshot
SELECT * FROM db.orders.manifests;

-- Output columns include:
-- path, length, partition_spec_id, added_snapshot_id,
-- added_data_files_count, existing_data_files_count,
-- deleted_data_files_count, partition_summaries
```
