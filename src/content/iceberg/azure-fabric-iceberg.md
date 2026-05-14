---
term: "Microsoft Fabric and Apache Iceberg"
description: "Microsoft Fabric supports Apache Iceberg tables through OneLake's open format integration and mirrored Fabric tables, enabling Iceberg-compatible engines to access Fabric data via the Iceberg REST Catalog while Fabric services read Iceberg data written by external engines."
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
lastUpdated: 2026-05-14
---

## Microsoft Fabric and Apache Iceberg

**Microsoft Fabric** is Microsoft's unified analytics platform that integrates data engineering, data warehousing, real-time analytics, and AI into a single SaaS service. Fabric supports Apache Iceberg through its **OneLake** storage layer — the universal, multi-cloud data lake that underpins all Fabric workloads.

Microsoft Fabric's Iceberg integration enables bi-directional interoperability: Fabric can read Iceberg tables written by external engines (Spark, Dremio, Flink), and external Iceberg-compatible engines can read Fabric tables exposed via the Iceberg REST Catalog API.

## OneLake: The Fabric Storage Foundation

**OneLake** is Fabric's centralized, multi-cloud data lake storage built on Azure Data Lake Storage Gen2. All Fabric experiences (Lakehouse, Data Warehouse, Real-Time Analytics) store their data in OneLake — and OneLake supports multiple open table formats including Delta Lake (native) and Apache Iceberg (via integration).

OneLake uses the concept of a **lake-centric** storage model: one lake per Fabric tenant, organized into workspaces and items.

## Fabric Lakehouse and Iceberg

Fabric's **Lakehouse** experience uses Delta Lake as its native format internally. However, Fabric supports exposing Lakehouse tables as Iceberg via:

### Iceberg API Endpoint

Fabric exposes an Iceberg REST Catalog endpoint for OneLake data:

```
Endpoint: https://api.fabric.microsoft.com/v1/workspaces/{workspace-id}/lakehouses/{lakehouse-id}/tables/iceberg

Authentication: Azure AD (Entra ID) bearer token
```

External engines connect via the REST Catalog:

```python
# PyIceberg: connect to Fabric's Iceberg API
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "fabric",
    **{
        "type": "rest",
        "uri": "https://api.fabric.microsoft.com/v1/workspaces/abc-123/lakehouses/def-456/tables/iceberg",
        "token": "<azure-entra-id-token>",
    }
)

# List and access tables
for table_id in catalog.list_tables("default"):
    print(table_id)
```

### Reading External Iceberg in Fabric

Fabric Lakehouse can read externally-written Iceberg tables (Spark, Dremio, Flink) stored in Azure Data Lake Storage:

1. Mount the ADLS container in Fabric as an external data source.
2. Create a Fabric shortcut to the Iceberg table location.
3. Fabric reads the Iceberg metadata and presents the table in the Lakehouse UI.

## Fabric Mirrored Databases

**Mirroring** in Fabric creates real-time replicas of operational databases (Azure SQL, PostgreSQL, MongoDB) as Delta/Iceberg tables in OneLake. Mirrored data becomes accessible to Iceberg-compatible engines via the Iceberg API endpoint.

This pattern is powerful for operational analytics: production database → Fabric mirroring → OneLake (Iceberg) → Dremio/Trino analytics.

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
