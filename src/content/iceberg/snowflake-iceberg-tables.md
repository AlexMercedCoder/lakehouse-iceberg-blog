---
term: "Snowflake Iceberg Tables"
metaTitle: "Snowflake Iceberg Tables: Catalog Options and Setup"
description: "Snowflake Iceberg tables keep Parquet data and Iceberg metadata in your own cloud storage. Compare Snowflake and external catalogs, refresh, and engine access."
category: "Engines & Integrations"
relatedTerms:
  - "apache-polaris-catalog"
  - "iceberg-rest-catalog"
  - "iceberg-table-format"
  - "snowflake-open-catalog"
  - "what-is-apache-iceberg"
keywords:
  - snowflake iceberg tables
  - snowflake iceberg external volume
  - snowflake open table format
  - snowflake iceberg integration
  - snowflake iceberg cost
lastUpdated: 2026-10-15
---

## Snowflake Iceberg Tables

A Snowflake Iceberg table is a Snowflake table whose Parquet data and Iceberg metadata live in Iceberg format, usually in your own cloud storage through an external volume. Snowflake can act as the catalog (full read and write) or use an external Iceberg REST catalog through a catalog integration.

**Snowflake Iceberg Tables** is a Snowflake feature that allows organizations to store Apache Iceberg data in **their own object storage** (Amazon S3, Azure ADLS, or Google Cloud Storage) while using Snowflake as the query engine. Unlike traditional Snowflake tables (where data is stored in Snowflake's proprietary internal storage), Iceberg Tables provide data portability and cross-engine access.

This is a significant architectural shift: with a customer-managed external volume, your cloud provider bills storage directly instead of Snowflake, Snowflake still provides the SQL engine, and other engines (Spark, Dremio, Trino, DuckDB) can access the same data.

## Key Concepts

### External Volumes

Snowflake Iceberg Tables require an **external volume**: a Snowflake object that represents a connection to customer-managed object storage. The external volume specifies the cloud storage location, credentials, and access permissions.

```sql
-- Create an external volume pointing to S3
CREATE EXTERNAL VOLUME my_iceberg_storage
  STORAGE_LOCATIONS = (
    (
      NAME = 'us-east-1'
      STORAGE_PROVIDER = 'S3'
      STORAGE_BASE_URL = 's3://my-lakehouse-bucket/iceberg-warehouse/'
      STORAGE_AWS_ROLE_ARN = 'arn:aws:iam::123456789:role/snowflake-iceberg-role'
    )
  );
```

### Snowflake-Managed vs. Externally-Managed

Snowflake Iceberg Tables come in two flavors:

**Snowflake-managed Iceberg Tables** (`CATALOG = 'SNOWFLAKE'`): Snowflake manages the Iceberg metadata while storing data in the external volume (or in Snowflake storage). External engines can read these tables through the Snowflake Horizon Catalog Iceberg REST API, and Snowflake documents write support from external engines with restrictions (for example, no equality deletes).

**Externally-managed Iceberg Tables**: Another catalog (such as Apache Polaris, Dremio Catalog, or AWS Glue) manages the Iceberg metadata, and Snowflake connects through a catalog integration. Snowflake can query these tables and, for v2 and v3 tables in a remote Iceberg REST catalog, write to them too. Set `AUTO_REFRESH = TRUE` so Snowflake polls the catalog for new snapshots. A catalog-linked database can sync an entire remote catalog's namespaces and tables automatically.

## Creating a Snowflake-Managed Iceberg Table

```sql
-- Create an Iceberg table stored on the external volume
CREATE OR REPLACE ICEBERG TABLE db.orders (
    order_id    NUMBER(38,0),
    customer_id NUMBER(38,0),
    total       FLOAT,
    order_date  DATE,
    status      VARCHAR(50)
)
CATALOG = 'SNOWFLAKE'              -- Snowflake manages metadata
EXTERNAL_VOLUME = 'my_iceberg_storage'
BASE_LOCATION = 'orders/';        -- Sub-path within the external volume

-- Query it like any Snowflake table
SELECT customer_id, SUM(total) as revenue
FROM db.orders
WHERE order_date >= '2026-01-01'
GROUP BY customer_id;
```

## Reading Externally-Managed Iceberg Tables in Snowflake

```sql
-- Register an externally-written Iceberg table (e.g., Spark-written)
CREATE OR REPLACE ICEBERG TABLE db.events
EXTERNAL_VOLUME = 'my_iceberg_storage'
CATALOG = 'my_rest_catalog_int'   -- Name of your catalog integration
CATALOG_TABLE_NAME = 'events'     -- Name in the external catalog
CATALOG_NAMESPACE = 'analytics'
AUTO_REFRESH = TRUE;              -- Poll the catalog for new snapshots

-- Or refresh on demand
ALTER ICEBERG TABLE db.events REFRESH;

-- Then query as normal
SELECT * FROM db.events WHERE event_date >= '2026-05-14';
```

## Snowflake Open Catalog (Apache Polaris)

Snowflake also offers **Snowflake Open Catalog**: a managed Apache Polaris (REST Catalog) service that provides multi-engine catalog access. Open Catalog is built on Apache Polaris, which Snowflake open-sourced in 2024 and contributed to the Apache Software Foundation, with Dremio among the early contributors.

With Snowflake Open Catalog:

- Snowflake, Spark, Flink, Dremio, Trino, and PyIceberg can all connect to the same catalog via the Iceberg REST Catalog API.
- Tables written by any engine are immediately visible to all others.
- Governance (RBAC) is enforced at the catalog level.

## Iceberg Table Interoperability with Dremio

A common architecture combines Snowflake and Dremio on the same Iceberg tables via a shared Apache Polaris catalog:

```
Apache Polaris Catalog (Open Catalog)
  ├── Dremio → reads/writes Iceberg, serves AI Analytics
  ├── Snowflake → reads/writes Iceberg, serves BI
  ├── Spark → runs batch ETL on Iceberg
  └── PyIceberg → ML feature engineering
```

All engines see the same data, the same schema, the same snapshots: with governance enforced at the catalog layer.

## Cost Advantages of Snowflake Iceberg Tables

The primary business driver for Snowflake Iceberg Tables:

| Storage Type                     | Who bills storage   | Portability                      |
| -------------------------------- | ------------------- | -------------------------------- |
| Standard Snowflake table         | Snowflake           | None (proprietary)               |
| Iceberg table, external volume   | Your cloud provider | Full (open Iceberg format)       |
| Iceberg table, Snowflake storage | Snowflake           | Iceberg format, Snowflake-hosted |

Snowflake still bills compute, cloud services, and cross-region or cross-cloud transfer. The bigger gain is usually portability: one copy of data that other engines can use without exports. Compare your own storage contracts before assuming a price difference.

## Current Limitations

- External engine writes to Snowflake-managed tables carry restrictions (no equality deletes, no CTAS from an external engine, no writes to shared tables).
- Snowflake does not support row-level equality deletes; position deletes (v2) and deletion vectors (v3) work.
- Fail-safe is not available for tables on a customer-managed external volume, and Snowflake does not delete orphan files for Snowflake-managed Iceberg tables.
- Externally managed tables do not support cloning, streams, or clustering.
