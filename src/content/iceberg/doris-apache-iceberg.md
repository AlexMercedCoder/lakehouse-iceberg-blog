---
term: "Apache Doris and Apache Iceberg"
description: "Apache Doris is a high-performance real-time analytical database with native Iceberg external catalog support, enabling Doris SQL to query Iceberg tables via a multi-catalog architecture while Doris internal tables handle high-concurrency real-time analytics."
category: "Engines & Integrations"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-rest-catalog"
  - "starrocks-apache-iceberg"
  - "trino-apache-iceberg"
  - "what-is-apache-iceberg"
keywords:
  - apache doris iceberg
  - doris iceberg catalog
  - doris lakehouse iceberg
  - apache doris external catalog
  - doris iceberg integration
lastUpdated: 2026-05-14
---

## Apache Doris and Apache Iceberg

**Apache Doris** is an open-source, real-time analytical database built for high-concurrency, low-latency SQL analytics. It supports Apache Iceberg through a **Multi-Catalog** feature that allows Doris to connect to external Iceberg catalogs and query Iceberg tables alongside Doris internal tables — enabling a unified analytical experience over both real-time and historical data.

Apache Doris has a large and active community (especially in China and APAC) and is used at scale by companies including Meituan, Xiaomi, and JD.com for lakehouse analytics.

## Doris Multi-Catalog for Iceberg

Doris' Multi-Catalog feature (introduced in Doris 1.2+) supports Iceberg as an external catalog type:

### Creating an Iceberg Catalog

```sql
-- Doris: create an Iceberg catalog using Hive Metastore
CREATE CATALOG iceberg_hms PROPERTIES (
    'type' = 'iceberg',
    'iceberg.catalog.type' = 'hms',
    'hive.metastore.uris' = 'thrift://hms-host:9083',
    's3.region' = 'us-east-1',
    's3.endpoint' = 's3.amazonaws.com',
    's3.access_key' = 'AKxx...',
    's3.secret_key' = 'xxx...'
);

-- Using AWS Glue
CREATE CATALOG iceberg_glue PROPERTIES (
    'type' = 'iceberg',
    'iceberg.catalog.type' = 'glue',
    'glue.region' = 'us-east-1',
    's3.access_key' = '...',
    's3.secret_key' = '...'
);

-- Using REST Catalog (Apache Polaris)
CREATE CATALOG iceberg_polaris PROPERTIES (
    'type' = 'iceberg',
    'iceberg.catalog.type' = 'rest',
    'uri' = 'https://my-polaris.example.com',
    'iceberg.catalog.credential' = 'client-id:client-secret',
    'warehouse' = 'my-warehouse'
);
```

### Querying Iceberg Tables

```sql
-- Switch to the Iceberg catalog
SWITCH iceberg_polaris;

-- List databases (Iceberg namespaces)
SHOW DATABASES;

-- Query Iceberg table
SELECT
    date_trunc('month', order_date) AS month,
    region,
    SUM(total) AS revenue,
    COUNT(*) AS order_count
FROM analytics.orders
WHERE order_date >= '2026-01-01'
GROUP BY 1, 2
ORDER BY month, revenue DESC;

-- Cross-catalog join (Doris internal + Iceberg external)
SELECT d.product_name, SUM(i.total) AS revenue
FROM internal.dim.products d
JOIN iceberg_polaris.analytics.orders i ON d.product_id = i.product_id
WHERE i.order_date >= '2026-01-01'
GROUP BY d.product_name;
```

## Iceberg Time Travel in Doris

```sql
-- Query as of a specific snapshot
SELECT * FROM iceberg_polaris.analytics.orders
FOR VERSION AS OF 8027658604211071520;

-- Query as of a timestamp
SELECT * FROM iceberg_polaris.analytics.orders
FOR TIME AS OF '2026-05-14 10:00:00';
```

## Doris Iceberg Performance Optimizations

Doris applies Iceberg-native optimizations:

- **Partition pruning**: Evaluates manifests to skip irrelevant partition files.
- **Column statistics pruning**: Uses per-file min/max to skip data files.
- **Parquet column projection**: Only reads referenced columns.
- **Vectorized execution**: Doris' vectorized engine processes Arrow-format data efficiently.

## Doris vs. Dremio for Iceberg Analytics

| Aspect           | Apache Doris                           | Dremio                                 |
| ---------------- | -------------------------------------- | -------------------------------------- |
| Primary strength | High-concurrency real-time OLAP        | AI analytics + semantic layer          |
| AI integration   | No                                     | Yes (full AI Semantic Layer)           |
| Streaming ingest | Yes (native Routine Load)              | No                                     |
| Open Catalog     | External catalog only                  | Native Apache Polaris                  |
| Best for         | Real-time dashboards + Iceberg history | AI agents, BI, multi-engine governance |

In many architectures, Doris and Dremio serve complementary roles: Doris handles high-concurrency real-time analytics and Doris's internal tables for fresh data, while Dremio serves governed AI analytics and semantic layer access over the same Iceberg historical data.
