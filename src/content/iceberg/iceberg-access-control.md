---
term: "Iceberg Access Control Patterns"
description: "Iceberg access control is implemented at the catalog layer through the Iceberg REST Catalog RBAC model, providing namespace-level, table-level, and column-level privilege management with credential vending to ensure engines only access the data they are authorized to see."
category: "Governance & Security"
relatedTerms:
  - "apache-polaris-catalog"
  - "iceberg-rest-catalog"
  - "iceberg-catalog"
  - "dremio-apache-iceberg"
  - "iceberg-multi-tenant"
keywords:
  - iceberg access control
  - iceberg rbac
  - iceberg table permissions
  - iceberg column level security
  - iceberg catalog governance
lastUpdated: 2026-05-14
---

## Iceberg Access Control Patterns

Apache Iceberg's access control model is enforced at the **catalog layer** — not the storage layer and not the query engine layer. This design enables consistent governance across all engines: when Spark, Flink, Dremio, Trino, and PyIceberg all connect to the same Iceberg REST Catalog (e.g., Apache Polaris), the catalog's access control policies apply to all of them uniformly.

This is a fundamental architectural improvement over traditional data lakes where each tool enforced (or didn't enforce) its own access control independently.

## The Iceberg Authorization Model (Apache Polaris)

Apache Polaris (the reference REST Catalog, co-created by Dremio and Snowflake) defines a hierarchical RBAC model:

### Principals

A **principal** is an identity that can be granted access. Polaris principals include:

- **Service principals**: Automated applications (Spark jobs, Flink pipelines, ML models).
- **User principals**: Human users accessing via Dremio, Trino, or direct API.

### Principal Roles

Principals are assigned to **principal roles** (similar to IAM groups):

```
principal-roles:
  - data-engineers     (Spark ETL jobs, Flink pipelines)
  - data-analysts      (Dremio, Trino users)
  - ml-team            (PyIceberg, ML pipelines)
  - executive-viewers  (BI tools, read-only dashboard consumers)
```

### Catalog Roles and Privileges

**Catalog roles** define privilege sets on catalog resources (catalogs, namespaces, tables, views):

```
privileges:
  - CATALOG_READ_PROPERTIES
  - NAMESPACE_READ_PROPERTIES
  - TABLE_READ_DATA          ← read Iceberg tables
  - TABLE_WRITE_DATA         ← write Iceberg tables
  - TABLE_CREATE             ← create new tables
  - TABLE_DROP               ← drop tables
  - VIEW_CREATE              ← create views
```

Catalog roles are assigned to principal roles, forming the access control chain:

```
data-analysts principal role
  └── analytics-reader catalog role
        ├── TABLE_READ_DATA on analytics.* (all tables in analytics namespace)
        └── VIEW_READ on analytics.* (all views)
```

## Privilege Hierarchy

Access control follows the catalog hierarchy:

```
Catalog level
  └── Namespace level
        └── Table/View level
```

Granting a privilege at a higher level cascades to all resources below it:

- `TABLE_READ_DATA` on `analytics.*` grants read access to all tables in the `analytics` namespace.
- `TABLE_READ_DATA` on `analytics.orders` grants read access to only the `orders` table.

## Credential Vending: The Key Security Primitive

When an authorized engine requests table access, the Polaris catalog doesn't return raw cloud credentials (S3 access keys, GCS service accounts). Instead, it **vends short-lived, scoped credentials**:

```
Engine → Catalog: "I want to read analytics.orders"
Catalog → Auth check: Does this engine/user have TABLE_READ_DATA on analytics.orders? ✅
Catalog → STS: Generate temporary S3 credentials for the specific S3 prefix
Catalog → Engine: Here are 15-minute credentials valid for s3://bucket/warehouse/analytics/orders/* (READ ONLY)
Engine → S3: Reads data using the vended credentials
```

This means:

- Engines never hold long-lived cloud admin credentials.
- Compromised engine credentials are scoped (read-only, specific prefix, short-lived).
- The catalog is the single governance control point for all storage access.

## Row-Level Security

Row-level security in Iceberg is implemented via **views** (or virtual datasets in Dremio):

```sql
-- View that filters rows based on consumer's region
CREATE VIEW analytics.orders_my_region AS
SELECT * FROM analytics.orders
WHERE region = current_setting('consumer.region');
```

Consumers with access only to the view see only their region's data. The underlying table is inaccessible to them directly.

## Column-Level Security (Data Masking)

Column masking is implemented via views:

```sql
-- Masked view for non-privileged consumers
CREATE VIEW analytics.orders_masked AS
SELECT
    order_id,
    CONCAT('CUST-', CAST(customer_id AS STRING)) as customer_ref,  -- masked
    order_date,
    total,
    region
FROM analytics.orders;
-- consumer_id column not exposed
```

In Dremio, column masking policies can be applied directly to Virtual Datasets with policy-based masking rules.

## Multi-Engine Governance

The key architectural advantage of catalog-based access control:

```
Apache Polaris Catalog (single governance control plane)
  ├── Spark (ETL) → authenticated as data-engineers principal
  ├── Dremio (BI/AI) → authenticated as data-analysts principal
  ├── Flink (streaming) → authenticated as data-engineers principal
  └── PyIceberg (ML) → authenticated as ml-team principal

All engines get the same access control, enforced by the same catalog.
```

No per-engine configuration of access rules. No risk of inconsistent enforcement across tools.
