---
term: "ClickHouse"
description: "A fast, open-source columnar database management system that supports native reading, querying, and writing of Apache Iceberg tables."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "iceberg-table-format"
  - "decoupled-compute-and-storage"
keywords:
  - clickhouse
  - clickhouse iceberg
  - clickhouse catalog
  - data lakehouse clickhouse
lastUpdated: 2026-05-29
---

## ClickHouse

**ClickHouse** is a high-performance, open-source columnar database management system designed for online analytical processing (OLAP). While ClickHouse is historically optimized for its native MergeTree storage engine, it provides native integration with Apache Iceberg. This allows ClickHouse to act as a fast analytical engine directly on data lakes and object storage buckets.

### Integration Mechanisms

ClickHouse connects to Iceberg tables through three primary interfaces:

#### 1. Iceberg Table Function

For ad-hoc queries, users can use the `icebergS3` (or `iceberg`) table function. This accesses files directly without creating a persistent table schema inside ClickHouse:

```sql
/* Query an Iceberg table directly on Amazon S3 */
SELECT count(*), avg(price)
FROM icebergS3(
    'https://my-bucket.s3.amazonaws.com/warehouse/orders/',
    'my_aws_access_key',
    'my_aws_secret_key'
)
WHERE order_date > '2026-01-01';
```

#### 2. Iceberg Table Engine

To define a persistent table, the `IcebergS3` table engine maps a ClickHouse table to the Iceberg storage folder. Queries run against this table automatically pull the latest committed data files:

```sql
/* Create a persistent ClickHouse table pointing to Iceberg on S3 */
CREATE TABLE s3_orders
ENGINE = IcebergS3(
    'https://my-bucket.s3.amazonaws.com/warehouse/orders/',
    'my_aws_access_key',
    'my_aws_secret_key'
);
```

#### 3. DataLakeCatalog Database Engine

For enterprise discovery, ClickHouse supports the `DataLakeCatalog` database engine. By pointing ClickHouse at a catalog provider (like AWS Glue or a standard REST Catalog), all Iceberg tables in the catalog are automatically exposed as queryable tables inside ClickHouse, removing the need for manual table setup.

### Query Optimizations and Write Support

ClickHouse utilizes Iceberg's metadata to optimize query execution. It reads the manifest files to execute partition pruning and column statistics evaluation, skipping irrelevant data blocks.

Recent versions of ClickHouse have expanded write capabilities, allowing users to run INSERT operations to append records into existing Iceberg tables, maintaining transaction safety and format compatibility across engines.
