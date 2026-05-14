---
term: "Apache Gravitino"
description: "Apache Gravitino is an open-source multi-source metadata hub that provides unified metadata management across heterogeneous data sources including Hive, Iceberg, JDBC, and file systems, implementing the Iceberg REST Catalog spec to enable Iceberg-compatible engines to access its managed catalogs."
category: "Catalogs"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-rest-catalog"
  - "iceberg-hive-metastore"
  - "apache-polaris-catalog"
  - "iceberg-multi-catalog"
keywords:
  - apache gravitino
  - gravitino iceberg catalog
  - gravitino metadata hub
  - unified metadata catalog
  - gravitino rest catalog
lastUpdated: 2026-05-14
---

## Apache Gravitino

**Apache Gravitino** (formerly Datastrato Gravitino) is an open-source metadata management platform that provides a unified catalog abstraction over heterogeneous data sources — Hive Metastore, Iceberg REST Catalog, JDBC databases, cloud storage file systems, and more. Gravitino presents a single API and management plane for metadata across all of these, making it a "meta-catalog" or metadata hub.

Gravitino was accepted into the Apache Software Foundation incubator and is rapidly gaining adoption as a vendor-neutral metadata layer for multi-source data architectures.

## What Gravitino Provides

### Unified Catalog API

Gravitino exposes a single REST API for creating, managing, and querying metadata across multiple catalog backends:

```
Gravitino Server
  ├── Iceberg REST Catalog (manages Iceberg tables)
  ├── Hive catalog (connects to existing HMS)
  ├── JDBC catalog (connects to PostgreSQL, MySQL)
  └── Fileset catalog (manages unstructured data in cloud storage)
```

A single Gravitino API call can create a namespace that spans multiple catalog backends, or provide a unified listing of all tables regardless of their storage format.

### Iceberg REST Catalog Compatibility

Gravitino implements the Iceberg REST Catalog specification, allowing Iceberg-compatible engines (Spark, Flink, Trino, Dremio, PyIceberg) to connect to Gravitino and query its managed Iceberg catalogs:

```python
# PyIceberg: connect to Gravitino's Iceberg REST endpoint
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "gravitino",
    **{
        "type": "rest",
        "uri": "http://gravitino-host:9001/api/iceberg/metalakes/my-metalake/catalogs/iceberg-catalog",
        "warehouse": "my-metalake/iceberg-catalog",
    }
)

# Standard Iceberg operations work transparently
tables = catalog.list_tables("analytics")
table = catalog.load_table("analytics.orders")
```

### Gravitino Metalake

The top-level organizational unit in Gravitino is the **metalake** — a tenant boundary that contains multiple catalogs. A Gravitino deployment can serve multiple metalakes for different organizations or environments:

```
Gravitino Server
  ├── Metalake: production
  │   ├── Iceberg catalog: lakehouse
  │   ├── Hive catalog: legacy_hive
  │   └── JDBC catalog: operational_db
  └── Metalake: development
      ├── Iceberg catalog: dev_lakehouse
      └── JDBC catalog: dev_db
```

## Connecting Gravitino to Iceberg Storage

```yaml
# Gravitino configuration: creating an Iceberg catalog
catalogs:
  - name: lakehouse
    type: lakehouse-iceberg
    provider: lakehouse-iceberg
    properties:
      catalog-backend: rest # or hive, jdbc
      uri: https://my-polaris.example.com
      warehouse: s3://my-bucket/warehouse/
```

Or using the Gravitino REST API:

```bash
curl -X POST http://gravitino-host:9001/api/metalakes/production/catalogs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "lakehouse",
    "type": "RELATIONAL",
    "provider": "lakehouse-iceberg",
    "properties": {
      "catalog-backend": "hive",
      "uri": "thrift://hms-host:9083",
      "warehouse": "s3://my-bucket/warehouse/"
    }
  }'
```

## Gravitino Use Cases

### Legacy Hive + Modern Iceberg Unification

Organizations with both legacy HMS-managed Hive tables and new Iceberg tables can present both through a single Gravitino API:

```python
# Both Hive and Iceberg tables visible through Gravitino
gravitino_catalog = load_catalog("gravitino", ...)

# List all tables (Hive and Iceberg)
all_tables = gravitino_catalog.list_tables("analytics")
for table in all_tables:
    print(table)  # includes both Hive and Iceberg tables
```

### Multi-Format Table Discovery

Data engineers can use Gravitino as a discovery tool to find tables regardless of format, then route queries to the appropriate engine.

### Governance Layer

Gravitino's centralized metadata view enables governance teams to see all tables, schemas, and properties across all catalog types — without needing to connect to each catalog separately.

## Gravitino vs. Apache Polaris

| Aspect              | Apache Gravitino                        | Apache Polaris                             |
| ------------------- | --------------------------------------- | ------------------------------------------ |
| Primary use         | Multi-source metadata hub               | Iceberg-native REST Catalog                |
| Iceberg support     | Via REST catalog bridge                 | Native Iceberg REST Catalog                |
| Non-Iceberg sources | Yes (Hive, JDBC, filesystems)           | No (Iceberg only)                          |
| Credential vending  | Limited                                 | Full (per-table scoped credentials)        |
| RBAC                | Limited (evolving)                      | Full (principal, role, privilege model)    |
| Best for            | Unified metadata across diverse sources | Production multi-engine Iceberg governance |

Gravitino is well-suited for organizations that need a unified metadata view over diverse, heterogeneous data sources including Iceberg. Polaris is the right choice for organizations building a pure Iceberg lakehouse that needs full credential vending, fine-grained RBAC, and maximum performance.
