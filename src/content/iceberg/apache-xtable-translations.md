---
term: "Apache XTable Translations"
description: "An open-source translation layer that converts table metadata bidirectionally among Apache Iceberg, Delta Lake, and Apache Hudi formats without rewriting data files."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "delta-lake-uniform-metadata"
  - "iceberg-table-format"
keywords:
  - apache xtable
  - xtable translation
  - table format converter
  - metadata translation
lastUpdated: 2026-05-29
---

## Apache XTable Translations

**Apache XTable Translations** refer to the metadata conversion processes executed by Apache XTable (formerly Microsoft OneTable). Because the three main open table formats (Apache Iceberg, Delta Lake, and Apache Hudi) all store data in standard Parquet files but track metadata differently, XTable acts as a translation layer. It translates the metadata representation bidirectionally, allowing engines that support only one format to read tables written in another.

### How XTable Translates Metadata

XTable reads the source metadata representation, maps it to an internal logical schema, and writes the target metadata files:

1.  **Parse Source**: XTable parses the source metadata (for example, reading an Iceberg metadata JSON and manifest files).
2.  **Map Schemas and Types**: Maps the source table schema, partition transforms, and file statistics to a common format.
3.  **Generate Target Metadata**: Writes the corresponding metadata files for the target formats (for example, writing a Delta log `_delta_log/000000.json` or Hudi metadata files) in the same directory.

```
       Source Format (e.g. Iceberg)
                   │
                   ▼
       ┌───────────────────────┐
       │   Apache XTable       │
       │   Translation Layer   │
       └───────────────────────┘
         /                   \
        ▼                     ▼
  Delta Lake Metadata    Hudi Metadata
```

Since the physical Parquet data files are not modified, this translation is fast and incurs no extra storage costs.

### Use Cases and Limitations

- **Multi-Engine Interoperability**: Let teams write data using Hudi for streaming ingestion while allowing BI users to query the same table as an Iceberg format using Dremio.
- **Write Restriction**: XTable is a read-only translation model for target systems. If an external engine writes to the translated Iceberg table, those updates are not synced back to the original Delta or Hudi logs unless you run a sync translation job again.
