---
term: "Trino and Apache Iceberg"
description: "Trino (formerly PrestoSQL) is a distributed SQL query engine with native Apache Iceberg support, optimized for interactive, sub-second analytical queries over Iceberg tables using the Iceberg REST Catalog, Hive Metastore, or Glue as its catalog."
category: "Engines & Integrations"
relatedTerms:
  - "spark-apache-iceberg"
  - "dremio-apache-iceberg"
  - "iceberg-rest-catalog"
  - "what-is-apache-iceberg"
  - "iceberg-hidden-partitioning"
keywords:
  - trino iceberg
  - trino apache iceberg
  - trino iceberg connector
  - prestosql iceberg
  - trino iceberg query
lastUpdated: 2026-05-14
---

## Trino and Apache Iceberg

**Trino** (formerly PrestoSQL) is a distributed, open-source SQL query engine designed for interactive analytics at scale. Originally developed at Facebook, Trino is now widely deployed in data lakehouses as a high-performance SQL engine for ad-hoc queries, business intelligence, and data exploration over Apache Iceberg tables.

Trino's Iceberg connector is one of its most mature and actively developed connectors, supporting all major Iceberg features including time travel, hidden partitioning, row-level deletes, and multiple catalog backends.

## Trino Iceberg Connector Features

| Feature                  | Support   |
| ------------------------ | --------- |
| Read Iceberg tables      | Full      |
| Write / INSERT           | Full      |
| UPDATE (CoW)             | Full      |
| DELETE (CoW)             | Full      |
| MERGE INTO               | Supported |
| Time travel              | Full      |
| Schema evolution         | Full      |
| Hidden partitioning      | Full      |
| MoR read (apply deletes) | Full      |
| REST Catalog             | Full      |
| Hive Metastore catalog   | Full      |
| AWS Glue catalog         | Full      |
| Nessie catalog           | Full      |

## Configuration

### trino-catalog Iceberg connector configuration (`iceberg.properties`)

```properties
connector.name=iceberg
iceberg.catalog.type=rest

# REST Catalog
iceberg.rest-catalog.uri=https://my-catalog.example.com
iceberg.rest-catalog.security=OAUTH2
iceberg.rest-catalog.oauth2.credential=client-id:client-secret

# OR Hive Metastore
iceberg.catalog.type=hive_metastore
hive.metastore.uri=thrift://metastore-host:9083

# OR AWS Glue
iceberg.catalog.type=glue
```

## SQL: Querying Iceberg Tables with Trino

```sql
-- Standard query
SELECT customer_id, SUM(total) as revenue
FROM iceberg.db.orders
WHERE order_date >= DATE '2026-01-01'
GROUP BY customer_id
ORDER BY revenue DESC;

-- Time travel by timestamp
SELECT * FROM iceberg.db.orders
FOR TIMESTAMP AS OF TIMESTAMP '2026-01-15 00:00:00 UTC';

-- Time travel by snapshot ID
SELECT * FROM iceberg.db.orders
FOR VERSION AS OF 8027658604211071520;
```

## Metadata Inspection

```sql
-- System schemas expose table metadata
SELECT * FROM iceberg.db."orders$snapshots";
SELECT * FROM iceberg.db."orders$history";
SELECT * FROM iceberg.db."orders$manifests";
SELECT * FROM iceberg.db."orders$files";
SELECT * FROM iceberg.db."orders$partitions";
```

## Trino's Strengths for Iceberg

### Interactive Latency

Trino is optimized for interactive, low-latency SQL — typical queries complete in seconds or sub-second. This makes it particularly well-suited for:

- BI tool backends (Superset, Grafana, Metabase)
- Data exploration and ad-hoc analytics
- Dashboards with concurrent user queries

### Federation

Trino can query Iceberg tables alongside other data sources (PostgreSQL, MySQL, Elasticsearch, S3 files) in a single SQL statement. This federation capability is valuable for workloads that need to join lakehouse data with operational database data.

```sql
-- Join Iceberg with PostgreSQL in a single Trino query
SELECT i.order_id, p.customer_name, i.total
FROM iceberg.db.orders i
JOIN postgresql.crm.customers p ON i.customer_id = p.id
WHERE i.order_date >= DATE '2026-05-01';
```

## Trino vs. Dremio vs. Spark

| Dimension         | Trino                 | Dremio             | Spark           |
| ----------------- | --------------------- | ------------------ | --------------- |
| Best for          | Ad-hoc SQL, BI        | BI + AI analytics  | Batch ETL       |
| Query latency     | Sub-second to seconds | Sub-second         | Seconds+        |
| Streaming writes  | No                    | No                 | Yes             |
| Maintenance ops   | Partial               | Yes                | Yes (full)      |
| AI Semantic Layer | No                    | Yes                | No              |
| Open Catalog      | Via REST config       | Built-in (Polaris) | Via REST config |
| Managed service   | Starburst             | Dremio Cloud       | Databricks, EMR |
