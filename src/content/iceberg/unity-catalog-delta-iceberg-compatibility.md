---
term: "Unity Catalog Delta-Iceberg Compatibility"
description: "The capabilities in Unity Catalog that allow Delta Lake tables to be read as Apache Iceberg tables by generating compliant metadata on the fly or exposing them via the Iceberg REST API."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "delta-lake-uniform-metadata"
  - "apache-xtable-translations"
  - "iceberg-rest-catalog"
keywords:
  - unity catalog iceberg
  - unity catalog delta compatibility
  - delta uniform unity
  - databricks iceberg compatibility
lastUpdated: 2026-05-29
---

## Unity Catalog Delta-Iceberg Compatibility

**Unity Catalog Delta-Iceberg Compatibility** refers to the capabilities in Databricks Unity Catalog that bridge the gap between Delta Lake and Apache Iceberg table formats. Rather than forcing organizations to migrate tables from Delta to Iceberg (which requires copying physical files and rewriting history), Unity Catalog translates table metadata. This allows multi-engine lakehouses to query Delta tables as if they were native Iceberg tables.

### Dual-Format Exposure via UniForm

The core mechanism of this compatibility is Delta Lake Universal Format (UniForm). When UniForm is active on a table, the writer engine writes the physical data as standard Parquet files. At the same time, the catalog updates both the Delta transaction log and the Iceberg metadata folders (generating manifest lists and manifest files):

```
       Write Operation (Spark/Databricks)
                    │
                    ▼
          ┌───────────────────┐
          │  Parquet Data     │
          │  Files (Shared)   │
          └───────────────────┘
            ▲               ▲
    Reads Delta Log   Reads Iceberg Metadata
```

Because both formats reference the exact same underlying Parquet files, there is no storage duplication.

### Exposing Tables via Iceberg REST API

In addition to writing metadata, Unity Catalog can act as a standard Iceberg REST Catalog. When external engines (such as Dremio or Snowflake) connect to Unity Catalog's REST endpoint, the catalog translates Delta table metadata into Iceberg REST-compliant JSON responses. The external engines query these tables using their native Iceberg catalog connectors, completely unaware that the source tables were written in Delta format.

### Features and Constraints

- **Zero Copying**: Enables querying across engines without duplicating data files.
- **Write Delegation**: Writers must still use engines that write to the primary Delta format (such as Databricks). External engines have read-only access when querying through the translated Iceberg catalog views.
