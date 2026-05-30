---
term: "Iceberg Views"
description: "Apache Iceberg Views are named, stored SQL queries managed by the Iceberg catalog that appear as virtual tables to downstream consumers, enabling semantic layer patterns, data product publishing, and multi-engine view sharing across the lakehouse."
category: "Core Concepts"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-rest-catalog"
  - "apache-polaris-catalog"
  - "dremio-apache-iceberg"
  - "what-is-apache-iceberg"
keywords:
  - iceberg views
  - apache iceberg views
  - iceberg virtual tables
  - iceberg sql views
  - iceberg semantic layer views
lastUpdated: 2026-05-14
---

## Apache Iceberg Views

**Apache Iceberg Views** extend the Iceberg ecosystem beyond physical table management to include **virtual, named SQL queries**: stored view definitions that are registered in the Iceberg catalog and appear as tables to downstream consumers. Views are a foundation of the semantic layer in a modern lakehouse, enabling data teams to publish clean, business-aligned abstractions over raw Iceberg tables.

## What is an Iceberg View?

An Iceberg View is a named SQL `SELECT` statement stored in the Iceberg catalog. When a consumer queries the view, the engine executes the underlying SQL against the physical Iceberg tables. Views:

- Appear as tables in catalog listings.
- Accept standard `SELECT` queries.
- Do not store data: they are always computed against the latest table state (unless materialized).
- Can reference other views (view hierarchies).
- Are versioned: the view definition is stored with schema information and dialect metadata.

## Views in the Iceberg Catalog

Views are registered in the Iceberg REST Catalog via the view management API (an extension to the base REST Catalog spec, supported by Apache Polaris and Project Nessie):

```sql
-- Spark: create an Iceberg view
CREATE VIEW my_catalog.db.monthly_revenue AS
SELECT
    date_trunc('month', order_date) as month,
    region,
    SUM(total) as revenue,
    COUNT(*) as order_count
FROM my_catalog.db.orders
WHERE status = 'completed'
GROUP BY 1, 2;

-- Query the view (engine executes the underlying SQL)
SELECT * FROM my_catalog.db.monthly_revenue
WHERE month = '2026-05-01' AND region = 'us-east';
```

## View Versioning and Dialect

Iceberg Views store the SQL dialect alongside the view definition:

```json
{
  "view-uuid": "abc-123",
  "format-version": 1,
  "location": "s3://bucket/warehouse/db/monthly_revenue",
  "current-version-id": 2,
  "versions": [
    {
      "version-id": 2,
      "timestamp-ms": 1715700000000,
      "representations": [
        {
          "type": "sql",
          "sql": "SELECT ...",
          "dialect": "spark"
        }
      ]
    }
  ]
}
```

The `dialect` field records which SQL dialect the view was written in (Spark SQL, Trino, Dremio/DremioSQL). Different engines may understand different SQL dialects: some catalogs can store multiple representations of the same view for different dialects.

## Use Cases for Iceberg Views

### 1. Semantic Layer / Data Product Publishing

Views are the primary mechanism for building a semantic layer over raw Iceberg tables:

```sql
-- Business-friendly view: hide raw table complexity
CREATE VIEW db.customer_360 AS
SELECT
    c.customer_id,
    c.name,
    c.email,
    c.region,
    COUNT(o.order_id) as lifetime_orders,
    SUM(o.total) as lifetime_revenue,
    MAX(o.order_date) as last_order_date
FROM db.customers c
LEFT JOIN db.orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name, c.email, c.region;
```

Data consumers and AI agents query `db.customer_360` without knowing about the underlying `customers` and `orders` tables or the join logic.

### 2. Data Access Control

Views can filter sensitive columns or rows, providing a governed access interface:

```sql
-- View that masks PII for non-privileged consumers
CREATE VIEW db.orders_masked AS
SELECT
    order_id,
    CONCAT('CUST-', customer_id) as customer_ref,  -- masked
    order_date,
    total,
    region
FROM db.orders;
```

### 3. Cross-Table Aggregations

Pre-define common joins and aggregations as views to ensure consistency across teams:

```sql
CREATE VIEW analytics.daily_kpis AS
SELECT
    order_date,
    COUNT(DISTINCT customer_id) as dau,
    SUM(total) as revenue,
    AVG(total) as aov
FROM db.orders
WHERE status = 'completed'
GROUP BY order_date;
```

### 4. Schema Abstraction

Views decouple consumers from physical table schema changes:

```sql
-- If db.orders is renamed or restructured, update the view: consumers are unaffected
CREATE OR REPLACE VIEW db.orders_v2 AS SELECT * FROM db.orders_new_schema;
```

## Views in Dremio

Dremio's platform has first-class support for Iceberg views as part of its AI Semantic Layer:

- Views are called **Virtual Datasets** in Dremio.
- They are stored in the Open Catalog (powered by Apache Polaris) and discoverable via the Iceberg REST Catalog API.
- AI agents query Virtual Datasets as their primary data interface: the semantic context (column descriptions, business logic) is encoded in the view definition.
- Dremio's **Reflections** can be applied to views for sub-second query performance.

## Views vs. Materialized Views

Standard Iceberg views are **virtual**: computed on every query. For high-frequency queries on expensive views, **materialized views** (pre-computed and stored as physical Iceberg tables) provide much better performance. Dremio's Reflections are the primary mechanism for materializing view computations in the Iceberg lakehouse ecosystem.

## Managing Views

```sql
-- Show all views in a namespace
SHOW VIEWS IN my_catalog.db;

-- Describe a view
DESCRIBE VIEW my_catalog.db.monthly_revenue;

-- Drop a view
DROP VIEW my_catalog.db.monthly_revenue;

-- PyIceberg: list views
views = catalog.list_views(("db",))
for view in views:
    print(view)
```
