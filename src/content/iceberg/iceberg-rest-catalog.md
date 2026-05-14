---
term: "Iceberg REST Catalog"
description: "The Iceberg REST Catalog is a standardized HTTP API specification for Apache Iceberg catalog operations, enabling any engine or client to discover and access Iceberg tables from any compliant catalog implementation through a vendor-neutral protocol."
category: "Catalogs"
relatedTerms:
  - "iceberg-catalog"
  - "apache-polaris-catalog"
  - "project-nessie"
  - "aws-glue-catalog"
  - "dremio-apache-iceberg"
keywords:
  - iceberg rest catalog
  - iceberg rest api catalog
  - iceberg catalog specification
  - rest catalog api
  - iceberg engine interoperability
lastUpdated: 2026-05-14
---

## Iceberg REST Catalog

The **Iceberg REST Catalog** is a standardized HTTP REST API specification that defines how query engines, ETL tools, and client libraries communicate with Apache Iceberg catalogs. It is one of the most important developments in the Iceberg ecosystem — transforming catalog access from a balkanized set of engine-specific integrations into a single, universal protocol.

Before the REST Catalog spec, each engine had its own catalog connectors: Spark had a Hive Metastore connector, a JDBC connector, a custom Nessie connector, and so on. Each new catalog required new connector code in every engine. The REST Catalog solves this with a single protocol: implement the REST API once, and every compliant engine connects automatically.

## The REST Catalog API

The Iceberg REST Catalog API is an OpenAPI-defined HTTP service with endpoints for:

### Catalog Operations

| Endpoint                                     | Description                                        |
| -------------------------------------------- | -------------------------------------------------- |
| `GET /v1/config`                             | Get catalog configuration and OAuth token endpoint |
| `GET /v1/{prefix}/namespaces`                | List namespaces                                    |
| `POST /v1/{prefix}/namespaces`               | Create a namespace                                 |
| `GET /v1/{prefix}/namespaces/{namespace}`    | Get namespace properties                           |
| `DELETE /v1/{prefix}/namespaces/{namespace}` | Drop a namespace                                   |

### Table Operations

| Endpoint                                                    | Description                    |
| ----------------------------------------------------------- | ------------------------------ |
| `GET /v1/{prefix}/namespaces/{namespace}/tables`            | List tables                    |
| `POST /v1/{prefix}/namespaces/{namespace}/tables`           | Create a table                 |
| `GET /v1/{prefix}/namespaces/{namespace}/tables/{table}`    | Load table (returns metadata)  |
| `POST /v1/{prefix}/namespaces/{namespace}/tables/{table}`   | Commit updates (atomic commit) |
| `DELETE /v1/{prefix}/namespaces/{namespace}/tables/{table}` | Drop a table                   |
| `HEAD /v1/{prefix}/namespaces/{namespace}/tables/{table}`   | Check table existence          |

### View Operations (Spec extension)

Supports creating, loading, and committing Iceberg views.

### Authentication

The REST Catalog spec uses **OAuth2** with bearer tokens. Clients request a token from the catalog's token endpoint, then include it as a `Bearer` token in subsequent requests.

## Credential Vending

One of the most powerful features of the REST Catalog spec is **credential vending**. Rather than requiring clients to hold long-lived object storage credentials (AWS IAM keys, Azure service principal secrets), the catalog vends **short-lived, scoped credentials** for specific tables:

1. Client requests to load a table (e.g., `GET /v1/.../tables/orders`).
2. Catalog authenticates the client, checks authorization.
3. Catalog returns the table metadata AND short-lived object storage credentials scoped to the table's storage location.
4. Client uses these temporary credentials to read/write data files in object storage.

Benefits:

- Clients never hold long-lived credentials.
- Credentials are scoped to only the data they need access to.
- Credential rotation is handled by the catalog, transparent to clients.
- Security teams enforce data access at the catalog level — not per-engine.

## Configuration in Common Engines

### Apache Spark

```python
spark = SparkSession.builder \
    .config("spark.sql.catalog.my_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.my_catalog.type", "rest") \
    .config("spark.sql.catalog.my_catalog.uri", "https://my-catalog.example.com") \
    .config("spark.sql.catalog.my_catalog.credential", "my-client-id:my-client-secret") \
    .getOrCreate()
```

### PyIceberg (Python)

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "my_catalog",
    **{
        "type": "rest",
        "uri": "https://my-catalog.example.com",
        "credential": "my-client-id:my-client-secret",
    }
)
```

### Apache Flink

```yaml
catalog:
  my_catalog:
    type: iceberg
    catalog-type: rest
    uri: https://my-catalog.example.com
    credential: my-client-id:my-client-secret
```

## Compliant Catalog Implementations

Any service that implements the Iceberg REST Catalog spec is a valid Iceberg catalog. Major implementations include:

| Catalog                    | Notes                                                                    |
| -------------------------- | ------------------------------------------------------------------------ |
| **Apache Polaris**         | Open-source reference implementation, co-created by Dremio and Snowflake |
| **Project Nessie**         | Adds Git-like branching on top of the REST spec                          |
| **AWS Glue**               | Managed AWS service with REST Catalog support                            |
| **Dremio Open Catalog**    | Powered by Apache Polaris, included in Dremio Cloud and Enterprise       |
| **Snowflake Open Catalog** | Snowflake's managed REST catalog offering                                |
| **Tabular**                | Commercial catalog-as-a-service                                          |
| **Gravitino**              | Apache-governed metadata service with REST Catalog support               |

## Why the REST Catalog Changed Everything

Before the REST Catalog, adding Iceberg support to a new engine meant implementing connectors for every possible catalog type (Hive Metastore, JDBC, Nessie, etc.). This created a combinatorial integration problem.

After the REST Catalog: implement the REST client once, and every compliant catalog works automatically. This has dramatically accelerated the velocity of engine adoption — tools like DuckDB, Apache Arrow Flight SQL, and various AI agent frameworks can now connect to Iceberg catalogs with minimal effort.

The REST Catalog is the primary reason that "Iceberg everywhere" is now a realistic architecture, not just an aspiration.
