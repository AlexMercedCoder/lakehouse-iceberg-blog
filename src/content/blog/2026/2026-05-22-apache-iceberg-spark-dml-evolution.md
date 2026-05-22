---
title: "Apache Iceberg with Spark: Create, MERGE, Upsert, and Evolve Tables End to End"
pubDatetime: 2026-05-22T10:00:00Z
description: "A comprehensive developer guide to configuring Apache Spark with Apache Iceberg, executing transactional writes, and managing schema evolution."
author: "Alex Merced"
tags:
  - apache spark
  - apache iceberg
  - data engineering
  - lakehouse
slug: 2026-05-22-apache-iceberg-spark-dml-evolution
draft: false
---

The open data lakehouse architecture separates query execution from physical data storage, allowing organizations to deploy specialized engines for different workloads. Within this ecosystem, Apache Spark acts as a powerful processing engine for large scale data transformation, batch ingestion, and complex analytical pipelines. However, running Spark directly on top of legacy data lakes using raw file formats like Parquet or JSON introduces significant operational challenges. Without a transactional catalog, concurrent writes can corrupt data, schema changes require rewriting complete tables, and listing directories across cloud storage introduces high latency.

Apache Iceberg addresses these limitations by providing a logical table metadata layer. It enables acid transaction guarantees, snapshot isolation, hidden partitioning, and in-place schema evolution. When integrated with Apache Spark, Iceberg allows data engineers to execute transactional writes, perform upserts using SQL queries, and alter table layouts without interrupting downstream readers.

This guide provides a comprehensive walkthrough of integrating Apache Spark with Apache Iceberg. We explore catalog configuration, schema setup, transactional write patterns, and schema evolution. We also analyze the differences between Copy on Write and Merge on Read table modes, showing how high performance query engines like Dremio accelerate read execution over Spark written tables.

---

## 1. Integrating Apache Spark and Apache Iceberg

To run Apache Iceberg operations inside Apache Spark, the Spark engine must interface with the Iceberg metadata library and catalog systems. This integration is handled by the Spark DataSourceV2 (DSv2) API. The DSv2 framework allows Spark to delegate metadata tracking, file routing, and transaction commits directly to Iceberg. This delegation bypasses Spark's legacy file writer interfaces, ensuring that Spark can write data safely while Iceberg coordinates the transaction.

### Spark Extensions and Catalogs

Integrating Iceberg requires configuring Spark to utilize specialized extensions. The principal extension is `org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions`. This extension modifies Spark's Catalyst Optimizer, adding support for Iceberg specific SQL statements such as `MERGE INTO`, `CALL` procedures, and alter commands.

Additionally, you must define one or more catalogs. Catalogs track the current state of tables by maintaining a pointer to the active metadata JSON file. Common catalog implementations include:

- **REST Catalog**: The standard, engine neutral REST interface (such as Apache Polaris or Project Nessie) that manages table pointers via secure HTTP endpoints.
- **AWS Glue Catalog**: A cloud native service that tracks table locations and schema structures within the AWS environment.
- **Hive Metastore**: The legacy catalog pattern that uses a relational database to track table directory structures.
- **Hadoop Catalog**: A file system based catalog that uses folder paths and metadata files to track table pointers directly.

By defining these catalogs in the Spark configuration, you allow Spark to resolve table names, fetch active schemas, and commit transaction snapshots.

---

## 2. Configuring the PySpark Environment

To construct a local or cloud based development environment, you must pass specific configuration parameters to the SparkSession builder. The configuration details the jar packages, catalog mappings, and storage directories.

The following Python script illustrates how to initialize a PySpark session configured to use Apache Iceberg with a local Hadoop catalog.

```python
from pyspark.sql import SparkSession

# Initialize SparkSession with Iceberg extensions and a local Hadoop catalog
spark = SparkSession.builder \
    .appName("IcebergSparkDMLEvolution") \
    .config("spark.jars.packages", "org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:1.5.2") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.local", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.local.type", "hadoop") \
    .config("spark.sql.catalog.local.warehouse", "/tmp/warehouse") \
    .getOrCreate()
```

### Explaining Key Configurations

- **`spark.jars.packages`**: Downloads the Iceberg Spark runtime jar file, which matches the Spark version (3.5) and Scala version (2.12). This package contains the reader/writer implementations, metadata parser, and SQL extensions.
- **`spark.sql.extensions`**: Registers the Iceberg extensions with Spark's query parser, enabling SQL command modifications.
- **`spark.sql.catalog.local`**: Defines a new catalog namespace named `local`. You can reference tables in this catalog using the prefix `local.db_name.table_name`.
- **`spark.sql.catalog.local.type`**: Configures the catalog to run as a Hadoop catalog, which reads and writes metadata files directly on the local file system.
- **`spark.sql.catalog.local.warehouse`**: Sets the physical directory path where table folders, data files, and metadata logs are stored.

For cloud deployments using AWS S3, you would append configurations to use `S3FileIO` instead of standard file implementations, passing credentials and endpoint URLs as shown below:

```python
# Cloud S3 configuration extensions (optional)
# .config("spark.sql.catalog.local.io-impl", "org.apache.iceberg.aws.s3.S3FileIO")
# .config("spark.sql.catalog.local.s3.endpoint", "https://s3.amazonaws.com")
```

---

## 3. Designing Data Schemas and Table Creation

To illustrate DML writes and schema modifications, we establish a standard relational database layout. We define the `analytics.orders` and `analytics.customers` tables. These tables track customer orders and profiles, providing a consistent reference schema for our SQL and PySpark code blocks.

### Table Schemas

The database layout is organized around two key entities:

1.  **`analytics.customers`**: Stores profile information including identifier, name, email address, and country.
2.  **`analytics.orders`**: Stores transaction history including order ID, customer reference ID, transaction date, order amount, and status.

The following Spark SQL script creates these tables inside the local catalog namespace.

```sql
/* Create the customers table */
CREATE TABLE local.analytics.customers (
    customer_id BIGINT,
    name STRING,
    email STRING,
    country STRING
) USING iceberg;

/* Create the orders table partitioned by month and bucketed by customer */
CREATE TABLE local.analytics.orders (
    order_id BIGINT,
    customer_id BIGINT,
    order_date DATE,
    amount DECIMAL(10, 2),
    status STRING
) USING iceberg
PARTITIONED BY (month(order_date), bucket(customer_id, 16));
```

### Partitioning Strategy

In the `analytics.orders` table creation statement, we configure a partitioning layout using partition transforms:

- **`month(order_date)`**: Iceberg extracts the year and month from the date, grouping data files into logical partitions (such as `2026-05`). This transform speeds up time series queries and prevents partition granularity from becoming too small.
- **`bucket(customer_id, 16)`**: Iceberg hashes the customer ID and distributes records across 16 hash buckets. This transform ensures that files are distributed evenly, which optimizes parallel processing during join queries.

Because Iceberg uses hidden partitioning, these partition fields are computed in metadata. Downstream query writers do not need to query the derived partition fields directly, which prevents common filter errors and avoids directory scanning latency.

---

## 4. Writing Data: Append and Overwrite Operations

Once tables are created, you can write data using Spark's SQL interface or Spark DataFrame APIs. In Spark 3.x, DataFrame writes are handled using the DataFrameWriter V2 API, which provides a type safe interface for catalog operations.

The following Python code illustrates how to load transactional datasets into memory and write them to the catalog tables.

```python
# Prepare seed data for customers
customers_data = [
    (101, "Alice Smith", "alice@example.com", "USA"),
    (102, "Bob Jones", "bob@example.com", "Canada"),
    (103, "Charlie Green", "charlie@example.com", "UK")
]
customers_df = spark.createDataFrame(customers_data, ["customer_id", "name", "email", "country"])

# Append customer records to the customers table
customers_df.writeTo("local.analytics.customers").append()

# Prepare seed data for orders
orders_data = [
    (1, 101, "2026-05-15", 150.50, "Shipped"),
    (2, 102, "2026-05-20", 89.99, "Processing"),
    (3, 103, "2026-05-22", 210.00, "Completed")
]
# Convert order_date column explicitly to date type
from pyspark.sql.functions import col
orders_df = spark.createDataFrame(orders_data, ["order_id", "customer_id", "order_date", "amount", "status"])
orders_df = orders_df.withColumn("order_date", col("order_date").cast("date"))

# Append order records to the orders table
orders_df.writeTo("local.analytics.orders").append()
```

### Transaction Isolation and Commits

Every append or write operation in Apache Iceberg represents a single, atomic transaction. When Spark tasks finish writing files to object storage, the driver compiles a list of new data files and attempts to commit them by writing a new metadata JSON file.

This commit process follows optimistic concurrency control rules. If another process commits a change during the write task, Spark retries the transaction by reading the updated catalog pointer and applying the writes to the new state. This design guarantees that readers always observe consistent snapshots, preventing dirty reads or partial writes from exposing corrupted records.

### Dynamic Partition Overwrites

When updating data tables, data engineers often need to overwrite data within specific partition ranges. In legacy Hive structures, overwriting a partition required deleting folder directories manually, which risked data loss if queries failed mid process.

Iceberg resolves this using metadata overwrites. By enabling dynamic partition overwrite mode, Spark replaces data files only in the partitions affected by the incoming write set:

```python
# Configure Spark to use dynamic partition overwrite mode
spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")

# Overwrite orders data for May 2026 without altering historical files in other months
new_orders_df = spark.createDataFrame([
    (2, 102, "2026-05-20", 95.00, "Shipped") # Updated record
], ["order_id", "customer_id", "order_date", "amount", "status"])
new_orders_df = new_orders_df.withColumn("order_date", col("order_date").cast("date"))

new_orders_df.writeTo("local.analytics.orders").overwritePartitions()
```

When this operation completes, Iceberg registers a new snapshot. The table pointers are updated so that queries for May 2026 resolve to the new file layout, while older partitions (such as April or March) remain unchanged and active.

---

## 5. Transactional Upserts with MERGE INTO

Data pipelines often process streaming updates or change data capture logs that must be integrated into target tables. Performing these modifications row by row in legacy data lakes required rewriting entire tables. Iceberg solves this by supporting the Spark SQL `MERGE INTO` statement.

The `MERGE INTO` statement allows engineers to perform upserts, modifying matching records and inserting new records in a single transactional step.

### SQL Upsert Example

The following SQL command merges an incremental update dataset into the `analytics.orders` table, updating order status values and inserting new transactions.

```sql
/* Create a staging table containing incremental updates */
CREATE TABLE local.analytics.orders_stage (
    order_id BIGINT,
    customer_id BIGINT,
    order_date DATE,
    amount DECIMAL(10, 2),
    status STRING
) USING iceberg;

/* Insert sample updates into staging */
INSERT INTO local.analytics.orders_stage VALUES
(2, 102, CAST('2026-05-20' AS DATE), 95.00, 'Completed'), /* Update status of order 2 */
(4, 101, CAST('2026-05-22' AS DATE), 450.00, 'Processing'); /* Insert new order 4 */

/* Merge staging records into target table */
MERGE INTO local.analytics.orders AS target
USING local.analytics.orders_stage AS source
ON target.order_id = source.order_id
WHEN MATCHED THEN
  UPDATE SET target.amount = source.amount, target.status = source.status
WHEN NOT MATCHED THEN
  INSERT (order_id, customer_id, order_date, amount, status)
  VALUES (source.order_id, source.customer_id, source.order_date, source.amount, source.status);
```

### Matching Logic and Predicate Evaluation

When executing a `MERGE INTO` query, Spark translates the SQL logic into a physical plan:

1.  **Join Predicates**: Spark performs a join operation between the target table and the source staging table using the specified key column (`order_id`).
2.  **Row Classification**: Rows that match the join key are routed to the update engine block, while unmatched staging records are routed to the insert writer block.
3.  **Metadata Alignment**: When the writes finish, Iceberg generates a new metadata snapshot that incorporates both the modified files and the newly appended files in a single atomic transaction.

---

## 6. Under the Hood: Copy on Write vs. Merge on Read

To balance write latency and read execution speed, Apache Iceberg supports two distinct write modes: **Copy on Write (CoW)** and **Merge on Read (MoR)**. You can configure these modes on a per table basis using table properties.

### Copy on Write Mode

Copy on Write is the default mode for Iceberg tables. When a write task updates or deletes rows inside a data file, the write engine reads the source data file, applies the updates in memory, and writes the entire data set back as a new Parquet data file.

This process isolates mutations at the file level:

- **Pros**: Query planning remains simple. Query engines scan only the active data files without performing runtime join logic. This configuration delivers optimal read performance.
- **Cons**: Significant write amplification. Updating a single row inside a 512 MB Parquet file requires writing a new 512 MB file, which consumes write I/O and storage resources.

### Merge on Read Mode

Merge on Read minimizes write amplification by leaving the source data files unmodified during an update or delete. Instead of rewriting the data file, the write engine writes the changed data rows into new data files and records the location of modified rows inside separate **delete files**.

These delete files are cataloged in the manifest metadata and are merged with data files at query execution time:

- **Pros**: Writes are fast and require minimal I/O. This configuration is ideal for high frequency streaming ingestion or live CDC feeds.
- **Cons**: Increased read latency. Query engines must read the delete files and merge them with data files dynamically, which consumes CPU and memory.

### Positional vs. Equality Deletes

Merge on Read supports two formats for tracking deleted or updated records:

1.  **Positional Deletes**: The delete file contains the target data file path and the absolute row position offsets (indexes) of the deleted rows. This format is efficient because readers can seek directly to the offsets during a file scan.
2.  **Equality Deletes**: The delete file contains the value of key columns (such as `order_id = 2`). When reading, the engine must perform a join operation on the key columns, which requires building a hash table in memory.

### Dremio Positional Delete Caching

To minimize the read latency associated with Merge on Read tables, high performance query engines like Dremio implement **Positional Delete Caching**.

When a query scans a partition containing positional delete files, Dremio's Sabot execution engine decodes the row offsets and caches them as in memory bitmaps on the executor nodes. As the columnar reader scans data blocks from Parquet files, it references this delete bitmap directly. The engine skips the deleted row indexes during the vectorized Apache Arrow buffer projection.

This caching design eliminates the need to read delete files repeatedly from object storage for concurrent queries. It also avoids row by row join evaluations, allowing MoR tables to achieve sub second query latencies close to CoW tables.

---

## 7. Schema Evolution on the Fly in Spark

A common source of failures in legacy architectures is managing schema changes. If a database schema changes, downstream pipelines often break. Apache Iceberg solves this by using immutable column IDs, allowing safe schema evolution without physical data modifications.

In Spark, schema changes can be executed using SQL commands or automatically during PySpark DataFrame writes by enabling schema merging.

### SQL Alterations in Spark

You can execute alterations on the `analytics.orders` table directly using Spark SQL. These commands modify metadata configuration records without rewriting data files:

```sql
/* Add a new column to track discount rates */
ALTER TABLE local.analytics.orders ADD COLUMN discount_rate DOUBLE;

/* Rename the status column to transaction_status */
ALTER TABLE local.analytics.orders RENAME COLUMN status TO transaction_status;

/* Drop the discount_rate column from the active layout */
ALTER TABLE local.analytics.orders DROP COLUMN discount_rate;
```

Because Iceberg tracks fields using unique column IDs, dropping a column does not require removing bytes from physical files. The catalog removes the column ID from the active schema definition, and readers ignore the column block during file scans.

### Schema Merging during DataFrame Writes

If your applications produce datasets with varying schemas, you can configure Spark to merge these changes automatically into the target table during write operations by setting the `mergeSchema` option to `true`.

```python
# Create a DataFrame containing an evolved customers schema
evolved_data = [
    (104, "David Miller", "david@example.com", "Germany", "Gold") # Contains new column 'tier'
]
evolved_df = spark.createDataFrame(evolved_data, ["customer_id", "name", "email", "country", "tier"])

# Append data and merge the new 'tier' column into the analytics.customers table
evolved_df.writeTo("local.analytics.customers") \
    .option("mergeSchema", "true") \
    .append()
```

When this write task completes, Iceberg reads the incoming DataFrame schema, detects the new column `tier`, assigns it a new unique column ID, appends it to the active schema, and commits the transaction. Older files are not rewritten. When read, they return null values for the `tier` field.

---

## 8. Spark Performance Tuning for Iceberg Writes

To prevent file fragmentation and ensure optimal query performance, data engineers must tune how Spark writes data files to Iceberg tables.

### Write Distribution Modes

When Spark writes data across multiple parallel tasks, it can distribute rows arbitrarily. This arbitrary distribution can lead to a single task writing small files to hundreds of partitions, which degrades storage performance.

You can control this behavior using the `write.distribution-mode` table property:

```sql
/* Configure write distribution on the orders table */
ALTER TABLE local.analytics.orders SET TBLPROPERTIES (
    'write.distribution-mode' = 'hash'
);
```

The available write distribution modes are:

1.  **`none`**: Spark writes rows directly without repartitioning. This mode has low write latency but can generate thousands of small files if rows are not sorted.
2.  **`hash`**: Spark clusters rows by partition keys using a hash partitioner before writing them. This mode minimizes the number of active file writers and prevents small file fragmentation.
3.  **`sort`**: Spark sorts the rows by partition keys and sorting specifications before writing. This mode optimizes Parquet column compression and improves read speeds, but increases CPU usage during writes.

### Target File Sizes

You can configure the target file size for writes using table properties. For Parquet files, a target size between 128 MB and 512 MB is recommended to balance query parallelization and file listing overhead:

```sql
/* Set the target file size to 256 MB */
ALTER TABLE local.analytics.orders SET TBLPROPERTIES (
    'write.parquet.compression-codec' = 'zstd',
    'write.target-file-size-bytes' = '268435456'
);
```

By using the Z standard (zstd) compression codec and setting a target file size of 256 MB, you ensure that Spark writes highly compressed files that are optimal for cloud object storage scans.

---

## 9. Querying and Accelerating Spark-Written Tables via Dremio

While Apache Spark is optimized for batch writing and heavy transformations, serving analytical reports and BI dashboards requires a query engine that can deliver sub second response times. Once Spark commits data to the Iceberg catalog, Dremio can query the tables directly.

Dremio accelerates reads over evolved and partitioned Iceberg tables using key architectural optimizations:

### The Sabot Vectorized Engine

Dremio bypasses JVM execution pipelines by loading Parquet data directly into in memory Apache Arrow record batches. The Sabot engine processes these columnar Arrow arrays using CPU register vectorization.

If Spark has evolved a table schema, Dremio's vectorized Arrow projector handles the changes in memory. For missing columns in older files, Dremio projects null vectors directly. For promoted types, it executes vectorized sign extensions in the CPU registers. This design avoids row by row serialization loops, maintaining fast query execution.

### Dynamic Metadata Caching

On cloud storage networks, listing directories to plan queries introduces high latency. Dremio eliminates this overhead by caching the Iceberg metadata JSON files, partition specifications, and manifest lists locally on its coordinator nodes.

When a query is submitted, Dremio reads the cached metadata to locate the target Parquet files. This local metadata resolution allows Dremio to plan queries in milliseconds, avoiding remote HTTP storage calls.

### Data Reflections

Dremio's Data Reflections provide pre-computed materializations (stored as Iceberg tables) that Dremio queries automatically to accelerate analytical workloads.

If Spark modifies a table schema or partitioning specification, Dremio's query compiler automatically updates the mapping logic. The compiler determines whether the reflection can satisfy the query predicate, rewriting execution paths on the fly.

This automatic redirection delivers sub second query latencies for BI dashboards without requiring database administrators to rebuild materializations or update user SQL queries.

---

## 10. Deep Dive: Catalyst Optimizer Integrations and DSv2 Internals

Understanding how Spark integrates with Iceberg at a compiler level is crucial for building resilient data architectures. When you add the `IcebergSparkSessionExtensions` to your Spark configuration, Spark replaces its standard logical planning strategies with custom Iceberg implementations.

In standard Spark operations, writing to a file format like Parquet relies on the legacy DataSourceV1 API, which executes writes row-by-row through an execution plan that is opaque to the transactional store. Under the DataSourceV2 (DSv2) framework, the write process is negotiated between Spark's Catalyst Optimizer and the Iceberg library through formal interfaces.

When Spark compiles a write plan, the Catalyst Optimizer evaluates the query. If the target is an Iceberg table, it transforms the logical plan into a `WriteToDataSourceV2` node. This node coordinates with Iceberg's `SparkWrite` class to determine how data will be cataloged and distributed across executor nodes.

During the execution phase, Spark tasks running on separate executors write their partition blocks to temporary data files in object storage. Each task generates a list of `DataFile` metadata entries containing the physical file paths, file sizes, partition values, row counts, and column-level min/max statistics. These metadata records are returned to the driver node at the end of the write stage.

Once the driver collects all task results, it initiates the commit phase. The Iceberg transaction manager updates the table metadata by executing the following actions:

1.  **Read Active Snapshot**: The catalog retrieves the current metadata file pointer to resolve the table state.
2.  **Verify Concurrency**: Under optimistic concurrency rules, the manager checks if another writer has committed a new snapshot since this write task began. If a conflict is detected, Iceberg attempts to reconcile the change (for example, verifying if an append is non-overlapping with a concurrent delete).
3.  **Generate Manifest File**: A new manifest file is created to catalog the newly written Parquet files along with their column-level statistics.
4.  **Update Manifest List**: Iceberg writes a new manifest list file, which acts as an index pointing to all active manifest files for the table.
5.  **Write Table Metadata**: A new table metadata JSON file is written, containing the schema configuration, partition spec, and the reference ID of the new snapshot.
6.  **Swap Catalog Pointer**: The catalog performs an atomic swap operation (such as a database compare-and-swap or filesystem rename) to update the current pointer to the new metadata JSON file.

By using this structured commit process, Iceberg ensures that Spark writes are fully transaction-safe. The physical Parquet files are only visible to readers after the catalog pointer swap completes. If a Spark task fails mid-execution, the temporary files are ignored by readers and cleaned up during orphan file maintenance, preventing partial or corrupted data from corrupting analytical queries.

---

## 11. Multi-Catalog Configurations and Cloud Setup Nuances

In enterprise environments, data lakes rarely span a single catalog. It is common to query data across multiple environments, such as integrating an AWS Glue catalog with a local developer catalog or an open REST catalog like Apache Polaris.

Spark's catalog configuration rules allow you to define multiple active catalogs within the same session. By prefixing catalog names to Spark properties, you configure independent endpoints, authentication credentials, and storage backends.

The following configurations illustrate how to register an AWS Glue catalog, a Nessie REST catalog, and a local Hadoop catalog in a single SparkSession configuration setup:

```properties
# Local Hadoop Catalog Config
spark.sql.catalog.local=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.local.type=hadoop
spark.sql.catalog.local.warehouse=/tmp/warehouse

# AWS Glue Catalog Config
spark.sql.catalog.aws_glue=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.aws_glue.catalog-impl=org.apache.iceberg.aws.glue.GlueCatalog
spark.sql.catalog.aws_glue.warehouse=s3://my-enterprise-bucket/warehouse
spark.sql.catalog.aws_glue.io-impl=org.apache.iceberg.aws.s3.S3FileIO

# Project Nessie REST Catalog Config
spark.sql.catalog.nessie=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.nessie.catalog-impl=org.apache.iceberg.nessie.NessieCatalog
spark.sql.catalog.nessie.uri=http://localhost:19120/api/v1
spark.sql.catalog.nessie.ref=main
spark.sql.catalog.nessie.warehouse=s3://my-enterprise-bucket/nessie-warehouse
spark.sql.catalog.nessie.io-impl=org.apache.iceberg.aws.s3.S3FileIO
```

### Addressing Cloud-Specific Storage Nuances

When writing data to S3 or Google Cloud Storage, standard Hadoop filesystem configurations can introduce significant performance bottlenecks. To bypass these legacy limitations, Iceberg implements native FileIO interfaces such as `S3FileIO` and `GCSFileIO`.

These native implementations offer several operational benefits:

- **Direct API Calls**: Bypasses the legacy Hadoop FileSystem wrapper, executing direct cloud storage API commands for file writes and catalog metadata reads.
- **Vectorized Reads**: Supports range reads to fetch specific Parquet column footer metadata blocks in parallel, reducing network I/O overhead.
- **Multipart Uploads**: Optimizes high-throughput writes by streaming file blocks in parallel to cloud storage, preventing memory exhaustion on executor nodes.
- **Credential Vending Integration**: Interfaces with REST catalogs to request temporary cloud storage access credentials, eliminating the need to distribute static IAM keys to Spark clusters.

By combining multi-catalog configurations with native cloud FileIO layers, data engineers can build hybrid lakehouse architectures that span local testing sandboxes, cloud warehouses, and secure REST catalogs.

---

## 12. Advanced MERGE INTO Execution Mechanics

The `MERGE INTO` statement is one of the most complex SQL query operations Spark executes over Iceberg tables. To manage writes efficiently, data engineers must configure how Spark performs these join operations.

When Spark compiles a merge query, it evaluates the update and insert conditions and determines how to match rows between the source and target datasets. Depending on the table size and sorting properties, Spark selects one of two join execution strategies:

1.  **Broadcast Hash Join**: If the source staging table is small (such as an incremental change capture log of a few megabytes), Spark broadcasts the staging table to all executor nodes. This strategy avoids sorting or partitioning the target table, executing the merge operation in a single stage.
2.  **Shuffle Hash Join**: If both the target table and the source table are large, Spark executes a full shuffle join. It repartitions both datasets by the merge join key across the cluster network. This repartitioning step ensures that matching records are routed to the same executor nodes for evaluation.

### Tuning Write Amplification for Merge Queries

Merge queries can generate significant write amplification if the target tables are not sorted or partitioned correctly. You can tune these operations by configuring the target table properties:

```sql
/* Optimize merge query performance */
ALTER TABLE local.analytics.orders SET TBLPROPERTIES (
    'write.merge.mode' = 'merge-on-read',
    'write.update.mode' = 'merge-on-read',
    'write.delete.mode' = 'merge-on-read'
);
```

By default, updates and deletes execute in Copy-on-Write mode, which rewrites complete Parquet files even for minor changes. Setting the write mode to Merge-on-Read directs Spark to append delete files instead.

To optimize read speeds after high-frequency updates, you should run regular compaction routines to consolidate delete files and merge them back into the base Parquet format:

```sql
/* Compact orders table partitions to merge delete files */
CALL local.system.rewrite_data_files(
    table => 'analytics.orders',
    strategy => 'sort',
    sort_order => 'order_id ASCNullsLast'
);
```

This compaction call reads the data and delete files, applies all updates, and writes optimized Parquet files back to storage, restoring optimal read speeds for downstream query engines like Dremio.

---

## 13. Troubleshooting Common Spark and Iceberg Errors

Integrating Spark and Iceberg can lead to specific configuration and runtime exceptions. Understanding these errors helps diagnose issues quickly.

### 1. ClassNotFoundException: SparkCatalog

If you receive a ClassNotFoundException for `org.apache.iceberg.spark.SparkCatalog` when starting a SparkSession, Spark is unable to locate the runtime jar files on its execution classpath.

- **Root Cause**: The Iceberg runtime package is missing from Spark's executor or driver classpath libraries.
- **Resolution**: Verify that the `--packages` flag is correctly specified or that the jar file is present in Spark's default jar folder. Ensure that the package version matches the Spark version and Scala version exactly (for example, `iceberg-spark-runtime-3.5_2.12` for Spark 3.5).

### 2. CommitFailedException: Concurrent Modification

This error occurs when multiple Spark write tasks attempt to commit changes to the same Iceberg table snapshot simultaneously.

- **Root Cause**: Optimistic concurrency control validation failed because the catalog reference pointer has been modified by another process.
- **Resolution**: Increase the number of catalog commit retries by setting `'commit.retry.num-retries' = '10'` in the table properties. Alternatively, structure orchestration pipelines to avoid concurrent write processes targeting the same table.

### 3. AnalysisException: Cannot write incompatible data to table

This validation exception is raised when the schema of the incoming DataFrame does not match the target Iceberg table structure.

- **Root Cause**: Type promotion rules were violated or columns were missing in the DataFrame without enabling schema merging.
- **Resolution**: Cast columns explicitly to the target schema types before appending. If adding new fields, set `.option("mergeSchema", "true")` or execute an `ALTER TABLE` query first to define the new fields in the metadata.

---

## 14. Summary and Best Practices Checklist

Integrating Apache Spark with Apache Iceberg allows organizations to build reliable, scalable data platforms. By managing writes in metadata and tracking column references with immutable IDs, Iceberg prevents data corruption and simplifies schema management.

To maintain performance, data engineers should follow this operational checklist:

- **Configure SQL Extensions**: Ensure `IcebergSparkSessionExtensions` is loaded to enable commands like `MERGE INTO` and `UPDATE`.
- **Align Partition Specifications**: Use logical partition transforms like `month()` or `bucket()` to optimize file layout and prune queries automatically.
- **Select the Right Write Mode**: Deploy Copy on Write (CoW) tables for read-heavy analytical workloads. Use Merge on Read (MoR) tables for high frequency streaming ingestion or live CDC pipelines.
- **Manage File Fragmentation**: Set the target file size property (`write.target-file-size-bytes`) to 256 MB or 512 MB, and set the write distribution mode to `hash` or `sort` to prevent small file generation.
- **Deploy Dremio for BI serving**: Run Dremio over Spark written Iceberg tables to accelerate query execution. Use Dremio's vectorized Arrow reader, metadata caching, and reflections to deliver sub second response times.
