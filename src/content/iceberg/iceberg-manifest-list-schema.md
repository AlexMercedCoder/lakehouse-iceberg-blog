---
term: "Iceberg Manifest List Schema"
description: "The Avro schema definition that tracks the set of manifest files comprising an Iceberg snapshot, including partition summaries and file counts."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-manifest-list"
  - "iceberg-manifest-entry-schema"
  - "iceberg-snapshot"
keywords:
  - iceberg manifest list schema
  - manifest list avro
  - manifest metadata list
lastUpdated: 2026-05-29
---

## Iceberg Manifest List Schema

The **Iceberg Manifest List Schema** defines the structure of the manifest list file. For every table snapshot, Iceberg writes a single manifest list file that acts as an index of all manifests belonging to that snapshot. Query engines read the manifest list first to prune entire manifest files from the scan phase without reading their individual manifest entries.

### Key Fields in the Schema

The manifest list is stored as a flat Avro file containing a list of `manifest_file` structs. Each struct represents one manifest file and includes the following fields:

- **`manifest_path`**: The absolute URI string pointing to the location of the manifest file in storage.
- **`manifest_length`**: A long value indicating the size of the manifest file in bytes.
- **`partition_spec_id`**: An integer ID of the partition spec used to write this manifest file, ensuring that partition filters are evaluated correctly.
- **`content`**: An integer indicating the file content type: `0` for data files, or `1` for delete files.
- **`sequence_number`**: The sequence number assigned when the manifest file was added to the table.
- **`min_sequence_number`**: The minimum sequence number among all files tracked by this manifest.
- **`added_snapshot_id`**: The ID of the snapshot that added the manifest file.
- **`added_data_files_count`**: The count of new data files added in this manifest.
- **`existing_data_files_count`**: The count of existing data files tracked by this manifest.
- **`deleted_data_files_count`**: The count of deleted data files tracked by this manifest.

### The Partitions Summary Struct

To enable fast partition pruning during query planning, the schema includes a nested `partitions` summary struct for each partition field in the spec. For each partition column, the summary tracks:

- **`lower_bound`**: A byte array representing the minimum value of this partition field in the manifest.
- **`upper_bound`**: A byte array representing the maximum value of this partition field in the manifest.
- **`contains_null`**: A boolean flag indicating if any records in the manifest have a null value for this partition field.
- **`contains_nan`**: A boolean flag indicating if any records in the manifest have a floating-point NaN value for this partition field.

By checking these summary bounds, query engines determine if a manifest file contains any directories matching the query's filter predicates, skipping manifests that are out of bounds.
