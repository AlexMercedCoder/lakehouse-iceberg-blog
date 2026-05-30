---
term: "Snowflake Open Catalog"
description: "Snowflake Open Catalog is a managed Apache Polaris service offered by Snowflake that provides a vendor-neutral Iceberg REST Catalog for multi-engine lakehouse architectures, built on the same Apache Polaris open-source project co-created by Dremio and Snowflake."
category: "Catalogs"
relatedTerms:
  - "apache-polaris-catalog"
  - "iceberg-rest-catalog"
  - "snowflake-iceberg-tables"
  - "iceberg-catalog"
  - "dremio-apache-iceberg"
keywords:
  - snowflake open catalog
  - snowflake polaris catalog
  - snowflake iceberg catalog
  - snowflake rest catalog
  - snowflake apache polaris
lastUpdated: 2026-05-14
---

## Snowflake Open Catalog

**Snowflake Open Catalog** is Snowflake's managed catalog service built on **Apache Polaris**: the open-source Iceberg REST Catalog implementation that Snowflake co-created with Dremio and donated to the Apache Software Foundation.

Open Catalog provides a vendor-neutral, multi-engine Iceberg REST Catalog that enables any Iceberg-compatible engine to discover and access Iceberg tables managed within a Snowflake-hosted Polaris instance: without requiring a Snowflake account or Snowflake-specific tooling.

## Origin: The Polaris Connection

Apache Polaris was co-created by **Dremio** and **Snowflake** as the reference implementation of the Iceberg REST Catalog specification, then donated to the Apache Software Foundation for vendor-neutral governance. Both Dremio and Snowflake independently productized their managed versions:

- **Dremio**: Open Catalog capability integrated into Dremio Cloud and Dremio Enterprise (the Agentic Lakehouse platform).
- **Snowflake**: Snowflake Open Catalog: a standalone managed Polaris service.

Both are built on the same Apache Polaris codebase and implement the same Iceberg REST Catalog specification, making them interoperable from the perspective of client engines.

## What Snowflake Open Catalog Provides

### Multi-Engine Catalog Access

Any engine that supports the Iceberg REST Catalog protocol can connect to Snowflake Open Catalog:

- Snowflake SQL
- Apache Spark
- Apache Flink
- Trino
- Dremio
- PyIceberg
- DuckDB

### Namespace and Table Management

```python
# PyIceberg: connect to Snowflake Open Catalog
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "snowflake_open_catalog",
    **{
        "type": "rest",
        "uri": "https://my-account.snowflakecomputing.com/polaris/api/catalog",
        "credential": "client-id:client-secret",
        "warehouse": "my-warehouse",
    }
)

# Create namespace and table
catalog.create_namespace("analytics")
catalog.create_table(
    identifier=("analytics", "orders"),
    schema=...,
    location="s3://my-bucket/warehouse/analytics/orders/",
)
```

### Fine-Grained Access Control

Open Catalog supports the full Polaris RBAC model:

- Catalog-level, namespace-level, and table-level privileges.
- Principal (user/service) management.
- Credential vending: engines receive short-lived, scoped object storage credentials.

### Multi-Catalog Architecture

Open Catalog supports running multiple catalogs within a single Polaris server, enabling tenant isolation and separation of concerns between different data domains.

## Snowflake Open Catalog vs. Dremio Open Catalog

Both are built on Apache Polaris and implement the same REST spec. Key differences are in how they are deployed and what they integrate with:

| Aspect                | Snowflake Open Catalog         | Dremio Open Catalog             |
| --------------------- | ------------------------------ | ------------------------------- |
| Built on              | Apache Polaris                 | Apache Polaris                  |
| Integration           | Snowflake ecosystem            | Dremio Agentic Lakehouse        |
| AI Semantic Layer     | No                             | Yes (Dremio AI Semantic Layer)  |
| AI Agent              | No                             | Yes (Dremio AI Agent)           |
| Query engine included | Snowflake SQL                  | Dremio Intelligent Query Engine |
| Standalone            | Yes                            | Integrated (part of Dremio)     |
| Best for              | Snowflake-centric multi-engine | AI analytics, Agentic Lakehouse |

## Using Snowflake Open Catalog with Apache Spark

```python
spark = SparkSession.builder \
    .config("spark.sql.catalog.open_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.open_catalog.type", "rest") \
    .config("spark.sql.catalog.open_catalog.uri",
            "https://my-account.snowflakecomputing.com/polaris/api/catalog") \
    .config("spark.sql.catalog.open_catalog.credential", "client-id:client-secret") \
    .config("spark.sql.catalog.open_catalog.warehouse", "my-warehouse") \
    .getOrCreate()

spark.sql("SHOW NAMESPACES IN open_catalog").show()
spark.sql("SELECT * FROM open_catalog.analytics.orders LIMIT 10").show()
```

## The Shared Polaris Ecosystem

Because Snowflake Open Catalog and Dremio Open Catalog share the same Apache Polaris foundation and REST Catalog API, a table registered in one can be read by engines connected to the other: as long as the underlying object storage is accessible. This multi-catalog, multi-engine portability is the realization of the open lakehouse vision that led Dremio and Snowflake to co-create Polaris in the first place.
