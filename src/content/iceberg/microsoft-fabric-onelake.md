---
term: "Microsoft Fabric OneLake"
metaTitle: "OneLake Default Storage Format: Delta Lake on Parquet"
description: "OneLake's default table format is Delta Lake with Parquet data files. Fabric Lakehouse and Warehouse write Delta tables; OneLake exposes them to Iceberg too."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "delta-lake-uniform-metadata"
  - "apache-xtable-translations"
  - "azure-fabric-iceberg"
  - "iceberg-vs-delta-lake"
keywords:
  - onelake
  - microsoft fabric onelake
  - onelake default storage format
  - onelake delta lake parquet
  - onelake iceberg
  - onelake shortcuts
lastUpdated: 2026-10-15
---

## Microsoft Fabric OneLake

**The default storage format for Microsoft Fabric's OneLake is Delta Lake, with data stored in Apache Parquet files.** Fabric Lakehouse tables, Fabric Data Warehouse tables, and data ingested through pipelines, dataflows, and eventstreams are all written as Delta tables by default, and every Fabric engine (Spark, the SQL analytics endpoint, Power BI Direct Lake) reads that same Delta copy. OneLake can also make those tables readable as Apache Iceberg, and it can present Iceberg tables to Fabric as Delta, through a feature Microsoft calls metadata virtualization.

_Reviewed October 15, 2026 against Microsoft Learn: [Delta Lake table format interoperability](https://learn.microsoft.com/en-us/fabric/fundamentals/delta-lake-interoperability), [Use Iceberg tables with OneLake](https://learn.microsoft.com/en-us/fabric/onelake/onelake-iceberg-tables), and [OneLake Iceberg metadata API](https://learn.microsoft.com/en-us/fabric/onelake/table-apis/iceberg-table-apis-overview)._

**Microsoft Fabric OneLake** is the single, tenant-wide logical data lake behind every Fabric workload, often described as "OneDrive for data." It is built on Azure Data Lake Storage Gen2 APIs and organized into workspaces and data items (lakehouses, warehouses, databases).

### Quick answers

- **Default table format:** Delta Lake. Microsoft's docs state that Delta Lake is the standard table format for analytics in Fabric and that ingested data is stored as Delta tables by default.
- **File format underneath:** Parquet. Delta Lake is a transaction log (`_delta_log`) over Parquet data files.
- **Iceberg:** supported as an interoperability format, not the default. Fabric engines work on Iceberg tables through virtual Delta metadata, and Iceberg engines read Fabric's Delta tables through virtual Iceberg metadata.

### Iceberg Integration Scope

OneLake supports Apache Iceberg in three ways:

- **Delta Lake to Iceberg virtualization**: For Delta tables in the `Tables` section of a lakehouse or other data item, OneLake generates Iceberg metadata in a `metadata` folder next to the Delta log, so Iceberg readers can query the table without copying data. The generated metadata is Iceberg V2, Parquet data files are required, and a `latest_conversion_log.txt` file records each conversion.
- **Iceberg table shortcuts (Iceberg to Delta Lake)**: You can create a table shortcut in a lakehouse's `Tables` area that points at an Iceberg table folder in OneLake, ADLS, Amazon S3, Google Cloud Storage, or S3-compatible storage. OneLake generates a virtual `_delta_log` so the table appears as a Delta table across Fabric. Microsoft documents limits: identity and temporal partition transforms only, no column renames on the source, no equality deletes, a single partition spec, and fewer than 5,000 commits.
- **Iceberg REST Catalog endpoint**: OneLake exposes an Iceberg REST Catalog API at `https://onelake.table.fabric.microsoft.com/iceberg`. It supports listing namespaces and tables, loading table metadata, credential vending, and creating and committing native Iceberg tables. Virtual Iceberg metadata generated for Delta tables is read-only through this endpoint; you update those tables with a Delta writer. Microsoft's client examples cover PyIceberg, Snowflake, and DuckDB.

### Snowflake Interoperability

Microsoft documents a Snowflake workflow in both directions: Snowflake can write Iceberg tables into OneLake that Fabric then reads through a table shortcut, and Snowflake can read the virtual Iceberg metadata OneLake generates for Fabric Delta tables.

For how Fabric fits into a broader Iceberg architecture, see [Microsoft Fabric and Apache Iceberg](/iceberg/azure-fabric-iceberg/).
