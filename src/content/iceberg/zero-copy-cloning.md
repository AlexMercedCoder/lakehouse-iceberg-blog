---
term: "Zero-Copy Cloning"
description: "A metadata-only operation that duplicates a table state instantly by pointing the new table clone to the existing data files without copying them."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-metadata-file"
keywords:
  - zero-copy cloning
  - table clone
  - metadata clone
  - zero copy duplicate
lastUpdated: 2026-05-29
---

## Zero-Copy Cloning

**Zero-Copy Cloning** is an optimization technique that duplicates a table's structure and contents instantly without duplicating the underlying physical data files. Traditional table duplication requires copying gigabytes or terabytes of files in object storage, which is slow and expensive. In Apache Iceberg, cloning is a metadata-only operation.

### How Zero-Copy Cloning Works

Iceberg's metadata architecture makes zero-copy cloning simple:

1.  **Read Target Snapshot**: The catalog retrieves the current `.metadata.json` path of the source table and resolves the active snapshot ID.
2.  **Create New Table**: The catalog registers a new table name pointing to a new metadata file.
3.  **Inherit Manifest Lists**: The new metadata file lists the exact same manifest list files and data files as the source table snapshot.

```
  Source Table Metadata ────────┐
                                 ├───> [Shared Data Files]
  Cloned Table Metadata ────────┘
```

Because both tables point to the same physical data files, the clone is created instantly.

### Write Isolation

Once cloned, the tables diverge:

- **Reads**: Both tables read the shared files.
- **Writes on Clone**: If an engine writes new rows or deletes rows on the cloned table, it creates new data files and a new metadata version. The clone's metadata pointer updates to track these new files, while the source table remains completely unaffected.
- **Writes on Source**: Updates to the source table create new snapshots, which do not propagate to the clone.

This write isolation makes zero-copy cloning ideal for creating temporary sandbox environments where developers can test ETL updates and run experimental queries on production datasets without risking data corruption.
