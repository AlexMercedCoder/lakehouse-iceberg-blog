---
term: "Iceberg Snapshot Summary"
description: "A map of key-value metadata properties embedded inside a snapshot that describes the write operation and counts of affected files and records."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-table-metadata-schema"
keywords:
  - snapshot summary
  - iceberg summary metadata
  - snapshot operations
lastUpdated: 2026-05-29
---

## Iceberg Snapshot Summary

An **Iceberg Snapshot Summary** is a key-value map metadata block stored within each snapshot definition inside the table's `metadata.json` file. It records the characteristics of the commit that created the snapshot, including the type of write operation, the number of files added or deleted, and counts of modified records. This block provides audit tracking and performance metrics for table historical analyses.

### Common Summary Properties

The snapshot summary contains a mix of standard and operation-specific metrics:

- **`operation`**: The type of write operation that created the snapshot. Standard operations include:
  - `append`: New data files were added to the table.
  - `overwrite`: Existing data files were replaced by new data files.
  - `delete`: Existing data files were removed, or delete files were added.
  - `replace`: The table's schema, partition spec, or sort order was evolved without changing the data.
- **`added-data-files`**: The number of new data files introduced.
- **`deleted-data-files`**: The number of data files removed.
- **`added-records`**: The total number of rows added.
- **`deleted-records`**: The total number of rows deleted.
- **`changed-partition-count`**: The number of partitions affected by the write.
- **`total-data-files`**: The cumulative count of active data files in the table after this snapshot.
- **`total-records`**: The cumulative count of active rows in the table after this snapshot.

### Example Metadata Representation

This excerpt from an Iceberg `metadata.json` file shows how the summary map is represented:

```json
{
  "snapshot-id": 123456789012345,
  "timestamp-ms": 1716982400000,
  "summary": {
    "operation": "append",
    "added-data-files": "4",
    "added-records": "45000",
    "total-data-files": "28",
    "total-records": "315000",
    "spark.app.id": "app-20260529140000-0001"
  },
  "manifest-list": "s3://my-bucket/db/table/metadata/snap-123456789012345-list.avro"
}
```

Engines and diagnostic scripts parse these properties to track dataset growth, monitor data ingestion pipelines, and audit user modification activities.
