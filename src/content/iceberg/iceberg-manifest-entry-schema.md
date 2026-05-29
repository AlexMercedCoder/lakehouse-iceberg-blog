---
term: "Iceberg Manifest Entry Schema"
description: "The Avro schema definition that specifies how Iceberg tracks data or delete files within manifest files, detailing columns for status, snapshots, and file statistics."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-manifest-file"
  - "iceberg-manifest-list-schema"
  - "iceberg-sequence-number"
keywords:
  - iceberg manifest entry schema
  - manifest entry avro
  - iceberg file stats
lastUpdated: 2026-05-29
---

## Iceberg Manifest Entry Schema

The **Iceberg Manifest Entry Schema** defines the format of record entries inside an Iceberg manifest file. While manifest files are logically represented as tables of file paths and statistics, they are physically stored as immutable Avro files. Each row in a manifest file conforms to this schema, tracking the lifecycle and metrics of a single data or delete file.

### Schema Structure and Fields

The schema contains metadata tracking columns alongside a nested struct describing the physical file. The key top-level columns in the schema include:

- **`status`**: An integer indicating the file status. The values are `0` for EXISTING, `1` for ADDED, or `2` for DELETED.
- **`snapshot_id`**: The unique long identifier of the snapshot in which the file was first added or marked as deleted.
- **`sequence_number`**: An optional long representing the sequence number assigned when the file was written (supported in Spec V2 and V3).
- **`file`**: A nested struct containing metadata and statistics for the specific data or delete file.

### The Nested File Struct

The nested `data_file` or `delete_file` struct stores properties that engines use during query planning and file pruning:

| Field Name               | Type   | Description                                                                 |
| :----------------------- | :----- | :-------------------------------------------------------------------------- |
| **`file_path`**          | string | The absolute URI location of the file in cloud or object storage.           |
| **`file_format`**        | string | The file format, such as `PARQUET`, `AVRO`, or `ORC`.                       |
| **`partition`**          | struct | A tuple of partition values corresponding to the table's partition spec.    |
| **`record_count`**       | long   | The total number of rows stored within this file.                           |
| **`file_size_in_bytes`** | long   | The physical file size, used to plan reading splits.                        |
| **`column_sizes`**       | map    | Map of column ID to size in bytes, helpful for calculating projection cost. |
| **`value_counts`**       | map    | Map of column ID to total value count (including nulls).                    |
| **`null_value_counts`**  | map    | Map of column ID to null value count, used for null-predicate pushdowns.    |
| **`nan_value_counts`**   | map    | Map of column ID to floating-point NaN value count.                         |
| **`lower_bounds`**       | map    | Map of column ID to serialized minimum value, used for data skipping.       |
| **`upper_bounds`**       | map    | Map of column ID to serialized maximum value, used for data skipping.       |
| **`sort_order_id`**      | int    | The ID of the sort order applied when this file was written.                |

By storing these detailed statistics at the file level inside the manifest entry, query engines can determine if a file contains relevant records before opening and reading it.
