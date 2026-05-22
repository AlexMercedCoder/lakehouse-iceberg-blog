---
title: "Setting Up an AWS-Native Open Lakehouse: Querying Apache Iceberg with AWS Athena and AWS Glue Catalog"
description: "A comprehensive guide to building an open, high-performance lakehouse on AWS using Apache Iceberg, AWS Glue Catalog, Amazon S3, and S3 Tables, with query acceleration via the Dremio engine."
pubDatetime: 2026-05-22T10:30:00Z
author: "Alex Merced"
tags:
  ["Apache Iceberg", "AWS Athena", "AWS Glue Catalog", "Dremio", "S3 Tables"]
category: "Data Engineering"
slug: 2026-05-22-apache-iceberg-aws-athena-glue
draft: false
---

The architecture of modern data platforms is undergoing a fundamental shift away from proprietary, monolithic data warehouses toward open data lakehouses. In an open lakehouse architecture, data storage, metadata catalogs, and query compute engines are completely decoupled. This decoupling enables organizations to store their data once in an open format, catalog it in a centralized repository, and query it using the most efficient tool for each specific use case. AWS provides a powerful, native ecosystem for building such platforms, centered on Amazon Simple Storage Service (S3), the AWS Glue Catalog, and serverless query engines like AWS Athena.

In this guide, we will explore how to design, configure, and operate an AWS-native open lakehouse using Apache Iceberg. We will walk through the configuration of IAM policies, directory structures, and the new Amazon S3 Tables storage class. We will also examine how to build tables, ingest data, and execute queries using AWS Athena, and then show how to achieve sub-second interactive query speeds by connecting a Dremio engine to the same Glue catalog.

---

## 1. The Role of Apache Iceberg in AWS Lakehouses

Traditional data lakes on AWS relied on the Hive table format to organize files. Hive organized data into directory paths on S3, such as `s3://bucket/table/year=2026/month=05/`. While this simple partition layout worked for basic batch jobs, it introduced significant performance bottlenecks and operational limitations as datasets scaled. In Hive, a query engine had to list all files in a directory to identify which datasets belonged to a table. For large tables with thousands of partitions, these file listing requests generated thousands of S3 API calls, causing high latency and throttling.

Furthermore, Hive lacked ACID transaction support. If a write job failed halfway through, the tables were left in a corrupted, partially updated state. Schema evolution was also risky; renaming or dropping columns often required rewriting the entire dataset.

Apache Iceberg solves these challenges by treating a table as a collection of files rather than a directory. Iceberg maintains a hierarchical tree of metadata files that track the exact state of the table at any point in time. This metadata structure provides several critical capabilities:

1. **ACID Transactions**: Writers create new metadata files representing a snapshot of the table. A catalog swaps the table pointer from the old metadata file to the new one in a single atomic transaction.
2. **Metadata-Based Query Planning**: Query engines do not list S3 directories. Instead, they read the Iceberg manifest files to identify the exact files needed for a query. This eliminates folder listings and minimizes S3 API request overhead.
3. **Partition Evolution**: Iceberg tracks partition layouts as metadata. You can change your partitioning strategy (for instance, switching from daily to hourly partitioning) without rewriting existing data.
4. **Schema Evolution**: Column renames, additions, and type promotions are tracked in metadata, ensuring that schema modifications are instant and safe.

By placing Apache Iceberg at the center of an AWS data lake, organizations combine the low cost of S3 with the transactional reliability and performance of an enterprise data warehouse.

---

## 2. Decoupled Architecture Components and Commit Orchestration

An AWS-native open lakehouse relies on three distinct layers that cooperate to process analytical queries.

```
+-----------------------------------------------------------+
|                    QUERY COMPUTE LAYER                    |
|   +--------------------------+ +-----------------------+   |
|   |   AWS Athena (Serverless)| | Dremio Engine (Arrow) |   |
|   +--------------------------+ +-----------------------+   |
+-----------------------------+-----------------------------+
                              | (Read Metadata/Data)
                              v
+-----------------------------------------------------------+
|                      CATALOG LAYER                        |
|                  +-----------------------+                |
|                  |   AWS Glue Catalog    |                |
|                  +-----------------------+                |
+-----------------------------+-----------------------------+
                              | (Resolve Table Pointer)
                              v
+-----------------------------------------------------------+
|                      STORAGE LAYER                        |
|       +---------------------------------------------+     |
|       |                 Amazon S3                   |     |
|       |   (Standard Buckets / Amazon S3 Tables)     |     |
|       +---------------------------------------------+     |
+-----------------------------------------------------------+
```

### Amazon S3 and S3 Tables

Amazon S3 serves as the physical storage layer for data files (typically formatted as Parquet, ORC, or Avro) and Iceberg metadata files. Recently, AWS introduced Amazon S3 Tables, a specialized storage class designed specifically for tabular data.

Standard S3 buckets are generic object stores that treat all files as isolated blobs. In contrast, Amazon S3 Tables are optimized to host open table formats like Apache Iceberg. S3 Tables natively manage table metadata, automate background maintenance operations, and offer up to a ten-fold increase in transaction rates compared to standard buckets. This storage class reduces the management overhead of manually maintaining tables while providing high-performance object access.

### AWS Glue Catalog and Optimistic Concurrency Control

The catalog layer acts as the single source of truth for table identity and location. The AWS Glue Catalog is a managed, serverless metadata store that maintains schemas, partitions, and table definitions.

For Apache Iceberg, the Glue Catalog stores a reference pointing to the current metadata JSON file of each table. When an engine writes to an Iceberg table, it writes new data and metadata files to S3, and then commits the write by instructing Glue to update the table pointer. Glue performs this pointer swap atomically.

Behind the scenes, Iceberg uses Optimistic Concurrency Control (OCC) to coordinate transactions. When a transaction begins, the client engine reads the current table metadata pointer from the Glue Catalog and records the snapshot version. The client then writes new data files to S3 and creates new manifest files and metadata JSON files.

During the commit phase, the client requests the Glue Catalog to perform an atomic compare-and-swap (CAS) operation. The catalog verifies whether the current table pointer in Glue matches the version the client read at the start of the transaction. If the version matches, Glue updates the pointer to the new metadata JSON file, and the transaction is committed.

If another client has updated the table in the meantime, the version check fails. The committing client must abort the transaction, discard its temporary metadata files, reread the updated pointer, reconcile any non-conflicting changes (for instance, if the two transactions updated different partitions), and attempt the write again. This protocol guarantees transaction isolation without requiring physical database locks on the underlying files.

### AWS Athena

AWS Athena is a serverless, interactive query engine based on Presto and Trino. Athena queries Iceberg tables directly on S3 using schemas defined in the Glue Catalog. Because Athena is serverless, you pay only for the data scanned by your queries. It is ideal for ad-hoc exploration, reporting, and building lightweight dashboards.

### Dremio Engine

While Athena is excellent for ad-hoc queries, interactive business intelligence (BI) dashboards often require sub-second query responses. The Dremio engine is an open lakehouse query accelerator that integrates directly with the Glue Catalog and S3. Dremio bypasses the latency of standard object storage using an in-memory execution engine built on Apache Arrow, local metadata caching, and SQL Reflections. By pointing both Athena and Dremio to the same Glue Catalog, you can use Athena for batch transformations and ad-hoc queries, and Dremio for high-speed dashboarding and interactive analytics.

---

## 3. Designing the Infrastructure: Security, Rate Limits, and Hashing

Before querying tables, we must configure IAM policies, directory structures, and storage access patterns to ensure secure, high-throughput operations.

### IAM Policy Design and Action Descriptions

To interact with Iceberg tables via Athena and Glue, query engines require permissions to read and write data in S3, update metadata in Glue, and execute queries in Athena. Below is a secure, least-privilege IAM policy template designed for this architecture.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-lakehouse-bucket",
        "arn:aws:s3:::my-lakehouse-bucket/*"
      ]
    },
    {
      "Sid": "GlueCatalogAccess",
      "Effect": "Allow",
      "Action": [
        "glue:GetDatabase",
        "glue:GetDatabases",
        "glue:CreateDatabase",
        "glue:GetTable",
        "glue:GetTables",
        "glue:CreateTable",
        "glue:UpdateTable",
        "glue:DeleteTable"
      ],
      "Resource": [
        "arn:aws:glue:us-east-1:123456789012:catalog",
        "arn:aws:glue:us-east-1:123456789012:database/analytics",
        "arn:aws:glue:us-east-1:123456789012:table/analytics/*"
      ]
    },
    {
      "Sid": "AthenaExecutionAccess",
      "Effect": "Allow",
      "Action": [
        "athena:StartQueryExecution",
        "athena:GetQueryExecution",
        "athena:GetQueryResults",
        "athena:StopQueryExecution"
      ],
      "Resource": "*"
    }
  ]
}
```

Let us break down why specific actions are required:

- `s3:GetObject` and `s3:PutObject` are necessary to retrieve and write Parquet files and Iceberg metadata files to the bucket.
- `s3:DeleteObject` is required for table maintenance, such as expiring old snapshots and removing orphan files that are no longer referenced by the metadata.
- `s3:ListBucket` allows the client to list objects within specific prefixes during validation checks or maintenance tasks.
- `glue:GetTable` and `glue:CreateTable` allow query engines to resolve table schemas and locations, and write new table definitions.
- `glue:UpdateTable` is the critical action used during commit operations, enabling the atomic pointer swap that updates the table metadata location.

### S3 Cross-Account Access Policy Design

In many enterprise setups, storage is centralized in a dedicated security account, while compute engines run in separate analytics accounts. To allow query engines in Account A (ID: `111111111111`) to access the bucket in Account B (ID: `222222222222`), we must apply a cross-account bucket policy in Account B:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CrossAccountAnalyticsAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111111111111:root"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-lakehouse-bucket",
        "arn:aws:s3:::my-lakehouse-bucket/*"
      ]
    }
  ]
}
```

This cross-account policy allows roles within the analytics account to read, write, and manage objects in the target bucket, provided the role in Account A also has matching IAM permissions.

### S3 Directory Structure and Prefix Hashing

In standard S3 storage, high-throughput write applications can hit request rate limits. S3 supports up to 3,500 PUT/COPY/POST/DELETE requests and 5,500 GET/HEAD requests per second per partition prefix. If your data pipeline writes thousands of small files to a single partition folder, S3 may return HTTP 503 throttling errors.

To avoid throttling, you should design your S3 directory layout to distribute writes across multiple prefixes. Traditional Hive directories concentrated all writes into a single deep path. In contrast, Iceberg allows you to configure object storage routing to distribute data files across multiple hashed prefixes.

When object storage routing is enabled, Iceberg generates a hash value (such as a Murmur3 hash of the table and file names) and inserts it as a prefix in the file path. For instance, rather than writing all files to:
`s3://my-lakehouse-bucket/analytics/orders/data/order_date=2026-05-22/`

Iceberg can write files to paths that insert a hash value after the bucket root:
`s3://my-lakehouse-bucket/a8f9c1d2/analytics/orders/data/`
`s3://my-lakehouse-bucket/3b7e8f9a/analytics/orders/data/`

These hash prefixes instruct S3 to distribute the files across different physical storage partitions behind the scenes. This increases your aggregate throughput capacity, eliminating rate limit bottlenecks.

### Deep Dive into Object Storage Optimization and S3 Tables

Standard S3 buckets are generic object stores that treat all files as isolated blobs. In contrast, Amazon S3 Tables are optimized to host open table formats like Apache Iceberg. S3 Tables natively manage table metadata, automate background maintenance operations, and offer up to a ten-fold increase in transaction rates compared to standard buckets.

S3 Tables accomplish this optimization by removing the traditional directory simulation overhead. In standard S3, listing prefixes requires indexing large strings of text. S3 Tables organize metadata directly in a physical catalog layer managed by S3. Furthermore, AWS manages automated compaction background tasks for tables stored within S3 Tables, merging small files automatically without needing manual engineering orchestration or external scheduler jobs. This storage class reduces the management overhead of manually maintaining tables while providing high-performance object access.

### Partitioning Layout Strategies

Choosing the right partitioning strategy is crucial to minimize query scanning costs. Iceberg features hidden partitioning, which means query engines automatically determine which partitions to scan based on query filters.

We will use two standard table schemas for our examples:

1.  `analytics.orders` (fields: `order_id`, `customer_id`, `order_date`, `status`, `amount`)
2.  `analytics.customers` (fields: `customer_id`, `name`, `email`, `state`, `signup_date`)

For `analytics.orders`, partitioning by the day of the `order_date` field is highly effective. Iceberg partitions the data internally using a date transform, avoiding the need to maintain a separate physical partition column. For `analytics.customers`, partitioning by `state` or the month of `signup_date` is appropriate, depending on query distribution patterns.

---

## 4. Athena DDL Setup, Parquet Structures, and Hidden Partitioning

We will use AWS Athena to create our database and register our Iceberg tables in the AWS Glue Catalog.

First, we create the logical database. You can run this command directly in the Athena Query Editor:

```sql
CREATE DATABASE IF NOT EXISTS analytics;
```

### Parquet Internals and Compression

Before writing DDL statements, it is helpful to understand how Parquet storage interacts with Iceberg. Parquet is a columnar storage format that organizes data into Row Groups, Column Chunks, and Pages.

- **Row Groups**: Horizontal partitions of data within a single file. A typical row group contains between 100 megabytes and 1 gigabyte of data.
- **Column Chunks**: Column-specific storage within a row group. Column chunks are read independently, which allows query engines to skip columns that are not referenced in the SQL query.
- **Pages**: The smallest unit of data in Parquet, containing values, repetition levels, and definition levels. Pages are compressed and encoded individually.

By utilizing ZSTD compression, we achieve high compression ratios while retaining fast decompression speeds. ZSTD processes Parquet dictionary encodings and bit-packing arrays efficiently, allowing the CPU to read columns from S3 with minimal CPU cycle overhead.

### Creating the Customers Table

Next, we create the `analytics.customers` table. In Athena, you define an Iceberg table by appending `TBLPROPERTIES ('table_type'='ICEBERG')` to the DDL statement.

```sql
CREATE TABLE IF NOT EXISTS analytics.customers (
  customer_id STRING,
  name STRING,
  email STRING,
  state STRING,
  signup_date DATE
)
PARTITIONED BY (state)
LOCATION 's3://my-lakehouse-bucket/analytics/customers/'
TBLPROPERTIES (
  'table_type'='ICEBERG',
  'format'='parquet',
  'write.format.default'='parquet',
  'write.parquet.compression-codec'='zstd',
  'history.expire.max-snapshot-age-ms'='604800000',
  'history.expire.min-snapshots-to-keep'='5'
);
```

Let us examine the table properties configured in this DDL statement:

- `'table_type'='ICEBERG'`: Instructs Athena to write this table using the Apache Iceberg format rather than standard Glue/Hive format.
- `'write.format.default'='parquet'`: Sets Parquet as the default file format for all data writes.
- `'write.parquet.compression-codec'='zstd'`: Configures ZSTD compression, which offers an excellent balance between compression ratios and decompression speeds.
- `'history.expire.max-snapshot-age-ms'='604800000'`: Sets the maximum snapshot age to seven days. Snapshots older than this limit are marked for expiration to conserve storage.
- `'history.expire.min-snapshots-to-keep'='5'`: Guarantees that at least five historical snapshots are retained, ensuring you can perform time travel queries even if data is updated frequently.

### Creating the Orders Table

Now, we create the `analytics.orders` table. For this table, we will partition the data using the `day` transform on the `order_date` column.

```sql
CREATE TABLE IF NOT EXISTS analytics.orders (
  order_id STRING,
  customer_id STRING,
  order_date DATE,
  status STRING,
  amount DOUBLE
)
PARTITIONED BY (day(order_date))
LOCATION 's3://my-lakehouse-bucket/analytics/orders/'
TBLPROPERTIES (
  'table_type'='ICEBERG',
  'format'='parquet',
  'write.format.default'='parquet',
  'write.parquet.compression-codec'='zstd',
  'history.expire.max-snapshot-age-ms'='604800000',
  'history.expire.min-snapshots-to-keep'='5'
);
```

### The Power of Hidden Partitioning

By utilizing `day(order_date)`, we instruct Iceberg to automatically group records by day. In a legacy Hive table, you had to define a virtual partition column, and queries had to explicitly filter on that column (for example, `WHERE order_date_partition = '2026-05-22'`) to avoid scanning the entire dataset. If a developer forgot to include the partition column filter, the query scanned the whole table, resulting in high query costs and slow execution.

Iceberg's hidden partitioning decouples physical partitioning from logical query structure. Because Iceberg tracks partition boundaries in its metadata manifest files, a user simply queries the logical table (for instance, `WHERE order_date = CAST('2026-05-22' AS DATE)`). The query engine inspects the manifest files, translates the date filter into partition boundaries, and prunes non-matching files automatically. This guarantees efficient queries without placing the optimization burden on the dashboard designer or application developer.

---

## 5. Ingestion Pipelines: SQL DML and PySpark Integration

Once the tables are created, we can populate them using SQL INSERT statements or programmatically using PySpark.

### Populating Tables using Athena SQL

Let us load initial customer records into the `analytics.customers` table:

```sql
INSERT INTO analytics.customers VALUES
  ('C001', 'Alice Smith', 'alice@example.com', 'NY', CAST('2026-01-15' AS DATE)),
  ('C002', 'Bob Jones', 'bob@example.com', 'CA', CAST('2026-02-20' AS DATE)),
  ('C003', 'Charlie Brown', 'charlie@example.com', 'TX', CAST('2026-03-10' AS DATE)),
  ('C004', 'Diana Prince', 'diana@example.com', 'NY', CAST('2026-04-05' AS DATE)),
  ('C005', 'Evan Wright', 'evan@example.com', 'CA', CAST('2026-05-12' AS DATE));
```

Next, we ingest records into the `analytics.orders` table:

```sql
INSERT INTO analytics.orders VALUES
  ('O101', 'C001', CAST('2026-05-20' AS DATE), 'COMPLETED', 150.50),
  ('O102', 'C002', CAST('2026-05-20' AS DATE), 'PENDING', 99.99),
  ('O103', 'C001', CAST('2026-05-21' AS DATE), 'COMPLETED', 45.00),
  ('O104', 'C003', CAST('2026-05-21' AS DATE), 'SHIPPED', 250.00),
  ('O105', 'C004', CAST('2026-05-22' AS DATE), 'COMPLETED', 300.00),
  ('O106', 'C002', CAST('2026-05-22' AS DATE), 'CANCELLED', 15.75);
```

When these statements execute, Athena writes Parquet data files to S3, writes a new metadata JSON file, and updates the table pointer in the Glue Catalog.

### Programmatic Ingest using PySpark

In enterprise environments, data is regularly ingested from streaming pipelines or large ETL batch systems using Apache Spark. To write to our Iceberg tables in Glue via Spark, you must configure the Spark session to use the Iceberg Spark runtime catalog, pointing it to the AWS Glue Catalog implementation.

Below is the PySpark initialization script required to connect Spark to the Glue Catalog:

```python
from pyspark.sql import SparkSession

# Initialize Spark Session with Glue Catalog and Iceberg Configurations
spark = SparkSession.builder \
    .appName("LakehouseIngestionPipeline") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.glue_catalog.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog") \
    .config("spark.sql.catalog.glue_catalog.warehouse", "s3://my-lakehouse-bucket/warehouse/") \
    .config("spark.sql.catalog.glue_catalog.io-impl", "org.apache.iceberg.aws.s3.S3FileIO") \
    .getOrCreate()

# Create sample order update dataframe
updated_orders_data = [
    ("O102", "C002", "2026-05-20", "COMPLETED", 99.99),
    ("O107", "C005", "2026-05-22", "COMPLETED", 120.00)
]

columns = ["order_id", "customer_id", "order_date", "status", "amount"]
df_updates = spark.createDataFrame(updated_orders_data, schema=columns)
df_updates = df_updates.withColumn("order_date", df_updates["order_date"].cast("date"))

# Register update dataframe as a temporary view
df_updates.createOrReplaceTempView("orders_updates")

# Execute a MERGE INTO operation using Spark SQL
spark.sql("""
    MERGE INTO glue_catalog.analytics.orders t
    USING orders_updates s
    ON t.order_id = s.order_id
    WHEN MATCHED THEN
      UPDATE SET t.status = s.status, t.amount = s.amount
    WHEN NOT MATCHED THEN
      INSERT (order_id, customer_id, order_date, status, amount)
      VALUES (s.order_id, s.customer_id, s.order_date, s.status, s.amount)
""")
```

This PySpark script uses the `GlueCatalog` class to manage table state. The `MERGE INTO` operation executes as an atomic transaction. If the merge succeeds, Spark commits the update to Glue, and the changes are instantly visible to all other engines querying the catalog.

### Glue Catalog Lock Implementations

To handle high-concurrency writes, Spark applications must configure catalog locks to prevent two engines from overlapping pointer update requests. Under the hood, Glue catalog connection configuration options allow you to specify the lock implementation. By default, you can configure DynamoDB-based locking or use Glue's native transactional update API:

```python
# Configure DynamoDB-based transactional locking for Glue Catalog
spark.conf.set("spark.sql.catalog.glue_catalog.lock-impl", "org.apache.iceberg.aws.glue.DynamoDbLockManager")
spark.conf.set("spark.sql.catalog.glue_catalog.lock.table", "iceberg_lock_table")
```

The `DynamoDbLockManager` creates a DynamoDB table named `iceberg_lock_table` to coordinate lock acquisitions. When Spark attempts to swap the table pointer in Glue, it first acquires a row lock in the DynamoDB table, performs the update, and then releases the lock. This prevents collision issues when dozens of spark workers attempt concurrent transactions on the same Iceberg table.

### Running Analytical Queries

We can run complex SQL queries that join these tables to generate customer purchase summaries. For instance, the following query computes the total amount spent by customers in each state:

```sql
/* Calculate total order amount by state */
SELECT
  c.state,
  COUNT(o.order_id) AS total_orders,
  SUM(o.amount) AS total_revenue
FROM analytics.orders o
JOIN analytics.customers c ON o.customer_id = c.customer_id
WHERE o.status != 'CANCELLED'
GROUP BY c.state
ORDER BY total_revenue DESC;
```

Athena reads the manifest files for both tables to locate the exact Parquet files that correspond to active records. It then reads only the required columns (`customer_id`, `state`, `order_id`, `amount`, and `status`), ignoring unrelated fields like email addresses. This column pruning reduces the volume of data read from S3, speeding up queries and lowering scanning costs.

### Executing Time Travel Queries

Because Iceberg maintains a history of snapshots, we can query previous states of a table. Suppose we update a record in the `analytics.orders` table:

```sql
UPDATE analytics.orders
SET status = 'COMPLETED'
WHERE order_id = 'O102';
```

We can query the current state of the table to confirm that the update succeeded:

```sql
/* View current status of order O102 */
SELECT order_id, status
FROM analytics.orders
WHERE order_id = 'O102';
```

To see what the order looked like before the update, we can query a previous snapshot. In Athena, you can view the snapshot history of an Iceberg table using the system metadata tables:

```sql
/* Retrieve snapshot history for the orders table */
SELECT snapshot_id, committed_at, parent_id, operation
FROM "analytics"."orders$snapshots";
```

Once we identify the snapshot ID that corresponds to the initial state, we can query that snapshot directly:

```sql
/* Query the orders table as of a specific snapshot */
SELECT order_id, status
FROM analytics.orders FOR SYSTEM_VERSION_AS_OF 1234567890123456789
WHERE order_id = 'O102';
```

Replace `1234567890123456789` with the actual snapshot ID from your snapshot history metadata query. The query returns `'PENDING'`, demonstrating that Iceberg can access historical states of the dataset without requiring you to maintain complex manual backups.

---

## 6. Accelerating Queries in Dremio

AWS Athena is an outstanding serverless engine for ad-hoc queries, but it is not designed to support high-concurrency, sub-second applications like real-time BI dashboards. Athena queries typically take several seconds to plan and execute due to serverless cold starts, catalog lookup overhead, and S3 latency.

To achieve sub-second execution speeds, organizations integrate a Dremio engine with their AWS Glue Catalog and S3 storage.

```
                                  +-----------------------+
                                  |    User SQL Query     |
                                  +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  |   Dremio Coordinator  |
                                  |  (Local Metadata Cache|
                                  |   & Calcite Planner)  |
                                  +-----------+-----------+
                                              |
                                     (Query Rewrite Match?)
                                     /                     \
                                   Yes                      No
                                   /                         \
                                  v                           v
                      +----------------------+     +----------------------+
                      |   Data Reflections   |     |    Read Base Table   |
                      |  (Pre-aggregated /   |     |     via Arrow        |
                      |   Pre-computed Join) |     |  Vectorized Engine   |
                      +----------------------+     +----------------------+
```

### Connecting Dremio to the Glue Catalog

Dremio provides a native connector for the AWS Glue Catalog. To connect Dremio:

1.  Open the Dremio administrator console.
2.  Click **Add Source** in the bottom-left corner and select **AWS Glue Catalog**.
3.  Enter a name for the source (for example, `glue_catalog`).
4.  Configure the authentication method. You can use AWS Access Keys or configure Dremio to assume an IAM Role.
5.  Specify the AWS Region where your Glue Catalog resides (for example, `us-east-1`).
6.  Under the S3 storage configuration, provide your S3 bucket path (`s3://my-lakehouse-bucket/`).
7.  Save the configuration.

Once connected, Dremio scans the Glue Catalog and displays the `analytics` database along with the `orders` and `customers` tables in its workspace tree. You can immediately run high-performance queries across these tables:

```sql
/* Join query executed in Dremio */
SELECT
  c.name,
  o.order_date,
  o.amount
FROM glue_catalog.analytics.orders o
JOIN glue_catalog.analytics.customers c ON o.customer_id = c.customer_id
WHERE o.status = 'COMPLETED';
```

### Why the Dremio Engine is Faster

The Dremio engine uses several architectural optimizations to execute queries faster than standard query engines.

#### 1. Apache Arrow Vectorized Execution

The Dremio engine processes data using Apache Arrow as its internal memory format. Apache Arrow organizes data in memory column-by-column rather than row-by-row. When Dremio reads Parquet files from S3, it loads the column arrays directly into memory without performing expensive row-to-column serialization and deserialization.

By executing query operations directly on memory column arrays, Dremio maximizes CPU cache efficiency and utilizes SIMD (Single Instruction, Multiple Data) instructions to process multiple data values in parallel.

#### 2. Local Coordinator Metadata Caching

When a query engine plans a query, it must retrieve the table's schema and locate the physical data files. For Iceberg, this requires reading metadata JSON files, manifest lists, and manifest files. Doing this for every query adds latency, especially when communicating with remote catalogs and object stores.

The Dremio engine solves this by caching Iceberg metadata on its local coordinator nodes. When a new query is submitted, Dremio checks the Glue Catalog to see if the table's current metadata pointer has changed. If the pointer has not changed, Dremio plans the query using the cached metadata, bypassing S3 network requests. This local caching reduces planning times from seconds to milliseconds.

#### 3. Positional Delete File Caching

In Iceberg tables that use the Merge-on-Read (MoR) write strategy, updates and deletes are written to separate delete files rather than rewriting the base Parquet files. When reading the table, query engines must merge these delete files with the base files to filter out deleted rows. Loading and parsing delete files for every query scan adds substantial overhead.

Dremio accelerates this process by caching positional delete files in memory. Rather than reading the delete files from S3 for every query, the engine maintains an active cache of deleted row indexes, applying them to base data scans at memory speed.

#### 4. Data Reflections and the Apache Calcite Optimizer

The most powerful acceleration feature in Dremio is Data Reflections. Reflections are pre-computed physical layouts of tables or joins that are stored as optimized Parquet files on S3. They are similar to materialized views, but with a critical difference: users do not query Reflections directly. Instead, they query the logical tables, and the Dremio optimizer automatically rewrites the query to use the Reflection.

Dremio uses Apache Calcite to parse incoming SQL queries into logical algebra trees. The optimizer then applies algebraic transformation rules to determine if a query can be satisfied by reading an active Reflection.

Calcite's query rewriter performs advanced tree matching. It matches projections, selection filters, and aggregations. Even if a user query does not exactly match the Reflection structure (for instance, if the query requests a subset of the fields or applies a filter that can be evaluated on top of the Reflection's data), Calcite rewrites the execution plan to use the Reflection.

For example, we can create an Aggregation Reflection on our joined orders and customers dataset:

```sql
/* Create an aggregation reflection for order analysis */
ALTER TABLE glue_catalog.analytics.orders
ADD REFLECTION state_revenue_summary
USING AGGREGATION
DIMENSIONS (customer_id, order_date, status)
MEASURES (amount);
```

When a user executes the query to calculate revenue by state:

```sql
SELECT c.state, SUM(o.amount)
FROM glue_catalog.analytics.orders o
JOIN glue_catalog.analytics.customers c ON o.customer_id = c.customer_id
GROUP BY c.state;
```

The Dremio optimizer analyzes the query plan, matches it against the `state_revenue_summary` Reflection, and rewrites the query execution plan to read the pre-computed summary. This avoids scanning millions of raw rows, returning the result in milliseconds.

---

## 7. Operational Best Practices and Compaction Mechanics

To maintain a healthy open lakehouse on AWS, you should implement the following operational patterns.

### The Small Files Problem in Detail

As new records are added to Iceberg tables via streaming ingest or frequent small batch jobs, the number of small files on S3 can multiply rapidly. This is known as the "small files problem." A query engine reading a table with thousands of tiny files spends more time opening and closing S3 files than reading data.

In S3, each GET request introduces a small connection setup latency. If a query scans 10,000 files of 10 KB each, it must perform 10,000 GET requests, resulting in substantial network delay. If those same records are compacted into a single 100 MB Parquet file, the engine makes a single GET request, reading the data at maximum network speed.

### Compaction Execution

You should configure automated compaction routines using Spark or Athena to merge small files into larger, optimized Parquet files (typically 128 MB to 512 MB). Athena allows you to run compaction on Iceberg tables using the `OPTIMIZE` command:

```sql
/* Run bin-packing compaction on the orders table */
OPTIMIZE analytics.orders WRITE_PROPERTIES ('vacuum_max_metadata_files_to_keep'='10');
```

This merges the small Parquet files in active partitions into larger files, improving read speeds.

For large enterprise datasets, you can perform more advanced compaction routines using Spark SQL procedures. The `rewrite_data_files` procedure allows you to configure sort strategies, such as Z-Ordering, to group related data spatially:

```python
# Execute Spark compaction with Z-Ordering
spark.sql("""
    CALL glue_catalog.system.rewrite_data_files(
      table => 'analytics.orders',
      strategy => 'sort',
      sort_order => 'customer_id, order_date'
    )
""")
```

This procedure reorganizes files on S3 so that records with similar customer IDs and order dates are stored in the same Parquet files, maximizing row group skipping effectiveness.

### Expiring Snapshots

While Iceberg's snapshot history is valuable for time travel and auditing, retaining every snapshot indefinitely increases your storage costs. Every snapshot references data files that may have been deleted or updated.

To prevent storage bloat, you must regularly run snapshot expiration. Athena provides procedures to expire historical snapshots:

```sql
/* Expire snapshots older than seven days */
ALTER TABLE analytics.orders EXECUTE EXPIRE_SNAPSHOTS(CAST(current_date - interval '7' day AS TIMESTAMP));
```

This command deletes older metadata snapshots and permanently removes unreferenced data files from S3, lowering storage costs.

### Monitoring S3 Request Rates

Even with hashed prefixes, you should monitor your bucket metrics in Amazon CloudWatch. Track `5xx` error rates and S3 request statistics. If you see elevated `503 Throttling` errors, check that your partitioning strategy is not grouping too many concurrent writes into a single folder, and ensure that Iceberg's object storage routing features are enabled.

---

## 8. Summary

Building an open lakehouse on AWS using Apache Iceberg, the AWS Glue Catalog, and S3 provides a reliable, cost-efficient, and scalable foundation for enterprise data platforms. By separating computing engines from storage, you can select the best tool for every query workload:

- Use **AWS Athena** for serverless, ad-hoc queries, automated data transformations, and exploratory data analysis.
- Use the **Dremio engine** to deliver sub-second interactive query performance for BI dashboards and high-concurrency applications.

Through features like Apache Arrow vectorized execution, local metadata coordinator caching, and Apache Calcite-powered Data Reflections, Dremio eliminates object storage latency, allowing you to run interactive analytical queries directly on your open data lakehouse.
