---
term: "Apache Spark and Apache Iceberg"
description: "Apache Spark is the most feature-complete query engine for Apache Iceberg, providing full DDL, DML, time travel, stored procedures for maintenance, and streaming read/write support, making it the primary engine for batch ETL and large-scale Iceberg table management."
category: "Engines & Integrations"
relatedTerms:
  - "what-is-apache-iceberg"
  - "iceberg-compaction"
  - "iceberg-merge-on-read"
  - "flink-apache-iceberg"
  - "trino-apache-iceberg"
keywords:
  - spark apache iceberg
  - spark iceberg integration
  - apache spark iceberg tables
  - spark iceberg sql
  - pyspark iceberg
lastUpdated: 2026-05-14
---

## Apache Spark and Apache Iceberg

**Apache Spark** is the most mature and feature-complete query engine for Apache Iceberg. As the primary engine used by Netflix when Iceberg was originally developed, Spark's Iceberg integration has the longest history, the most comprehensive feature coverage, and the largest production deployment base.

For teams working with Iceberg in batch ETL, large-scale analytics, and table maintenance operations, Spark is typically the engine of choice: though Dremio, Trino, and Flink each have strong positions in their respective niches.

## Setup and Configuration

### Maven / build.gradle Dependencies

```xml
<dependency>
  <groupId>org.apache.iceberg</groupId>
  <artifactId>iceberg-spark-runtime-3.5_2.12</artifactId>
  <version>1.5.0</version>
</dependency>
```

### SparkSession Configuration

```python
spark = SparkSession.builder \
    .appName("IcebergExample") \
    .config("spark.sql.extensions",
            "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.my_catalog",
            "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.my_catalog.type", "rest") \
    .config("spark.sql.catalog.my_catalog.uri", "https://catalog.example.com") \
    .config("spark.sql.catalog.my_catalog.credential", "client-id:client-secret") \
    .config("spark.sql.defaultCatalog", "my_catalog") \
    .getOrCreate()
```

## DDL Operations

```sql
-- Create Iceberg table
CREATE TABLE db.orders (
    order_id    BIGINT NOT NULL,
    customer_id BIGINT,
    order_date  TIMESTAMP,
    total       DOUBLE,
    status      STRING
) USING iceberg
PARTITIONED BY (days(order_date))
TBLPROPERTIES (
    'write.format.default' = 'parquet',
    'write.parquet.compression-codec' = 'zstd'
);

-- Schema evolution
ALTER TABLE db.orders ADD COLUMN region STRING AFTER status;
ALTER TABLE db.orders RENAME COLUMN cust_id TO customer_id;
ALTER TABLE db.orders ALTER COLUMN total TYPE DOUBLE;

-- Partition evolution
ALTER TABLE db.orders ADD PARTITION FIELD identity(region);
ALTER TABLE db.orders REPLACE PARTITION FIELD days(order_date) WITH months(order_date);
```

## DML Operations

```sql
-- Append
INSERT INTO db.orders VALUES (1001, 42, TIMESTAMP '2026-05-14 10:00:00', 150.00, 'pending', 'us-east');

-- Dynamic partition overwrite
INSERT OVERWRITE db.orders SELECT * FROM staging.orders WHERE order_date >= '2026-05-14';

-- Row-level UPDATE
UPDATE db.orders SET status = 'shipped' WHERE order_id = 1001;

-- Row-level DELETE
DELETE FROM db.orders WHERE order_date < '2020-01-01';

-- MERGE INTO (upsert)
MERGE INTO db.orders AS target
USING updates AS source ON target.order_id = source.order_id
WHEN MATCHED THEN UPDATE SET status = source.status
WHEN NOT MATCHED THEN INSERT *;
```

## Time Travel Queries

```sql
-- By timestamp
SELECT * FROM db.orders TIMESTAMP AS OF '2026-01-01 00:00:00';

-- By snapshot ID
SELECT * FROM db.orders VERSION AS OF 8027658604211071520;
```

## Metadata Inspection

```sql
SELECT * FROM db.orders.snapshots;   -- All snapshots
SELECT * FROM db.orders.history;     -- Snapshot history
SELECT * FROM db.orders.manifests;   -- Manifest files
SELECT * FROM db.orders.files;       -- Data files with statistics
SELECT * FROM db.orders.partitions;  -- Partition info
```

## Maintenance Stored Procedures

```sql
-- Compact small files (bin-pack)
CALL system.rewrite_data_files('db.orders');

-- Compact with Z-order
CALL system.rewrite_data_files(
  table => 'db.orders',
  strategy => 'sort',
  sort_order => 'zorder(customer_id, order_date)'
);

-- Expire old snapshots
CALL system.expire_snapshots('db.orders', TIMESTAMP '2026-04-01 00:00:00', 10);

-- Remove orphan files
CALL system.remove_orphan_files(table => 'db.orders');

-- Rewrite manifests
CALL system.rewrite_manifests('db.orders');
```

## Structured Streaming (Spark + Iceberg)

Spark Structured Streaming can write to Iceberg tables:

```python
# Streaming write to Iceberg
df.writeStream \
    .format("iceberg") \
    .outputMode("append") \
    .option("path", "db.orders") \
    .option("checkpointLocation", "/tmp/checkpoint/orders") \
    .trigger(processingTime="1 minute") \
    .start()
```

And read incrementally using the Iceberg snapshot diff:

```python
# Incremental read (new rows only since last checkpoint)
spark.readStream \
    .format("iceberg") \
    .option("stream-from-timestamp", "1715700000000") \
    .load("db.orders")
```

## Spark vs. Other Engines

| Capability             | Spark                  | Dremio           | Trino       | Flink     |
| ---------------------- | ---------------------- | ---------------- | ----------- | --------- |
| Full DDL               | Yes                    | Yes              | Yes         | Partial   |
| Full DML               | Yes                    | Yes              | Yes (reads) | Yes       |
| Streaming write        | Yes                    | No               | No          | Yes       |
| Maintenance procedures | Yes (primary)          | Yes              | Partial     | No        |
| Interactive latency    | Seconds+               | Sub-second       | Sub-second  | N/A       |
| Best for               | Batch ETL, maintenance | BI, AI analytics | Ad-hoc SQL  | Streaming |
