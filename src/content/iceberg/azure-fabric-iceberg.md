---
term: "Microsoft Fabric and Apache Iceberg"
metaTitle: "Microsoft Fabric and Iceberg: How OneLake Interoperates"
description: "Microsoft Fabric stores tables as Delta Lake on Parquet by default and works with Apache Iceberg via OneLake metadata virtualization and an Iceberg REST API."
category: "Cloud-Specific Integrations"
relatedTerms:
  - "iceberg-rest-catalog"
  - "iceberg-table-format"
  - "databricks-iceberg"
  - "iceberg-catalog"
  - "what-is-apache-iceberg"
keywords:
  - microsoft fabric iceberg
  - fabric onelake iceberg
  - azure fabric open table format
  - fabric mirrored tables iceberg
  - microsoft fabric lakehouse iceberg
lastUpdated: 2026-10-15
---

## Microsoft Fabric and Apache Iceberg

**Microsoft Fabric** is Microsoft's unified analytics platform that integrates data engineering, data warehousing, real-time analytics, and AI into a single SaaS service. Fabric supports Apache Iceberg through its **OneLake** storage layer: the universal, multi-cloud data lake that underpins all Fabric workloads.

Microsoft Fabric's Iceberg integration enables bi-directional interoperability: Fabric can read Iceberg tables written by external engines (Spark, Dremio, Flink), and external Iceberg-compatible engines can read Fabric tables exposed via the Iceberg REST Catalog API.

## OneLake: The Fabric Storage Foundation

**OneLake** is Fabric's centralized, multi-cloud data lake storage built on Azure Data Lake Storage Gen2. All Fabric experiences (Lakehouse, Data Warehouse, Real-Time Analytics) store their data in OneLake. Delta Lake on Parquet is the default table format; Apache Iceberg is supported through metadata virtualization and the OneLake Iceberg REST endpoint. See [Microsoft Fabric OneLake](/iceberg/microsoft-fabric-onelake/) for the short answer.

OneLake uses the concept of a **lake-centric** storage model: one lake per Fabric tenant, organized into workspaces and items.

## Fabric Lakehouse and Iceberg

Fabric's **Lakehouse** and **Warehouse** write Delta Lake tables (Parquet data files plus a Delta log) by default. OneLake can generate virtual Iceberg metadata for those Delta tables, and it exposes them to Iceberg clients via:

### Iceberg API Endpoint

Fabric exposes an Iceberg REST Catalog endpoint for OneLake data:

```
Endpoint: https://onelake.table.fabric.microsoft.com/iceberg
Warehouse: <workspace-id>/<data-item-id>
Authentication: Microsoft Entra ID bearer token (Azure Storage audience)
```

The endpoint supports reading table metadata, credential vending, and creating and committing native Iceberg tables. Virtual Iceberg metadata generated for Delta tables is read-only; update those tables with a Delta writer. See Microsoft's [OneLake Iceberg metadata API](https://learn.microsoft.com/en-us/fabric/onelake/table-apis/iceberg-table-apis-overview) docs.

External engines connect via the REST Catalog:

```python
# PyIceberg: connect to Fabric's Iceberg API
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "fabric",
    **{
        "type": "rest",
        "uri": "https://onelake.table.fabric.microsoft.com/iceberg",
        "warehouse": "<workspace-id>/<data-item-id>",
        "token": "<entra-id-access-token>",
    }
)

# List and access tables
# Non-schema-enabled lakehouses expose a single "dbo" namespace
for table_id in catalog.list_tables("dbo"):
    print(table_id)
```

### Reading External Iceberg in Fabric

Fabric Lakehouse can read externally written Iceberg tables (Spark, Dremio, Flink, Snowflake) stored in OneLake, ADLS, Amazon S3, Google Cloud Storage, or S3-compatible storage:

1. In the lakehouse, create a table shortcut in the `Tables` area.
2. Point the shortcut at the Iceberg table folder (the folder that contains `metadata` and `data`).
3. OneLake generates virtual Delta metadata, and the table appears as a Delta table across Fabric.

Microsoft documents limits for this path: Parquet data files only, identity and temporal partition transforms, a single partition spec, no column renames on the source, and no equality deletes. See [Use Iceberg tables with OneLake](https://learn.microsoft.com/en-us/fabric/onelake/onelake-iceberg-tables).

## Fabric Mirrored Databases

**Mirroring** in Fabric continuously replicates operational databases (such as Azure SQL Database and Azure Database for PostgreSQL) into OneLake as Delta tables. With Delta to Iceberg virtualization enabled, Iceberg readers can read mirrored tables too.

This pattern works for operational analytics: production database → Fabric mirroring → OneLake (Delta, with virtual Iceberg metadata) → Iceberg-compatible engines.

## Azure + Iceberg + Dremio Architecture

A common Azure Fabric + Dremio pattern:

```
Fabric Lakehouse (OneLake/ADLS)
  ├── Mirrored operational data (via Fabric mirroring)
  ├── Spark-processed Iceberg tables
  └── External Iceberg tables (written by Flink/Spark)

Dremio (connected to ADLS + Fabric Iceberg API)
  ├── Federates across Fabric Lakehouse + other sources
  ├── AI Semantic Layer over Fabric Iceberg tables
  └── AI Agent for natural language analytics
```

## Fabric vs. Direct Azure + Iceberg

| Aspect               | Microsoft Fabric                        | Direct Azure (ADLS + Polaris)  |
| -------------------- | --------------------------------------- | ------------------------------ |
| Setup complexity     | Low (SaaS)                              | Higher (self-managed)          |
| Open format control  | Partial (Delta-native, Iceberg via API) | Full (pure Iceberg)            |
| Multi-engine interop | Via Iceberg API (limited)               | Full (REST Catalog standard)   |
| AI integration       | Copilot (Fabric-specific)               | Dremio AI Semantic Layer       |
| Cost model           | Fabric capacity units                   | Azure + Polaris/Dremio pricing |
| Best for             | Microsoft-first organizations           | Open multi-engine lakehouse    |

For organizations already committed to the Microsoft Azure ecosystem, Fabric provides a convenient Iceberg integration path. For multi-cloud or open ecosystem requirements, a direct Apache Iceberg deployment with Apache Polaris and Dremio provides more control and broader interoperability.
