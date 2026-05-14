---
term: "AWS Athena and Apache Iceberg"
description: "Amazon Athena is a serverless SQL query engine with native Apache Iceberg support via the AWS Glue Data Catalog, enabling full Iceberg DML (INSERT, UPDATE, DELETE, MERGE) and time travel queries against Iceberg tables stored in Amazon S3 with no infrastructure management."
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
lastUpdated: 2026-05-14
---

## AWS Athena and Apache Iceberg

**Amazon Athena** is AWS's serverless SQL query service that enables querying data directly in Amazon S3 using SQL — with no infrastructure to manage and pay-per-query pricing. Athena has native Apache Iceberg support via the **AWS Glue Data Catalog**, making it one of the simplest ways to run Iceberg SQL on AWS without deploying Spark clusters.

Athena's Iceberg support covers the full Spec v2 feature set including time travel, row-level deletes, schema evolution, and partition evolution — all without any cluster management.

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
LOCATION 's3://my-bucket/warehouse/orders/'
TBLPROPERTIES (
    'table_type' = 'ICEBERG',
    'format' = 'parquet',
    'write_compression' = 'zstd',
    'partitioning' = 'months(order_date)'
);
```

## Full DML Support

Athena Engine v3 provides complete Iceberg DML:

```sql
-- INSERT
INSERT INTO orders VALUES (1001, 42, 150.00, DATE '2026-05-14', 'pending');

-- UPDATE (row-level, uses Iceberg MoR or CoW depending on table config)
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

Athena provides built-in Iceberg maintenance commands:

```sql
-- Compact small files (equivalent to rewrite_data_files)
OPTIMIZE orders REWRITE DATA USING BIN_PACK;

-- Compact with Z-Order clustering
OPTIMIZE orders REWRITE DATA USING ZORDER BY (customer_id, order_date);

-- Clean up old snapshots (equivalent to expire_snapshots)
VACUUM orders;
```

`VACUUM` expires old snapshots according to the retention policy set in table properties.

## Athena vs. Other AWS Iceberg Services

| Aspect           | Athena                 | EMR (Spark)               | S3 Tables               |
| ---------------- | ---------------------- | ------------------------- | ----------------------- |
| Infrastructure   | Serverless             | EMR cluster               | Serverless (managed)    |
| Pricing          | Per query (TB scanned) | Per cluster-hour          | Per operation + storage |
| Catalog          | Glue                   | Glue or REST              | Built-in REST           |
| Streaming writes | No                     | Yes (Flink/Spark)         | No                      |
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

Athena Engine v3 is required for full Iceberg support. Engine v2 has read-only support for Iceberg tables.

## Integration with AWS Ecosystem

Athena Iceberg tables integrate with:

- **AWS Glue Catalog**: Automatically registered, visible to all Glue-connected services.
- **AWS Lake Formation**: Column-level and row-level access control on Iceberg tables.
- **AWS QuickSight**: Direct BI visualization over Athena Iceberg queries.
- **Amazon SageMaker**: ML training data access via Athena Federated Query.
- **Amazon S3 Tables**: Cross-query between S3 Tables and Glue-backed Iceberg tables.
