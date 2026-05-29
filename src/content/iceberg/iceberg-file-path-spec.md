---
term: "Iceberg File Path Spec"
description: "The set of structural rules in Apache Iceberg that defines how metadata files, manifest files, and physical data files are organized in storage paths."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-metadata-file"
  - "iceberg-manifest-file"
keywords:
  - iceberg file path
  - directory layout iceberg
  - table storage path
lastUpdated: 2026-05-29
---

## Iceberg File Path Spec

The **Iceberg File Path Spec** defines the rules for organizing files within a table's storage location. Unlike Hive-style layouts that couple partition folder structures with table query semantics, Iceberg tracks files explicitly by their absolute URIs inside manifest files. This allows for flexible physical folder layouts while maintaining a logical representation.

By default, an Iceberg table directory contains two main subdirectories:

- `/metadata`: Stores table control files, including the `.metadata.json` files, manifest lists (Avro), and manifest files (Avro).
- `/data`: Stores the physical data files (Parquet, ORC, or Avro) and delete files.

### Standard Storage Layout

In the default configuration, data files are written to subfolders matching the table's partition spec, using key-value pair directory names:

```
s3://my-bucket/db/my_table/metadata/v1.metadata.json
s3://my-bucket/db/my_table/data/region=US/sales_file_1.parquet
s3://my-bucket/db/my_table/data/region=EU/sales_file_2.parquet
```

If the table's partition spec evolves, newer files are written to subfolders conforming to the new partition layout, while older files remain in their original directories. The query engine reads the absolute paths recorded in the active manifests, resolving files across different physical directory structures.
