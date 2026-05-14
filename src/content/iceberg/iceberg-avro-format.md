---
term: "Iceberg Avro Metadata Format"
description: "Apache Avro is the metadata file format used for all Apache Iceberg manifest files and manifest lists, providing schema-embedded, binary-encoded metadata that enables efficient, language-neutral parsing of Iceberg table structure by any Iceberg-compatible engine."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-manifest-file"
  - "iceberg-manifest-list"
  - "iceberg-metadata-file"
  - "iceberg-parquet"
  - "iceberg-table-format"
keywords:
  - iceberg avro format
  - iceberg manifest avro
  - iceberg metadata avro
  - avro iceberg files
  - iceberg manifest file format
lastUpdated: 2026-05-14
---

## Apache Avro in Iceberg Metadata

**Apache Avro** is the binary serialization format used for all of Apache Iceberg's metadata files — specifically the **manifest list** and **manifest files** that form the core of Iceberg's metadata layer. Understanding Avro's role in Iceberg clarifies why Iceberg metadata is fast to read, schema-safe, and language-neutral.

## Why Avro for Iceberg Metadata?

When the Iceberg format was designed at Netflix, the metadata format needed to be:

- **Self-describing**: Each file should carry its own schema so any reader can decode it.
- **Binary compact**: Fast to write and read without JSON parsing overhead.
- **Schema-evolvable**: The metadata schema can change across Iceberg spec versions without breaking existing readers.
- **Widely supported**: Readable in Java, Python, Go, and other language ecosystems.

Apache Avro satisfies all of these: it's a compact binary format with a schema embedded in the file header, supporting schema evolution via field defaults, unions, and optional fields.

## The Three Iceberg File Types and Their Formats

| File Type         | Format               | Role                                                      |
| ----------------- | -------------------- | --------------------------------------------------------- |
| **Metadata file** | JSON                 | Top-level table state: schema, specs, snapshot references |
| **Manifest list** | Avro                 | Lists all manifest files for a snapshot                   |
| **Manifest file** | Avro                 | Lists all data/delete files with per-file statistics      |
| **Data file**     | Parquet / ORC / Avro | The actual table data                                     |

Confusingly, "Avro" appears both as a data file format (you can store table data in Avro) and as the metadata file format. This guide focuses on Avro as the **metadata format** for manifests.

## Manifest List Avro Schema

The manifest list (also called the snapshot manifest) is an Avro file where each record describes one manifest file:

```json
{
  "type": "record",
  "name": "manifest_file",
  "fields": [
    { "name": "manifest_path", "type": "string" },
    { "name": "manifest_length", "type": "long" },
    { "name": "partition_spec_id", "type": "int" },
    { "name": "content", "type": "int" }, // 0=data, 1=deletes
    { "name": "sequence_number", "type": "long" },
    { "name": "min_sequence_number", "type": "long" },
    { "name": "added_snapshot_id", "type": "long" },
    { "name": "added_files_count", "type": ["null", "int"] },
    { "name": "existing_files_count", "type": ["null", "int"] },
    { "name": "deleted_files_count", "type": ["null", "int"] },
    { "name": "added_rows_count", "type": ["null", "long"] },
    { "name": "existing_rows_count", "type": ["null", "long"] },
    { "name": "deleted_rows_count", "type": ["null", "long"] },
    {
      "name": "partitions",
      "type": [
        "null",
        {
          "type": "array",
          "items": {
            "type": "record",
            "name": "r508",
            "fields": [
              { "name": "contains_null", "type": "boolean" },
              { "name": "contains_nan", "type": ["null", "boolean"] },
              { "name": "lower_bound", "type": ["null", "bytes"] },
              { "name": "upper_bound", "type": ["null", "bytes"] }
            ]
          }
        }
      ]
    }
  ]
}
```

The `partitions` field in the manifest list is what enables **manifest-level partition pruning** — the query planner reads only the Avro manifest list headers (tiny) to determine which manifests can be skipped before opening any manifest file.

## Manifest File Avro Schema

Each manifest file is an Avro file where each record describes one data or delete file:

```json
{
  "type": "record",
  "name": "manifest_entry",
  "fields": [
    {"name": "status", "type": "int"},           // 0=existing, 1=added, 2=deleted
    {"name": "snapshot_id", "type": ["null", "long"]},
    {"name": "sequence_number", "type": ["null", "long"]},
    {"name": "file_sequence_number", "type": ["null", "long"]},
    {"name": "data_file", "type": {
      "type": "record",
      "name": "r2",
      "fields": [
        {"name": "content", "type": "int"},       // 0=data, 1=position_deletes, 2=equality_deletes
        {"name": "file_path", "type": "string"},
        {"name": "file_format", "type": "string"},
        {"name": "partition", "type": ...},        // partition values
        {"name": "record_count", "type": "long"},
        {"name": "file_size_in_bytes", "type": "long"},
        {"name": "column_sizes", "type": ...},     // per-column byte sizes
        {"name": "value_counts", "type": ...},     // per-column value counts
        {"name": "null_value_counts", "type": ...},
        {"name": "nan_value_counts", "type": ...},
        {"name": "lower_bounds", "type": ...},     // per-column min values
        {"name": "upper_bounds", "type": ...},     // per-column max values
        {"name": "key_metadata", "type": ...},     // encryption metadata
        {"name": "split_offsets", "type": ...},    // Parquet row group offsets
        {"name": "equality_ids", "type": ...}      // equality delete IDs
      ]
    }}
  ]
}
```

The `lower_bounds` and `upper_bounds` fields per column are what power **file-level data skipping** — the query engine reads these Avro fields (extremely fast) to determine which files can be skipped without opening the Parquet data files.

## Reading Iceberg Avro Metadata with PyIceberg

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog("my_catalog", **{...})
table = catalog.load_table("analytics.orders")

# The manifest list: one entry per manifest file
snapshot = table.current_snapshot()
manifest_list = snapshot.manifests(table.io())

for manifest in manifest_list:
    print(f"Manifest: {manifest.manifest_path}")
    print(f"  Partition summaries: {manifest.partitions}")
    print(f"  Added files: {manifest.added_files_count}")

    # Each manifest file: one entry per data file
    for entry in manifest.fetch_manifest_entry(table.io()):
        print(f"  File: {entry.data_file.file_path}")
        print(f"  Records: {entry.data_file.record_count}")
        print(f"  Size: {entry.data_file.file_size_in_bytes} bytes")
        print(f"  Lower bounds: {entry.data_file.lower_bounds}")
```

## Avro as a Data Format (vs. Metadata Format)

In addition to metadata, Iceberg supports Avro as a **data file format** (alongside Parquet and ORC). Avro data files are rarely used for analytical tables (Parquet is far better for analytics) but may appear in:

- Legacy Iceberg tables migrated from Avro-based Hive tables.
- Streaming tables where row-based writes are acceptable.
- Tables where write simplicity is prioritized over read performance.

For all new tables, use Parquet as the data format. Avro as metadata is always used regardless — it's the format of manifest files in all Iceberg tables.
