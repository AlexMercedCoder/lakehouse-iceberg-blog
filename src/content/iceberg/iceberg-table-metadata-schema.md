---
term: "Iceberg Table Metadata Schema"
description: "The JSON schema specification for the Iceberg table metadata file, tracking schemas, partition specs, snapshots, and table properties."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-metadata-file"
  - "iceberg-snapshot"
  - "iceberg-schema-evolution"
keywords:
  - iceberg table metadata schema
  - metadata json schema
  - iceberg metadata spec
lastUpdated: 2026-05-29
---

## Iceberg Table Metadata Schema

The **Iceberg Table Metadata Schema** specifies the JSON format of the table metadata file, commonly named with a `.metadata.json` suffix. This file is the single source of truth for an Iceberg table, describing its schema history, partition configurations, sort orders, and snapshots. When changes occur, a new metadata file is written, and the catalog performs an atomic swap to update the reference pointer.

### Schema Fields and Layout

A compliant metadata JSON file contains several mandatory top-level properties:

- **`format-version`**: An integer indicating the table format specification version (e.g., `1` for Spec V1, `2` for Spec V2, or `3` for Spec V3).
- **`table-uuid`**: A unique string identifier assigned when the table is created. It prevents table catalog mismatches.
- **`location`**: A string indicating the base storage path of the table's data and metadata files.
- **`last-sequence-number`**: A long tracking the latest commit sequence number.
- **`last-updated-ms`**: A long timestamp representing the last time the table state was updated.
- **`last-column-id`**: An integer tracking the highest column ID assigned to columns, preventing ID collisions during schema changes.
- **`schemas`**: A list of schema objects representing the historical evolutionary lineage of the table's structure.
- **`current-schema-id`**: An integer matching the ID of the schema currently active for read and write operations.
- **`partition-specs`**: A list of partition specifications used throughout the table's history, enabling partition evolution.
- **`default-spec-id`**: The ID of the default partition specification currently applied.
- **`sort-orders`**: A list of sort order objects defining how data is sorted within files.
- **`default-sort-order-id`**: The ID of the default sort order currently applied.
- **`properties`**: A map of key-value string properties defining configurations (such as compaction strategy or metadata retention rules).
- **`snapshots`**: A list of snapshots, where each snapshot tracks the manifest list and file state at a specific commit.
- **`current-snapshot-id`**: The long identifier matching the active snapshot of the table.
- **`snapshot-log`**: A historical array tracking when snapshots became current.
- **`metadata-log`**: A historical array listing the paths and creation times of previous metadata JSON files.

### Example Metadata JSON Fragment

The following is an abbreviated example of the JSON layout:

```json
{
  "format-version": 2,
  "table-uuid": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "location": "s3://my-bucket/db/my_table",
  "last-sequence-number": 12,
  "last-updated-ms": 1716982400000,
  "last-column-id": 4,
  "schemas": [
    {
      "type": "struct",
      "schema-id": 0,
      "fields": [
        { "id": 1, "name": "id", "required": true, "type": "long" },
        { "id": 2, "name": "name", "required": false, "type": "string" }
      ]
    }
  ],
  "current-schema-id": 0,
  "partition-specs": [
    {
      "spec-id": 0,
      "fields": []
    }
  ],
  "default-spec-id": 0,
  "snapshots": [
    {
      "snapshot-id": 9876543210123,
      "timestamp-ms": 1716982400000,
      "manifest-list": "s3://my-bucket/db/my_table/metadata/snap-987654321-list.avro",
      "summary": {
        "operation": "append",
        "added-data-files": "2"
      }
    }
  ],
  "current-snapshot-id": 9876543210123
}
```
