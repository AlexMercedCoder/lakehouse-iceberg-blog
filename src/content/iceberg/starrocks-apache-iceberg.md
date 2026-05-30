---
term: "StarRocks and Apache Iceberg"
description: "StarRocks is a high-performance OLAP query engine with native Apache Iceberg external table support via its Multi-Catalog architecture, enabling sub-second analytics over Iceberg tables stored in S3, HDFS, or other storage without data ingestion."
category: "Engines & Integrations"
relatedTerms:
  - "iceberg-catalog"
  - "trino-apache-iceberg"
  - "dremio-apache-iceberg"
  - "iceberg-parquet"
  - "what-is-apache-iceberg"
keywords:
  - starrocks iceberg
  - starrocks apache iceberg
  - starrocks external catalog iceberg
  - starrocks lakehouse
  - starrocks iceberg integration
lastUpdated: 2026-05-14
---

## StarRocks and Apache Iceberg

**StarRocks** (formerly known as DorisDB, not to be confused with Apache Doris) is a high-performance, MPP (Massively Parallel Processing) OLAP database designed for real-time and interactive analytics. StarRocks supports Apache Iceberg as an **external table format** via its **Multi-Catalog** architecture, enabling StarRocks SQL to query Iceberg tables directly from object storage without data ingestion or ETL.

StarRocks is widely used in the Asia-Pacific tech ecosystem and has a growing global community, particularly for use cases requiring sub-second multi-dimensional analytics over large Iceberg datasets.

## StarRocks Multi-Catalog for Iceberg

StarRocks' **Multi-Catalog** feature allows creating catalog connections to external table formats including Iceberg, Hive, Delta Lake, and Hudi: alongside StarRocks' native internal tables.

### Creating an Iceberg Catalog

```sql
-- StarRocks: create an Iceberg catalog using Hive Metastore
CREATE EXTERNAL CATALOG iceberg_hms
PROPERTIES (
    "type" = "iceberg",
    "iceberg.catalog.type" = "hive",
    "hive.metastore.uris" = "thrift://hms-host:9083",
    "aws.s3.use_instance_profile" = "true",
    "aws.s3.region" = "us-east-1"
);

-- Using AWS Glue
CREATE EXTERNAL CATALOG iceberg_glue
PROPERTIES (
    "type" = "iceberg",
    "iceberg.catalog.type" = "glue",
    "aws.glue.region" = "us-east-1",
    "aws.s3.use_instance_profile" = "true"
);

-- Using Iceberg REST Catalog (Apache Polaris)
CREATE EXTERNAL CATALOG iceberg_polaris
PROPERTIES (
    "type" = "iceberg",
    "iceberg.catalog.type" = "rest",
    "iceberg.catalog.uri" = "https://my-polaris.example.com",
    "iceberg.catalog.credential" = "client-id:client-secret",
    "iceberg.catalog.warehouse" = "my-warehouse"
);
```

### Querying Iceberg Tables

```sql
-- Set the Iceberg catalog as current
SET CATALOG iceberg_polaris;

-- List namespaces and tables
SHOW DATABASES;
SHOW TABLES FROM analytics;

-- Query Iceberg tables with full predicate pushdown
SELECT
    date_trunc('month', order_date) AS month,
    region,
    COUNT(*) AS orders,
    SUM(total) AS revenue
FROM analytics.orders
WHERE order_date >= '2026-01-01'
  AND region IN ('AMER', 'EMEA')
GROUP BY 1, 2
ORDER BY 1, 4 DESC;
```

### Cross-Catalog Joins

StarRocks can join between internal StarRocks tables and external Iceberg tables:

```sql
-- Join StarRocks internal dimension table with Iceberg fact table
SELECT
    d.product_name,
    d.category,
    SUM(f.revenue) AS total_revenue
FROM iceberg_polaris.analytics.fact_orders f
JOIN default_catalog.dim.products d
    ON f.product_id = d.product_id
WHERE f.order_date >= '2026-01-01'
GROUP BY 1, 2;
```

## StarRocks Performance Characteristics for Iceberg

StarRocks' query engine applies the full Iceberg optimization stack:

- **Manifest pruning**: Partition elimination at the manifest level.
- **File-level data skipping**: Column statistics from manifests.
- **Parquet row group pruning**: Sub-file filtering.
- **Column projection**: Only reads needed columns.
- **Late materialization**: Defers full row reconstruction.

StarRocks also uses a vectorized execution engine (SIMD instructions, columnar processing) that makes it particularly fast for aggregation-heavy analytical queries.

## StarRocks vs. Other Iceberg Query Engines

| Aspect              | StarRocks                | Trino                 | Dremio                            |
| ------------------- | ------------------------ | --------------------- | --------------------------------- |
| Primary strength    | Real-time OLAP           | General SQL           | AI Analytics + BI                 |
| Native table format | StarRocks internal       | None (all external)   | Iceberg (via Dremio Open Catalog) |
| AI integration      | No                       | No                    | Yes (AI Semantic Layer)           |
| Streaming ingest    | Yes (native)             | No                    | No                                |
| Community           | Global (large in APAC)   | Large (Apache)        | Enterprise                        |
| Best for            | Real-time OLAP + Iceberg | General lakehouse SQL | AI, BI, federated analytics       |

## StarRocks and the Modern Iceberg Ecosystem

StarRocks fits well in architectures where:

- Real-time ingestion feeds StarRocks native tables for sub-second dashboards.
- Iceberg tables serve as the historical data store.
- StarRocks federates between live and historical data in queries.

For AI analytics, semantic layer, and natural language query capabilities on Iceberg data, Dremio complements StarRocks in the same lakehouse architecture.
