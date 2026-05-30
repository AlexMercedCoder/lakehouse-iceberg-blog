---
term: "Presto and Apache Iceberg"
description: "PrestoDB is the Meta-maintained fork of the original Presto query engine with an Iceberg connector that supports Iceberg table reads, DML (INSERT, UPDATE, DELETE), and time travel via the Hive Metastore or Iceberg REST Catalog."
category: "Engines & Integrations"
relatedTerms:
  - "trino-apache-iceberg"
  - "iceberg-hive-metastore"
  - "iceberg-rest-catalog"
  - "iceberg-catalog"
  - "what-is-apache-iceberg"
keywords:
  - presto iceberg
  - prestodb apache iceberg
  - presto iceberg connector
  - presto vs trino iceberg
  - meta presto iceberg
lastUpdated: 2026-05-14
---

## Presto and Apache Iceberg

**PrestoDB** (commonly called "Presto") is the fork of the original Facebook/Meta-created Presto distributed SQL engine maintained by Meta and the PrestoDB open-source community. It supports Apache Iceberg via a native Iceberg connector, enabling federated SQL queries over Iceberg tables stored in S3, HDFS, and other object stores.

Understanding the Presto/Trino landscape is important: **Trino** (formerly PrestoSQL) and **PrestoDB** are two diverged forks of the same original codebase. They share a similar architecture and both have Iceberg support, but are maintained by different communities with different release cadences and feature sets.

## The Presto/Trino Split: Context

The original Presto was created at Facebook in 2012 and open-sourced in 2013. In 2018, four of the original creators left Facebook and formed the PrestoSQL community (later renamed **Trino** in 2021). Since then:

- **PrestoDB**: Maintained by Meta and the PrestoDB Foundation. Used at Facebook-scale workloads internally at Meta.
- **Trino**: Independent open-source project with active community development, broad enterprise adoption. Has generally been faster to adopt Iceberg Spec v2 features.

Both engines work with Iceberg: the choice between them depends on existing infrastructure, community ecosystem, and specific feature needs.

## Presto Iceberg Connector Configuration

```
# Presto: iceberg catalog configuration
# etc/catalog/iceberg.properties

connector.name=iceberg
hive.metastore.uri=thrift://hms-host:9083
iceberg.catalog.type=hive

# Or with Glue:
hive.metastore=glue
hive.metastore.glue.region=us-east-1

# Or with REST catalog:
iceberg.catalog.type=rest
iceberg.rest-catalog.uri=https://my-polaris.example.com
```

## Basic Iceberg Queries in Presto

```sql
-- Create an Iceberg table
CREATE TABLE iceberg.analytics.orders (
    order_id     BIGINT,
    customer_id  BIGINT,
    total        DOUBLE,
    order_date   DATE
) WITH (
    format = 'PARQUET',
    partitioning = ARRAY['months(order_date)'],
    location = 's3://my-bucket/warehouse/analytics/orders/'
);

-- Insert data
INSERT INTO iceberg.analytics.orders VALUES (1001, 42, 150.00, DATE '2026-05-14');

-- Query with predicate pushdown
SELECT customer_id, SUM(total) as revenue
FROM iceberg.analytics.orders
WHERE order_date >= DATE '2026-01-01'
GROUP BY customer_id
ORDER BY revenue DESC;
```

## Time Travel in Presto

```sql
-- Query as of a specific snapshot ID
SELECT * FROM iceberg.analytics.orders
FOR VERSION AS OF 8027658604211071520;

-- Query as of a timestamp
SELECT * FROM iceberg.analytics.orders
FOR TIMESTAMP AS OF TIMESTAMP '2026-01-15 00:00:00 UTC';
```

## Metadata Tables

```sql
-- View table history
SELECT * FROM iceberg.analytics."orders$history";

-- View snapshots
SELECT * FROM iceberg.analytics."orders$snapshots";

-- View data files with statistics
SELECT * FROM iceberg.analytics."orders$files";
```

## Presto vs. Trino for Iceberg Workloads

| Aspect               | PrestoDB                                | Trino                                |
| -------------------- | --------------------------------------- | ------------------------------------ |
| Maintainer           | Meta + PrestoDB Foundation              | Independent open-source community    |
| Iceberg Spec v2      | Supported                               | Full (often earlier adoption)        |
| Row-level deletes    | Supported                               | Full (MoR + CoW)                     |
| REST Catalog         | Supported                               | Full (broad integration)             |
| Community velocity   | Meta-cadenced                           | High (independent)                   |
| Enterprise ecosystem | Limited outside Meta                    | Broad (Starburst, etc.)              |
| Best for             | Meta-scale deployments, Hive-heavy orgs | General enterprise Iceberg workloads |

For most new Iceberg deployments, **Trino** is the more commonly recommended choice due to its broader community, faster feature adoption, and more extensive enterprise tooling (Starburst). PrestoDB is preferred in environments already standardized on the PrestoDB distribution or with specific Meta-centric tooling requirements.
