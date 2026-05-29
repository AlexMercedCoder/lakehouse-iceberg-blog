---
term: "Dremio Physical Datasets (PDS)"
description: "Dremio Physical Datasets (PDS) are physical tables, views, or raw file directories registered from external data sources that form the base layer of the Dremio catalog."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-virtual-datasets-vds"
  - "dremio-spaces"
  - "dremio-apache-iceberg"
keywords:
  - physical datasets pds
  - dremio pds
  - physical tables dremio
  - data sources registration dremio
  - catalog source tables
lastUpdated: 2026-05-29
---

## Dremio Physical Datasets (PDS)

**Dremio Physical Datasets (PDS)** represent raw, physical data assets registered from connected data sources. Unlike Virtual Datasets (VDS), which are logical SQL views, a PDS points to physical files, database tables, or views hosted in an external system.

PDS files and tables form the foundation of Dremio's data catalog, serving as the source inputs from which data analysts and engineers build the virtualized semantic layer.

## Types of Physical Datasets

Dremio categorizes physical datasets based on the type of data source they originate from:

- **File-Based Datasets**: Directories or individual files stored in cloud object storage (such as Amazon S3, Azure Data Lake Storage, or Google Cloud Storage) or distributed filesystems (HDFS). These include files formatted as Apache Parquet, Apache Iceberg, Delta Lake, CSV, JSON, or ORC.
- **Database Tables and Views**: Relational database objects from systems connected via JDBC or native connectors (for example, Snowflake, Google BigQuery, PostgreSQL, Oracle, or Microsoft SQL Server).
- **NoSQL Collections**: Document-based collections stored in systems like MongoDB or Elasticsearch.

## Formatting Folders as PDS

For file-based sources, Dremio allows data teams to register directory structures as physical tables through a process called formatting. If a folder contains multiple CSV, JSON, or Parquet files sharing a uniform schema, an administrator can format the folder:

```
Raw Storage Path: s3://my-bucket/logs/2026/05/
→ Dremio Action: Format folder '05' as a Parquet Physical Dataset.
→ Result: Dremio treats the entire folder as a single table (PDS), scanning all files in the directory when the PDS is queried.
```

For open table formats like Apache Iceberg and Delta Lake, Dremio automatically detects the table metadata during storage folder scans, registering them as PDS instances without requiring manual formatting.

## Metadata Management on PDS

Because a PDS represents external data, Dremio must understand its structure to plan queries efficiently. The coordinator node performs three metadata tasks on a PDS:

1.  **Schema Learning**: Reads file footers or database catalogs to map columns, data types, and nesting hierarchies.
2.  **Partition Discovery**: Identifies partition structures (such as year/month folders in S3 or Iceberg partition specifications) to enable partition pruning.
3.  **Statistics Collection**: Collects min/max bounds, null counts, and column cardinalities (or retrieves them directly from Iceberg Puffin files) to inform Calcite cost-based optimization.
