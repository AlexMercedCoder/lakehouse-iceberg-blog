---
term: "Delta Lake UniForm Metadata"
description: "A features in Delta Lake (Universal Format) that automatically generates Apache Iceberg metadata alongside Delta logs during write operations."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "apache-xtable-translations"
  - "iceberg-table-format"
keywords:
  - delta uniform
  - delta lake uniform
  - delta iceberg metadata
  - uniform metadata
lastUpdated: 2026-05-29
---

## Delta Lake UniForm Metadata

**Delta Lake UniForm Metadata** refers to the Iceberg-compliant metadata files generated automatically by Delta Lake's Universal Format (UniForm) writer. UniForm allows Databricks and other Delta-compatible writers to generate both Delta logs and Iceberg metadata directories simultaneously. This design enables query engines that only support Iceberg to query Delta tables without manual metadata translation.

### Read and Write Path Flow

When an engine writes to a UniForm-enabled table:

1.  **Write Parquet Files**: The engine writes new table rows as standard Parquet files.
2.  **Commit Delta Log**: The engine commits the transaction to the Delta log folder (`_delta_log/`).
3.  **Generate Iceberg Metadata**: A background catalog process parses the new Delta commit and generates the matching Iceberg metadata file (`.metadata.json`), manifest list, and manifests.
4.  **Register Pointers**: The generated Iceberg metadata paths are registered in the metadata catalog (such as Unity Catalog or Polaris).

Because both table representations point to the same underlying S3 or ADLS Parquet files, there is zero data replication.

### Technical Limitations

- **Write Delegation**: All write operations (DML) must go through Delta Lake writers. External engines query the tables as read-only Iceberg formats.
- **Feature Support**: Advanced Iceberg features (like v2 row-level delete files or specific partition transforms) may not map perfectly to Delta configurations, restricting compatibility to standard tables.
