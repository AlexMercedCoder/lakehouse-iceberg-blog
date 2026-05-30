---
term: "Snowflake Iceberg Tables"
description: "Snowflake Iceberg Tables let organizations store Iceberg data in their own object storage (external volumes) while using Snowflake as the query engine and Snowflake Open Catalog (powered by Apache Polaris) as the catalog, enabling cost control and cross-engine interoperability."
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
lastUpdated: 2026-05-14
---

## Snowflake Iceberg Tables

**Snowflake Iceberg Tables** is a Snowflake feature that allows organizations to store Apache Iceberg data in **their own object storage** (Amazon S3, Azure ADLS, or Google Cloud Storage) while using Snowflake as the query engine. Unlike traditional Snowflake tables (where data is stored in Snowflake's proprietary internal storage), Iceberg Tables provide data portability and cross-engine access.

This is a significant architectural shift: organizations can avoid Snowflake's storage costs (which are higher than raw object storage) while still leveraging Snowflake's SQL capabilities and ecosystem: and enabling other engines (Spark, Dremio, Trino, DuckDB) to access the same data.

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

**Snowflake-managed Iceberg Tables**: Snowflake manages the Iceberg metadata (creates snapshots, updates manifests) while storing data files in the external volume. Snowflake is the exclusive writer; other engines can read but not write.

**Externally-managed Iceberg Tables**: Another system (Spark, Dremio, Flink) manages the Iceberg metadata; Snowflake reads the table as an external reader. Snowflake can query but not write. Snowflake refreshes its metadata view when you call `SYSTEM$REFRESH_EXTERNAL_TABLE`.

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
CATALOG = 'ICEBERG_REST'          -- External catalog
CATALOG_TABLE_NAME = 'events'     -- Name in the external catalog
EXTERNAL_VOLUME = 'my_iceberg_storage'
CATALOG_NAMESPACE = 'analytics';

-- Refresh to pick up new snapshots written by other engines
SELECT SYSTEM$REFRESH_ICEBERG_TABLE('db.events');

-- Then query as normal
SELECT * FROM db.events WHERE event_date >= '2026-05-14';
```

## Snowflake Open Catalog (Apache Polaris)

Snowflake also offers **Snowflake Open Catalog**: a managed Apache Polaris (REST Catalog) service that provides multi-engine catalog access. Open Catalog is built on the same Apache Polaris codebase that Dremio co-created with Snowflake and donated to the Apache Software Foundation.

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

| Storage Type               | Cost          | Portability                |
| -------------------------- | ------------- | -------------------------- |
| Snowflake internal storage | ~$40/TB/month | None (proprietary)         |
| External volume (S3/ADLS)  | ~$23/TB/month | Full (open Iceberg format) |

Teams with large data volumes can significantly reduce storage costs by moving to Iceberg Tables while maintaining Snowflake as their SQL engine.

## Current Limitations

- Snowflake-managed Iceberg Tables require Snowflake as the exclusive writer (other engines are read-only).
- Time travel for Snowflake-managed tables uses Snowflake's own implementation, not Iceberg snapshot semantics.
- Some advanced Iceberg features (branching, custom sort orders) may not be available in all Snowflake Iceberg Table configurations.
