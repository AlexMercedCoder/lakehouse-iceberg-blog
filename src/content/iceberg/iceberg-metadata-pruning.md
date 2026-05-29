---
term: "Iceberg Metadata Pruning"
description: "An automated housekeeping process in Apache Iceberg that limits the accumulation of historical table metadata JSON files on storage."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-table-metadata-schema"
  - "iceberg-expire-snapshots"
keywords:
  - metadata pruning
  - metadata cleanup
  - table properties metadata
lastUpdated: 2026-05-29
---

## Iceberg Metadata Pruning

**Iceberg Metadata Pruning** refers to the automatic removal of old table metadata JSON files from storage. Every commit on an Apache Iceberg table creates a new metadata file that records the current state of the table. Without pruning, thousands of historical metadata files accumulate in the storage bucket. This accumulation increases storage costs and slows down catalog operations that scan the metadata directory.

### Table Properties for Pruning

Pruning is configured using table properties. When these properties are active, the writer engine automatically deletes older metadata files during the commit cycle.

The key properties include:

- `write.metadata.previous-versions-max`: Controls the maximum number of old metadata JSON files to keep in the metadata folder. The default value is 100.
- `write.metadata.delete-after-commit.enabled`: A boolean flag that determines if the engine should delete old metadata files after a successful commit. The default value is false.

To enable automated metadata pruning, these properties are applied using SQL:

```sql
/* Configure automated metadata pruning on the logs table */
ALTER TABLE prod.db.logs SET TBLPROPERTIES (
    'write.metadata.previous-versions-max' = '10',
    'write.metadata.delete-after-commit.enabled' = 'true'
);
```

### Operational Considerations

While enabling metadata pruning keeps storage clean, it restricts the history available for debugging. If a table metadata file is deleted, you cannot manually register the table back to that exact historical version. Therefore, teams often keep a safety buffer (e.g. 50 to 100 versions) rather than pruning down to a very small number of files.
