---
term: "Iceberg Manifest List"
metaTitle: "Iceberg Manifest List | Fields, Pruning, and Time Travel"
description: "An Iceberg manifest list is the Avro file that lists every manifest in one snapshot. See its fields, how engines prune with it, and how v4 may replace it."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-manifest-file"
  - "iceberg-metadata-file"
  - "iceberg-data-files"
  - "iceberg-table-format"
  - "iceberg-manifest-list-schema"
keywords:
  - iceberg manifest list
  - iceberg manifest list fields
  - iceberg manifest list file
  - iceberg query planning metadata
lastUpdated: 2026-10-14
---

## Iceberg Manifest List

The **manifest list** is the metadata file that lists the manifest files making up one snapshot of an Iceberg table. Every snapshot points to exactly one manifest list. It is an Avro file stored in object storage, and each manifest in it tracks a set of data files or delete files.

A new manifest list is written for every commit attempt, because every commit changes the set of manifests that make up the table.

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

1. **Table metadata file** (`metadata.json`): schema, partition specs, snapshots, and the current snapshot ID.
2. **Manifest list** (one per snapshot, Avro): one entry per manifest, with summary statistics.
3. **Manifest files** (Avro): one entry per data or delete file, with column statistics.
4. **Data and delete files** (usually Parquet).

## Contents of a Manifest List Entry

Each entry is a `manifest_file` struct. The fields that matter most for planning:

| Field                                                              | Purpose                                                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `manifest_path`, `manifest_length`                                 | Where the manifest is and how big it is                                                                |
| `partition_spec_id`                                                | Which partition spec the manifest was written with                                                     |
| `content`                                                          | Whether the manifest tracks data files or delete files (v2+)                                           |
| `sequence_number`, `min_sequence_number`                           | Ordering used to apply deletes correctly (v2+)                                                         |
| `added_snapshot_id`                                                | The snapshot that added this manifest                                                                  |
| `added_files_count`, `existing_files_count`, `deleted_files_count` | File counts by status                                                                                  |
| `added_rows_count`, `existing_rows_count`, `deleted_rows_count`    | Row counts by status                                                                                   |
| `partitions`                                                       | One `field_summary` per partition field: `contains_null`, `contains_nan`, `lower_bound`, `upper_bound` |
| `first_row_id`                                                     | Starting row ID for row lineage (v3)                                                                   |

For the full field list with IDs, see [Iceberg Manifest List Schema](/iceberg/iceberg-manifest-list-schema/).

## The Critical Role of Partition Summaries

The `partitions` field holds a lower and upper bound for each partition field across all files in the manifest. That lets the engine do **manifest-level pruning** before opening any manifest file.

### Example Query Planning with Manifest Pruning

Consider a table partitioned by `day(event_time)` whose manifests are each clustered to one day of 2025, 365 manifests in all:

```sql
SELECT * FROM events WHERE event_time BETWEEN '2025-11-01' AND '2025-11-30';
```

Query planning:

1. The engine reads the manifest list (one small Avro file).
2. It compares each entry's partition bounds against the November range.
3. Only the 30 matching manifests survive.
4. The engine opens those 30 and skips the other 335.
5. Per-file column statistics inside the surviving manifests prune further before any data file is read.

This works best when manifests are clustered by partition. If each manifest spans every partition, the summaries overlap and nothing gets skipped. Spark's `rewrite_manifests` procedure regroups manifests so the summaries become selective again; see [Avoiding Metadata Bloat with Snapshot Expiration and Rewriting Manifests](https://iceberglakehouse.com/posts/iceberg-metadata-bloat-cleanup/).

## Time Travel and Snapshot Expiration

Because each snapshot has its own manifest list, [time travel](/iceberg/iceberg-time-travel/) is a lookup: pick the snapshot for a timestamp or ID, open its manifest list, and plan from there. Snapshot expiration deletes the manifest lists of expired snapshots, along with any manifests and data files no longer referenced.

## Inspecting Manifest Lists

You can inspect the current snapshot's manifest list without touching Avro by querying the `manifests` metadata table:

```sql
-- Spark SQL: inspect manifests for the current snapshot
SELECT path, added_data_files_count, existing_data_files_count, partition_summaries
FROM db.orders.manifests;

-- Other output columns include:
-- length, partition_spec_id, added_snapshot_id, deleted_data_files_count
```

## The Manifest List in Iceberg v4

Today every commit rewrites the manifest list, so commit cost grows with the number of manifests, which hurts high-frequency streaming writes. Iceberg v4 design work proposes a root manifest that would replace the manifest list and let small commits write a single metadata file. As of October 2026 these are proposals under discussion, not a released spec. For background, read [Understanding the Apache Iceberg Manifest List](https://iceberglakehouse.com/posts/2024-8-understanding-apache-iceberg-manifest-list/) and [Iceberg v4's Adaptive Metadata Tree](https://iceberglakehouse.com/posts/iceberg-v4-adaptive-metadata-tree/).
