---
term: "AWS Athena and Apache Iceberg"
metaTitle: "Athena Iceberg Tables: Create, Query, and Optimize"
description: "Athena engine v3 creates, queries, and updates Iceberg v2 tables in the AWS Glue Data Catalog. See the DDL, MERGE, time travel, OPTIMIZE, and VACUUM syntax."
category: "Cloud-Specific Integrations"
relatedTerms:
  - "aws-glue-catalog"
  - "amazon-s3-tables"
  - "iceberg-time-travel"
  - "iceberg-row-level-deletes"
  - "spark-apache-iceberg"
keywords:
  - aws athena iceberg
  - athena apache iceberg
  - athena iceberg dml
  - serverless iceberg athena
  - athena iceberg time travel
lastUpdated: 2026-10-15
---

## AWS Athena and Apache Iceberg

Athena engine version 3 can create, query, insert into, update, delete from, merge into, time travel over, and compact Iceberg tables registered in the AWS Glue Data Catalog. Athena creates and operates on Iceberg format v2 tables.

**Amazon Athena** is AWS's serverless SQL query service that enables querying data directly in Amazon S3 using SQL: with no infrastructure to manage and pay-per-query pricing. Athena has native Apache Iceberg support via the **AWS Glue Data Catalog**, making it one of the simplest ways to run Iceberg SQL on AWS without deploying Spark clusters.

Athena's Iceberg support covers time travel, row-level deletes, and schema evolution (add, drop, rename, reorder, and type widening) without any cluster management. Athena reads tables whose partitioning evolved elsewhere, but partition evolution DDL itself is run from an engine such as Spark.

## Creating Iceberg Tables in Athena

```sql
-- Create an Iceberg table via Athena (uses Glue catalog, stores data in S3)
CREATE TABLE orders (
    order_id    BIGINT,
    customer_id BIGINT,
    total       DOUBLE,
    order_date  DATE,
    status      STRING
)
PARTITIONED BY (month(order_date))
LOCATION 's3://my-bucket/warehouse/orders/'
TBLPROPERTIES (
    'table_type' = 'ICEBERG',
    'format' = 'parquet',
    'write_compression' = 'zstd'
);
```

## Full DML Support

Athena Engine v3 provides complete Iceberg DML:

```sql
-- INSERT
INSERT INTO orders VALUES (1001, 42, 150.00, DATE '2026-05-14', 'pending');

-- UPDATE (row-level; Athena always uses merge-on-read with position deletes)
UPDATE orders SET status = 'shipped' WHERE order_id = 1001;

-- DELETE (row-level)
DELETE FROM orders WHERE order_date < DATE '2020-01-01';

-- MERGE INTO (upsert)
MERGE INTO orders AS target
USING updates AS source
ON target.order_id = source.order_id
WHEN MATCHED THEN UPDATE SET status = source.status
WHEN NOT MATCHED THEN INSERT VALUES (source.order_id, source.customer_id,
    source.total, source.order_date, source.status);
```

## Time Travel Queries

```sql
-- Query as of a specific timestamp
SELECT * FROM orders
FOR TIMESTAMP AS OF TIMESTAMP '2026-01-15 00:00:00 UTC';

-- Query as of a specific snapshot ID
SELECT * FROM orders
FOR VERSION AS OF 8027658604211071520;
```

## Metadata Inspection

```sql
-- View snapshot history
SELECT * FROM "orders$snapshots";

-- View table history
SELECT * FROM "orders$history";

-- View data files with statistics
SELECT * FROM "orders$files";

-- View manifests
SELECT * FROM "orders$manifests";
```

## Athena Table Optimization

Athena provides two built-in Iceberg maintenance commands:

```sql
-- Compact small files (equivalent to rewrite_data_files)
OPTIMIZE orders REWRITE DATA USING BIN_PACK;

-- Compact only part of the table
OPTIMIZE orders REWRITE DATA USING BIN_PACK
WHERE order_date >= DATE '2026-01-01';

-- Expire old snapshots and remove orphan files
VACUUM orders;
```

`BIN_PACK` is the rewrite strategy Athena documents; for Z-order or sort-based compaction, use Spark's `rewrite_data_files` procedure. `VACUUM` performs snapshot expiration and orphan file removal using the Athena table properties `vacuum_max_snapshot_age_seconds` (default 5 days) and `vacuum_min_snapshots_to_keep` (default 1).

## Athena vs. Other AWS Iceberg Services

| Aspect           | Athena                 | EMR (Spark)               | S3 Tables               |
| ---------------- | ---------------------- | ------------------------- | ----------------------- |
| Infrastructure   | Serverless             | EMR cluster               | Serverless (managed)    |
| Pricing          | Per query (TB scanned) | Per cluster-hour          | Per operation + storage |
| Catalog          | Glue                   | Glue or REST              | Built-in REST           |
| Streaming writes | No                     | Yes (Flink/Spark)         | Via Firehose or engines |
| Auto-compaction  | No (manual OPTIMIZE)   | No (manual or scheduled)  | Yes (automatic)         |
| Best for         | Ad-hoc SQL, light DML  | ETL, heavy transformation | Managed Iceberg-only    |

## Athena Workgroup Configuration for Iceberg

```json
{
  "WorkGroupName": "iceberg-workgroup",
  "Configuration": {
    "ResultConfiguration": {
      "OutputLocation": "s3://my-query-results/"
    },
    "EngineVersion": {
      "SelectedEngineVersion": "Athena engine version 3"
    }
  }
}
```

Athena engine version 3 is the current engine and the one AWS documents for Iceberg (it supports Parquet, ORC, and Avro Iceberg data files). Workgroups auto-upgrade by default when AWS retires an engine version.

## Integration with AWS Ecosystem

Athena Iceberg tables integrate with:

- **AWS Glue Catalog**: Automatically registered, visible to all Glue-connected services.
- **AWS Lake Formation**: Column, row, and cell-level read permissions on Iceberg tables (Athena does not support DDL on Lake Formation registered Iceberg tables).
- **Amazon QuickSight**: BI dashboards over Athena Iceberg queries.
- **Amazon S3 Tables**: Athena queries S3 Tables through the Glue Data Catalog alongside Glue-backed Iceberg tables.
