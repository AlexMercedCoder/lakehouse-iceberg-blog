---
term: "Apache Superset and Apache Iceberg"
description: "Apache Superset is the leading open-source business intelligence tool that queries Apache Iceberg tables through SQL connections to Dremio, Trino, or Spark, providing interactive dashboards and charts over lakehouse data with no native Iceberg connector required."
category: "Engines & Integrations"
relatedTerms:
  - "dremio-apache-iceberg"
  - "trino-apache-iceberg"
  - "iceberg-views"
  - "iceberg-ai-semantic-layer"
  - "what-is-apache-iceberg"
keywords:
  - superset iceberg
  - apache superset iceberg
  - superset dremio iceberg
  - superset trino iceberg
  - bi tools iceberg
lastUpdated: 2026-05-14
---

## Apache Superset and Apache Iceberg

**Apache Superset** is the most widely adopted open-source business intelligence (BI) and data visualization platform. With over 50,000 GitHub stars and deployments at hundreds of organizations, Superset is the standard self-hosted alternative to commercial BI tools like Tableau and Looker.

Superset queries Apache Iceberg tables via SQL connections to Iceberg-compatible query engines: most commonly **Dremio**, **Trino**, or **Spark Thrift Server**. There is no native Iceberg connector required in Superset: Superset sends SQL to the connected query engine, which handles Iceberg query planning and execution.

## Connection Architecture

```
Superset (dashboards, charts, SQL Lab)
  → SQLAlchemy connection string (HTTP or Arrow Flight)
    → Query engine (Dremio / Trino / Spark)
      → Iceberg tables (via catalog)
```

## Connecting Superset to Dremio (Recommended)

Dremio provides the richest Superset integration via its AI Semantic Layer: virtual datasets, column descriptions, and metric definitions are accessible in Superset's dataset explorer.

### Dremio ODBC/JDBC Connection

```
Database URI: dremio+flight://my-dremio.example.com:32010
```

In Superset's database configuration:

1. Go to **Settings** → **Database Connections** → **+ Database**.
2. Select **Dremio** from the supported databases list.
3. Enter the Arrow Flight SQL endpoint.
4. Configure authentication (username/password or OAuth2).
5. Test connection.

### Superset Dataset from Dremio Virtual Dataset

Once connected, Superset can create datasets from:

- Dremio **Virtual Datasets** (semantic layer views over Iceberg tables).
- Direct SQL queries against Iceberg tables.

```sql
-- Superset custom SQL dataset: revenue trend over Iceberg data
SELECT
    DATE_TRUNC('month', order_date) AS month,
    region,
    SUM(total) AS revenue,
    COUNT(*) AS orders,
    COUNT(DISTINCT customer_id) AS customers
FROM analytics.orders
WHERE order_date >= '2025-01-01'
  AND status IN ('SHIPPED', 'DELIVERED')
GROUP BY 1, 2
```

## Connecting Superset to Trino

```
Database URI: trino://trino-user@trino.example.com:443/iceberg_catalog/analytics
```

Superset configuration for Trino:

```yaml
# Superset: Trino connection via superset_config.py
DATABASES = {
    "trino_iceberg": {
        "SQLALCHEMY_URI": "trino://user:password@trino.example.com:443/polaris_catalog/analytics",
        "OPTIONS": {
            "connect_args": {"http_scheme": "https"}
        }
    }
}
```

## Building Dashboards on Iceberg Data

### Step 1: Create a Dataset

In Superset, datasets are the link between the query engine and charts. Create a dataset backed by an Iceberg table or view:

1. **Datasets** → **+ Dataset** → Select database (Dremio/Trino) → Select schema → Select table.
2. Or: **SQL Lab** → Write SQL → **Save as Dataset**.

### Step 2: Define Metrics and Dimensions

Superset allows you to define reusable **metrics** within the dataset:

- `SUM(total)` → "Total Revenue"
- `COUNT(DISTINCT customer_id)` → "Unique Customers"
- `COUNT(*)` → "Order Count"

And **dimensions** (group-by columns):

- `region`, `order_date`, `status`, `product_category`

### Step 3: Build Charts

Select metric + dimension → Chart type → Render. Superset generates the SQL, sends it to the query engine, and plots the result.

### Step 4: Combine into Dashboard

Assemble charts into a dashboard with filters, cross-chart interaction, and scheduled refreshes.

## Time Travel in Superset + Iceberg

Superset doesn't natively support Iceberg time travel syntax, but you can use it via SQL Lab or parameterized SQL datasets:

```sql
-- Superset SQL dataset with time travel (Trino syntax)
SELECT * FROM iceberg.analytics.orders
FOR VERSION AS OF 8027658604211071520
WHERE order_date >= CURRENT_DATE - INTERVAL '30' DAY;
```

Or via Dremio:

```sql
-- Time travel via Dremio's AT SNAPSHOT syntax (VDS)
SELECT * FROM analytics.orders AT SNAPSHOT '8027658604211071520'
WHERE order_date >= CURRENT_DATE - 30;
```

## Performance Optimization for Superset + Iceberg

### Dremio Reflections for Dashboard Performance

For dashboards that run the same aggregations repeatedly:

1. In Dremio, create a Reflection on the virtual dataset powering the Superset dashboard.
2. Dremio pre-computes the aggregation as a materialized Iceberg table.
3. Superset queries hit the reflection instead of raw Iceberg data.
4. Dashboard load time: seconds → milliseconds.

### Superset Cache Layer

Configure Superset's Redis cache to cache query results for dashboards that don't need real-time freshness:

```python
# superset_config.py
CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 3600,  # 1 hour cache for stable metrics
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_URL": "redis://redis:6379/0",
}
EXPLORE_FORM_DATA_CACHE_CONFIG = CACHE_CONFIG
```

This reduces load on the Iceberg query engine for high-traffic dashboards.
