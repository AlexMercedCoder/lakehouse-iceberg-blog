---
title: "Iceberg Catalogs Compared: REST, Glue, Hive, Polaris, Nessie"
pubDatetime: 2026-05-22T10:00:00Z
modDatetime: 2026-10-15T12:00:00Z
description: "Iceberg catalogs track each table's current metadata file and make commits atomic. Compare REST, Glue, Hive, Nessie, Polaris, S3 Tables, and Snowflake Horizon."
author: "Alex Merced"
tags:
  - apache iceberg
  - catalogs
  - Nessie
  - Polaris
  - data engineering
slug: 2026-05-22-apache-iceberg-catalogs-explained
draft: false
faqs:
  - question: "What does an Apache Iceberg catalog do?"
    answer: "A catalog maps each table name to the location of its current metadata file and swaps that pointer atomically when a write commits. That atomic swap is what lets several engines read and write the same tables without corrupting them."
  - question: "What are the main types of Iceberg catalogs?"
    answer: "Iceberg ships clients for REST, Hive Metastore, AWS Glue, JDBC, Nessie, and Hadoop (file system) catalogs. The REST protocol is the common interface today: Apache Polaris, Project Nessie, Unity Catalog, the AWS Glue Iceberg REST endpoint, Amazon S3 Tables, and Snowflake Horizon Catalog all serve it."
  - question: "Should I use a REST catalog, AWS Glue, or Hive Metastore for Iceberg?"
    answer: "Use a REST catalog for new multi-engine platforms because every major engine speaks it and it supports credential vending. Glue fits AWS-only stacks and now exposes its own Iceberg REST endpoint. Keep Hive Metastore mainly where existing Hive infrastructure already runs."
  - question: "Is Project Nessie still maintained?"
    answer: "Yes. Nessie is still released (0.109.0 shipped on October 8, 2026), it adds Git-like branches and tags across tables, and it can serve the Iceberg REST API as well as its native API."
  - question: "Can I move an Iceberg table to a new catalog without rewriting data?"
    answer: "Yes. Stop writes, then call the register_table procedure in the new catalog with the table's current metadata.json location. The data and metadata files stay where they are; only the catalog pointer is created."
---

_Reviewed October 15, 2026 against the [Iceberg REST catalog docs](https://iceberg.apache.org/docs/latest/rest-catalog/), [Apache Polaris 1.8.0 docs](https://polaris.apache.org/), [AWS Glue Iceberg REST endpoint](https://docs.aws.amazon.com/glue/latest/dg/connect-glu-iceberg-rest.html), and [Snowflake Horizon Catalog for external engines](https://docs.snowflake.com/en/user-guide/tables-iceberg-query-using-external-query-engine-snowflake-horizon)._

In a modern database architecture, data files are typically managed by a monolithic server that controls storage, query planning, metadata, and security. However, the modern open lakehouse paradigm decouples query computing engines from physical storage. Organizations regularly query the same physical dataset using multiple engines, such as Apache Spark for heavy ETL transformation, Trino for interactive dashboard queries, AWS Athena for ad-hoc queries, and Dremio for high performance analytics.

Decoupling storage and compute introduces a fundamental coordinator problem. If multiple computing engines are querying and writing to the same set of Parquet files in an object store like Amazon S3, how do they agree on the current state of a table? How do they prevent concurrent writes from corrupting data? How do they track historical snapshots for time travel queries without expensive directory list operations?

Apache Iceberg solves these issues by maintaining a hierarchical tree of metadata. The root of this metadata structure is the table metadata file, which is a JSON document containing the schema, partition rules, and snapshot histories of the table. However, the query engines still need a mechanism to find the location of the active metadata JSON file. Object stores have historically offered no atomic rename and no native locking, so engines cannot safely coordinate concurrent commits through the storage layer alone. This coordinator role is fulfilled by the Apache Iceberg catalog.

---

## 1. The Historical Context: The Limitations of Legacy Catalogs

To understand the value of modern Apache Iceberg catalogs, it is necessary to examine how older data lake systems managed table metadata. The legacy standard for data lake catalogs was the Hive Metastore, which was originally developed for Apache Hive.

### How the Hive Metastore Tracked Tables

In a Hive-style table, the database catalog did not track individual data files or transactional snapshots. Instead, it tracked tables and partitions as physical directories in a file system. For example, if you had a table named `analytics.orders` partitioned by order date, the catalog would store a mapping in a relational database, such as MySQL or PostgreSQL, indicating that the table was located at `hdfs:///user/hive/warehouse/analytics.orders`.

When new data was added to a partition, files were written directly to the directory corresponding to that partition, for instance, `hdfs:///user/hive/warehouse/analytics.orders/order_date=2026-05-22/`. The query engine determined which files were part of the table by listing all the files in that directory.

### HDFS vs Cloud Object Storage: The Technical Disconnect

The Hive Metastore design was optimized for the Hadoop Distributed File System (HDFS). On HDFS, folder structures are true physical directories managed by an active NameNode. The NameNode acts as an in-memory transactional coordinator that manages block allocations and directory paths. Consequently, listing files in a folder or renaming a directory are fast metadata operations because they are executed as single memory state swaps in the NameNode.

When data systems migrated to cloud object storage like Amazon S3, Google Cloud Storage, or Azure Data Lake Storage, this directory-based tracking model encountered serious technical issues:

- **Prefix Scans and Rate Limits:** S3 is not a hierarchical file system; it is a key-value store. S3 paths like `s3://bucket/folder/file.parquet` are flat string keys. To simulate directory listing, query engines must execute prefix scans. S3 restricts prefix scans (typically to 1,000 keys per request). Querying a table with thousands of partitions requires hundreds of sequential API calls. This network overhead degrades performance, causing query planning to consume substantial CPU cycles before actual data reading begins.
- **The Directory Rename Bottleneck:** Renaming a directory on a local system is a metadata pointer swap. In cloud object storage, there is no directory pointer. Renaming a directory requires copying every object to a new key and then deleting the old key. If an engine attempts to rename a directory to commit a transaction and the network drops midway, the table is left in an inconsistent state, with some data residing under the old prefix and some under the new prefix.
- **No Transaction Isolation:** Since legacy systems rely on file system visibility, any file written to a partition folder is instantly read by active queries. If an ETL job is appending files while a dashboard is running, the dashboard query reads partial data, leading to inconsistent analytics results.

Apache Iceberg eliminates these limitations by shifting the physical file tracking from the directory level to the file level. Rather than listing prefixes, query engines read explicit lists of files stored in Iceberg's metadata JSON documents. The catalog's role is simplified: it no longer tracks directories; it only tracks the current location of the root table metadata JSON file.

---

## 2. The Core Functions of the Iceberg Catalog

The Apache Iceberg catalog is the single source of truth for the physical location of an Iceberg table. In a decoupled open lakehouse, it serves three critical architectural functions: state management, atomic transaction commits, and multi-engine coordination.

### Central State Manager

The catalog functions as a lookup service. An Iceberg table is identified by a logical path, such as `analytics.orders`. The catalog maps this path to the URI of the current table metadata JSON file.

When a query engine starts planning a query, it contacts the catalog and requests this metadata URI. The engine then reads the JSON file from storage and extracts the location of manifest lists and data files. Because it relies on the catalog for metadata pointers, the engine does not perform prefix scans, ensuring fast query planning regardless of table size.

### Locking Coordinator and Transaction Commit

The catalog is critical during write transactions. To commit a transaction, an engine must update the table pointer from the old metadata JSON file to a new metadata JSON file. If two engines try to write to the same table concurrently, they must perform this pointer swap atomically.

The catalog acts as the locking coordinator to guarantee atomicity. It ensures that only one write succeeds. The pointer swap must be an all-or-nothing operation. If the pointer swap is successful, the transaction is committed, and the new snapshot becomes visible to downstream readers. If another engine has successfully committed a transaction in the millisecond interval between the reader's check and the write commit, the catalog rejects the second swap. The catalog returns a conflict error, prompting the second engine to reload the updated metadata, resolve conflicts, and try the commit again.

### Multi-Engine Coordination

In an open lakehouse, multiple engines use different programming environments and platforms. For instance, a Spark engine written in Java and a PyIceberg tool written in Python must be able to read and write to the same tables. The catalog acts as a translator, allowing these diverse clients to communicate with a unified system. It translates logical table names like `analytics.customers` into the physical directories where files reside, ensuring consistent access across different platforms.

---

## 3. Deep Dive into Catalog Implementations

There are several types of Iceberg catalogs. The choice of catalog determines how tables are locked, which engines can write to them, and how metadata is stored. Let us review the principal options in detail.

### The REST Catalog (The Open Standard)

The Apache Iceberg REST Catalog is the standard protocol for catalog operations. Unlike other catalogs that depend on specific client libraries, the REST catalog defines a standard set of JSON payloads and HTTP endpoints.

Instead of writing database-specific drivers, engines use standard HTTP clients to interact with a REST catalog server. The server manages the backend storage database and coordinates the lock. This model isolates engines from database configuration, security credentials, and storage location details.

### AWS Glue Catalog

The AWS Glue Catalog is a managed metadata store provided by AWS. It is a common choice for architectures deployed entirely on Amazon Web Services. When using Iceberg's `GlueCatalog` client, Iceberg uses Glue's catalog API to store the location of the metadata JSON file as a table parameter. Glue also exposes an Iceberg REST endpoint (`https://glue.<region>.amazonaws.com/iceberg`, authenticated with SigV4), so engines can use the standard REST client instead.

Glue handles transaction coordination with optimistic locking: each table carries a version ID, and an update succeeds only if that ID has not changed since the writer read it. The principal benefit of AWS Glue is that it is a serverless, zero maintenance service integrated with AWS IAM, Amazon Athena, and AWS Glue ETL jobs. However, accessing Glue outside of AWS requires configuring IAM credentials, and API rate limits can become an issue when executing thousands of concurrent writes.

### Amazon S3 Tables

Amazon S3 Tables store Iceberg tables in a dedicated bucket type called a table bucket. S3 manages the catalog for those tables, runs compaction, snapshot management, and unreferenced file removal automatically, and supports Iceberg format v3. Engines reach S3 Tables through the AWS Glue Data Catalog integration or an Iceberg REST endpoint.

### Project Nessie (Git-for-Data)

Project Nessie is an open source transactional catalog designed for lakehouses, and it remains actively released (0.109.0 in October 2026). Besides its native API, current Nessie servers also serve the Iceberg REST API. It brings Git-like version control concepts to data tables. Nessie allows users to create branches, merge changes, tag specific commits, and roll back tables to historical configurations.

Nessie achieves this by tracking catalog references in a versioned key-value store, such as PostgreSQL or RocksDB. When you commit a transaction, Nessie records a commit in its commit tree, pointing to the new table metadata JSON. This architecture enables multi-table transactions. For example, you can write changes to `analytics.orders` and `analytics.customers` inside a `staging` branch, and then merge the branch into `main` in a single transaction.

### Apache Polaris

Apache Polaris is an open source catalog that implements the Apache Iceberg REST specification. It graduated to an Apache top-level project in February 2026, and its current release is 1.8.0. Polaris provides role-based access control (RBAC) and credential vending for S3, Azure, and GCS storage.

Polaris separates catalog administration from database access. It allows data platform administrators to define access policies once in Polaris, and then apply those rules to every engine that connects through it, such as Spark, Trino, Flink, and Dremio. Managed services build on it too: Dremio Catalog is built on Apache Polaris. Because it implements the REST spec, Polaris works with any client engine that supports the REST catalog standard.

### Snowflake Horizon Catalog and Open Catalog

Snowflake allows users to create Iceberg tables where Snowflake acts as either the catalog and writer, or as a reader of tables managed by an external catalog. When Snowflake manages the catalog, it handles metadata generation and pointer swaps internally.

External engines like Spark, Trino, and DuckDB reach Snowflake-managed Iceberg tables through Snowflake Horizon Catalog's Iceberg REST endpoint, which integrates Apache Polaris and supports both reads and writes with vended credentials. Snowflake Open Catalog, the managed Polaris service, still serves existing customers, but Snowflake's docs direct new customers to Horizon Catalog for multi-engine Iceberg access.

---

## 4. Deep Dive into the Iceberg REST Catalog API Specification

To appreciate the design of the REST Catalog, we must look at the specific API interactions defined by the Apache Iceberg REST specification. When an engine connects to a REST catalog, it utilizes a set of standard REST resource endpoints. In the spec, table routes carry an optional catalog prefix (`/v1/{prefix}/namespaces/...`); the examples below omit it for readability.

### 1. The Config Service

Before the engine performs any table operations, it sends a config request to the server:
`GET /v1/config`

The response payload is a JSON document containing catalog properties. This config bootstrap allows the server to send runtime properties to the client: `defaults` apply unless the client overrides them, `overrides` win over client settings, and current servers also list the `endpoints` they support:

```json
{
  "defaults": {
    "rest-page-size": "100"
  },
  "overrides": {
    "prefix": "my_warehouse"
  }
}
```

### 2. Resolving Table Locations

When a query planner needs to resolve a table name like `analytics.orders`, it executes a get request to the table endpoint:
`GET /v1/namespaces/analytics/tables/orders`

The catalog server responds with a JSON payload detailing the complete state of the table, including schema fields, partition specs, and the exact URI of the current metadata file:

```json
{
  "metadata-location": "s3://my-shared-lakehouse-bucket/analytics/orders/metadata/v4.metadata.json",
  "metadata": {
    "format-version": 2,
    "table-uuid": "a8934b5c-89fd-4d2d-90c1-38290f847291",
    "location": "s3://my-shared-lakehouse-bucket/analytics/orders",
    "last-sequence-number": 12,
    "last-updated-ms": 1716382800000,
    "last-column-id": 5,
    "current-schema-id": 0,
    "schemas": [
      {
        "type": "struct",
        "schema-id": 0,
        "fields": [
          { "id": 1, "name": "order_id", "required": true, "type": "string" },
          {
            "id": 2,
            "name": "customer_id",
            "required": true,
            "type": "string"
          },
          { "id": 3, "name": "order_date", "required": true, "type": "date" },
          { "id": 4, "name": "status", "required": true, "type": "string" },
          { "id": 5, "name": "amount", "required": true, "type": "double" }
        ]
      }
    ],
    "default-spec-id": 0,
    "partition-specs": [
      {
        "spec-id": 0,
        "fields": [
          {
            "name": "order_date_day",
            "transform": "day",
            "source-id": 3,
            "field-id": 1000
          }
        ]
      }
    ]
  }
}
```

### 3. The Commit Protocol

During a write transaction, the query engine writes data and manifest files to storage, then sends the catalog a list of requirements and metadata updates in a post request:
`POST /v1/namespaces/analytics/tables/orders`

The request body does not carry a new metadata file. It carries assertions about the state the writer started from, plus the changes to apply; the server writes the new metadata JSON itself:

```json
{
  "requirements": [
    {
      "type": "assert-table-uuid",
      "uuid": "a8934b5c-89fd-4d2d-90c1-38290f847291"
    },
    {
      "type": "assert-ref-snapshot-id",
      "ref": "main",
      "snapshot-id": 8027658604211071519
    }
  ],
  "updates": [
    {
      "action": "add-snapshot",
      "snapshot": {
        "snapshot-id": 8027658604211071520,
        "timestamp-ms": 1716382900000,
        "summary": {
          "operation": "append",
          "spark.app.id": "app-20260522"
        },
        "manifest-list": "s3://my-shared-lakehouse-bucket/analytics/orders/metadata/snap-8027658604211071520.avro"
      }
    },
    {
      "action": "set-snapshot-ref",
      "ref-name": "main",
      "type": "branch",
      "snapshot-id": 8027658604211071520
    }
  ]
}
```

The REST server checks every requirement against the table's current state. If they all hold (here: same table UUID, and `main` still points at the snapshot the writer started from), the server applies the updates, writes a new metadata file, swaps its pointer, and returns 200 OK with the new metadata. If a concurrent write has moved `main`, the assertion fails, and the server returns 409 Conflict so the client can refresh and retry.

### Credential Vending: Securing the Storage Layer

One of the most powerful features of the REST Catalog spec is **credential vending**. In a traditional lakehouse environment, every query engine must have direct read and write access to the cloud storage bucket (such as S3 or ADLS) containing the raw data files. This requirement complicates security, as it forces administrators to manage broad IAM roles or access keys across multiple computing platforms.

With credential vending, client engines do not need pre-configured storage keys. Instead, the process works as follows:

1. The engine requests the catalog to load a table and asks for vended credentials with the `X-Iceberg-Access-Delegation: vended-credentials` header: `GET /v1/namespaces/analytics/tables/orders`.
2. The REST Catalog server verifies that the user's role has permission to access the table.
3. The server contacts the cloud provider's STS (Security Token Service) to generate short-lived, restricted storage credentials.
4. The server returns these temporary credentials to the engine in the `storage-credentials` (or `config`) field of the load table response.
5. The engine uses the temporary credentials to read or write the physical Parquet data files directly from the object store.
6. Once the session ends, the temporary credentials expire, securing the storage layer from unauthorized access.

### Standard REST Catalog Error Handling

The Iceberg REST Catalog specification defines structured error JSON responses so client libraries can handle failures deterministically. Standard error formats include:

- **400 Bad Request:** Sent when a query parameter or request body is malformed.
- **401 Unauthorized:** Sent when the OAuth2 authorization token is invalid, expired, or missing.
- **404 Not Found:** Returned when a requested table or namespace does not exist.
- **409 Conflict:** Sent during a table commit transaction when the target pointer has changed.
- **500 Internal Server Error:** Used for unhandled system exceptions in the catalog backend. For a commit, a 500 (or 502/504) means the outcome is unknown, so clients must not assume the commit failed.

---

## 5. Branching and Commits: Nessie and Polaris Architecture

### Project Nessie Versioned Key-Value Layout

Project Nessie is structured differently from traditional catalogs. While a typical REST catalog stores a simple database table containing mapping records, Nessie maintains a complete version graph.

Nessie stores its commit log in a backing store such as PostgreSQL (via JDBC), RocksDB, DynamoDB, MongoDB, Cassandra, or Bigtable. The commit log records commits as nodes containing:

- A unique hash identifier.
- A parent commit hash reference.
- A map of active table paths and their associated metadata JSON URIs.

This key-value layout allows Nessie to perform Git-like operations:

1.  **Zero-Copy Branching:** Creating a branch is a metadata operation that registers a new name pointing to an existing commit hash in the database.
2.  **Isolated Writes:** When an engine writes to a branch, the write commits a new node on that branch's path. Other branches remain unaffected, isolating the write.
3.  **Merge Operations:** Merging updates a target branch's head to point to the commit hash of the source branch. If both branches modified the same table concurrently, Nessie rejects the merge, requesting conflict resolution.

### Polaris Security and Administration Architecture

The Polaris catalog implements the Iceberg REST spec but adds administrative structures to manage multiple independent catalogs and cloud environments.

Administrators configure Polaris using its management API. The administrative layer is structured around these entities:

- **Catalogs:** Named spaces representing distinct metadata scopes, such as a catalog for production and a catalog for testing. Each catalog is tied to a storage type (S3, Azure, or GCS).
- **Principals:** Identities representing users, client applications, Spark jobs, or query engines.
- **Principal roles:** Groups of principals, such as `data_engineer`.
- **Catalog roles:** Sets of privileges on objects inside one catalog (for example, write access to `analytics`, read-only access to `customers`). Privileges are granted to catalog roles, and catalog roles are granted to principal roles.

This separation ensures that security teams can manage permissions in Polaris, while query engines connect using standard REST clients, unaware of the underlying security layout.

---

## 6. Locking Strategies: Relational Databases vs Serverless Catalogs

The mechanism a catalog uses to handle table locks determines its reliability and scale limits. Let us analyze the locking strategies implemented across different systems.

### Relational Database Locks (REST, Hive)

For REST catalogs backed by relational databases (like PostgreSQL), transaction atomicity is achieved using database transactions. When an engine commits a pointer update, the REST server executes a SQL statement:

```sql
/* Execute a table write lock within PostgreSQL */
SELECT metadata_location
FROM table_metadata
WHERE table_name = 'analytics.orders'
FOR UPDATE;
```

This query blocks other database transactions from updating the same row. The catalog server verifies that the metadata location matches, writes the new metadata row, and commits the transaction, releasing the lock. While reliable, this model can block connections under high write concurrency, as transactions wait for database locks.

### Version-ID Optimistic Locking (Glue)

Iceberg's Glue client uses Glue's built-in optimistic locking to manage table pointer swaps (a DynamoDB lock manager is only needed with very old AWS SDK versions):

1. Iceberg reads the Glue table record containing the current metadata URI and records its version ID.
2. Iceberg writes the new metadata URI with an update that names that version ID.
3. If the version still matches, Glue applies the update and the version changes.
4. If another writer changed the table first, Glue rejects the update; Iceberg refreshes metadata, checks for a real conflict, and retries if there is none.

This optimistic model performs well under moderate write concurrency, but high conflict rates can degrade performance, as clients repeatedly fail conditional writes and retry.

---

## 7. Cross-Engine Catalog Configuration

To build an open lakehouse, you must configure multiple query engines to share a single catalog. This setup ensures that if a PySpark job writes to a table, a Dremio query can access the data instantly.

Let us walk through configuring a shared REST Catalog across a PySpark pipeline and a Dremio engine, using our standard schemas.

### PySpark Catalog Configuration

To configure PySpark to connect to a shared REST catalog, we pass the catalog class, URI, credentials, and warehouse parameters to the Spark configuration.

```python
from pyspark.sql import SparkSession

# Define Spark Session with REST Catalog properties
spark = SparkSession.builder \
    .appName("SharedRESTCatalogSetup") \
    .config("spark.jars.packages", "org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:1.12.0,org.apache.iceberg:iceberg-aws-bundle:1.12.0") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.rest_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.rest_catalog.type", "rest") \
    .config("spark.sql.catalog.rest_catalog.uri", "http://rest-catalog-server:8181") \
    .config("spark.sql.catalog.rest_catalog.credential", "client_id:client_secret") \
    .config("spark.sql.catalog.rest_catalog.warehouse", "my_warehouse") \
    .config("spark.sql.catalog.rest_catalog.header.X-Iceberg-Access-Delegation", "vended-credentials") \
    .getOrCreate()
```

Once configured, we can initialize our standard tables using Spark SQL:

```sql
/* Create analytics namespace under our rest_catalog */
CREATE NAMESPACE IF NOT EXISTS rest_catalog.analytics;

/* Create the orders table in the REST catalog */
CREATE TABLE IF NOT EXISTS rest_catalog.analytics.orders (
    order_id STRING,
    customer_id STRING,
    order_date DATE,
    status STRING,
    amount DOUBLE
)
USING iceberg
PARTITIONED BY (days(order_date));

/* Create the customers table in the REST catalog */
CREATE TABLE IF NOT EXISTS rest_catalog.analytics.customers (
    customer_id STRING,
    name STRING,
    email STRING,
    state STRING,
    signup_date DATE
)
USING iceberg;
```

### PySpark Insert Script

We can execute an insert pipeline to populate data into these tables:

```python
from datetime import date
from pyspark.sql.types import StructType, StructField, StringType, DateType, DoubleType

# Define data for orders
order_data = [
    ("O1001", "C2001", date(2026, 5, 20), "COMPLETED", 150.50),
    ("O1002", "C2002", date(2026, 5, 21), "PENDING", 45.00),
    ("O1003", "C2001", date(2026, 5, 22), "COMPLETED", 300.00)
]

schema_orders = StructType([
    StructField("order_id", StringType(), True),
    StructField("customer_id", StringType(), True),
    StructField("order_date", DateType(), True),
    StructField("status", StringType(), True),
    StructField("amount", DoubleType(), True)
])

df_orders = spark.createDataFrame(order_data, schema=schema_orders)
df_orders.writeTo("rest_catalog.analytics.orders").append()
```

### Configuring Trino for the REST Catalog

Trino can be configured to read and write to the same REST catalog by adding a catalog configuration file to its `etc/catalog/` directory, for example, `etc/catalog/rest_catalog.properties`:

```properties
connector.name=iceberg
iceberg.catalog.type=rest
iceberg.rest-catalog.uri=http://rest-catalog-server:8181
iceberg.rest-catalog.security=OAUTH2
iceberg.rest-catalog.oauth2.credential=client_id:client_secret
iceberg.rest-catalog.warehouse=my_warehouse
iceberg.rest-catalog.vended-credentials-enabled=true
```

With this configuration, Trino users can query the table using the same name:
`SELECT * FROM rest_catalog.analytics.orders;`

### Configuring Apache Flink for the REST Catalog

For real-time streaming jobs, Apache Flink can connect to the REST catalog using its SQL client or Table API. The configuration is defined in Flink's SQL client configuration:

```sql
CREATE CATALOG rest_catalog WITH (
  'type'='iceberg',
  'catalog-type'='rest',
  'uri'='http://rest-catalog-server:8181',
  'credential'='client_id:client_secret',
  'warehouse'='my_warehouse'
);
```

By standardizing catalog access, all three engines (Spark, Trino, Flink) can interact with the table metadata concurrently, with the catalog coordinating commits and enforcing isolation levels.

---

## 8. Dremio Integration and Query Acceleration

Once PySpark has written the data and committed the transaction through the REST Catalog, other query engines can access the new records instantly. Dremio integrates directly with Iceberg REST catalogs, providing interactive query execution.

### Connecting Dremio to the REST Catalog

To query the shared tables in Dremio, you add the catalog as a data source in the Dremio administrator console:

1. Navigate to **Add Source** in the Dremio UI.
2. Select **Iceberg REST Catalog** under Lakehouse Catalogs.
3. Configure the connection parameters:
   - **Name:** `rest_catalog`
   - **REST URI:** `http://rest-catalog-server:8181`
   - **Authentication Type:** OAuth2 Client Credentials
   - **Client ID & Client Secret:** Input the credentials matching the Spark configuration.
4. Leave **Use vended credentials** on (the default) if the catalog vends credentials; otherwise supply S3 access for `s3://my-shared-lakehouse-bucket/` under Advanced Options.
5. Click **Save** to initialize the source.

Once connected, Dremio displays the `analytics` namespace and the tables (`orders` and `customers`) in its metadata catalog tree. You can query the tables using standard ANSI SQL without running any manual table synchronization jobs:

```sql
/* Execute a cross-table join query in Dremio */
SELECT
    o.order_id,
    c.name,
    o.amount,
    o.order_date
FROM rest_catalog.analytics.orders o
JOIN rest_catalog.analytics.customers c
    ON o.customer_id = c.customer_id
WHERE o.status = 'COMPLETED'
  AND o.amount > 100.00;
```

### Explaining Dremio Query Acceleration

While standard SQL execution works out of the box, the Dremio engine implements architectural optimizations that make reads significantly faster than raw storage queries.

```
                 Dremio Engine Acceleration Layer

              +------------------------------------+
              |          Dremio Optimizer          |
              |       (Apache Calcite Planner)      |
              +-----------------+------------------+
                                |
             Is there an active Reflection matched?
                     /                      \
                  (Yes)                     (No)
                   /                          \
+-----------------v---------------+    +-------v-----------------+
|   Rewrite Query to Reference    |    |   Direct Table Scan     |
|   Aggregation/Raw Reflection    |    |   Using Vectorized      |
|   (Pre-computed Parquet cache)  |    |   Using Apache Arrow     |
+---------------------------------+    +-------+-----------------+
                                               |
                                    Check Local Coordinator Cache
                                               |
                                    Are metadata files cached?
                                           /            \
                                        (Yes)           (No)
                                         /                \
                    +-------------------v---+    +---------v-------------+
                    | Skip Object Store API |    | Read Metadata JSON    |
                    | Call for Metadata     |    | from Cloud Storage    |
                    +-----------------------+    +-----------------------+
```

#### Vectorized Memory Layout (Apache Arrow)

The Dremio engine uses Apache Arrow as its internal memory format. Apache Arrow is a columnar in-memory data layout that permits vectorized query processing. When Dremio reads Parquet files from S3, it processes data in memory without performing expensive row-to-column serialization and deserialization. By executing instructions directly on column arrays, the engine maximizes CPU cache locality and hardware performance.

#### Local Coordinator Metadata Cache

When an engine plans an Iceberg query, it must read the hierarchical metadata tree (the JSON metadata file, the manifest list, and individual manifest files). If the storage layer is cloud object storage (like S3), fetching these metadata files introduces significant network latency.

The Dremio engine avoids this latency using a local coordinator cache. Dremio caches the parsed Iceberg metadata on its coordinator nodes. When a new query arrives, Dremio checks if the catalog has updated the table pointer. If the pointer has not changed, Dremio plans the query using the cached metadata, avoiding the need to make network requests to cloud storage. This optimization reduces query planning times from seconds to milliseconds.

#### Applying Row-Level Deletes

Iceberg supports row-level updates and deletes in copy-on-write or merge-on-read mode. In merge-on-read tables, readers must read the base data files and apply delete files (or deletion vectors on v3 tables) at runtime, which adds work to every scan.

Dremio applies position deletes inside its vectorized reader as row-position filters rather than joins. Regular compaction still matters, because it removes the delete files every engine would otherwise have to read.

#### Reflections and Calcite Cost-Based Optimization

The Dremio engine includes a query acceleration feature called Data Reflections. Reflections are pre-computed layouts of tables or joins that are stored as Iceberg tables.

When a user executes a query, the Dremio optimizer (built on Apache Calcite) checks if the query structure matches an active Reflection. Dremio uses Calcite to parse the query into an abstract syntax tree (AST) and then convert it into a logical algebra representation. The optimizer applies multiple transformation rules to check if a logical query block can be replaced by a pre-aggregated or raw reflection scan.

This replacement is evaluated using a cost-based model. If the optimizer determines that reading the Reflection requires scanning fewer bytes and blocks than executing the original join or aggregation, it rewrites the query plan. This rewrite is transparent to the user, so queries that would scan millions of raw records can read a much smaller pre-computed result instead.

---

## 9. Catalog Migration Strategies

Migrating existing tables to a shared Iceberg catalog requires careful planning to prevent write downtime and verify metadata accuracy. Let us examine the two primary migration paths.

### 1. In-Place Catalog Migration (Register Table)

If you have existing Iceberg tables registered in a legacy catalog (such as Hive Metastore) and want to migrate to a REST catalog (like Polaris), you do not need to rewrite or move the data files.

Because Iceberg tables are defined by their metadata JSON file, you can register the table directly in the new catalog:

1. Retrieve the current metadata JSON path from the source catalog.
2. Stop writers so no transactions are running on the table.
3. Execute a register command in the new catalog, pointing to the active metadata JSON location.
4. Verify the registered table using Spark or Dremio.
5. Drop the old catalog entry without purging files (for example `DROP TABLE` without `PURGE`), so only one catalog can commit.

In Spark, step 3 is the `register_table` procedure:

```sql
CALL rest_catalog.system.register_table(
    table => 'analytics.orders',
    metadata_file => 's3://my-shared-lakehouse-bucket/analytics/orders/metadata/00042-abc.metadata.json'
);
```

The open source Iceberg Catalog Migrator tool (listed under Apache Polaris tools) automates this for many tables at once.

This register operation is a metadata-only transaction that completes in milliseconds, avoiding the need to read or rewrite physical Parquet blocks.

### 2. External Table Migration (Parquet to Iceberg)

If your legacy tables are stored as raw Parquet files (non-Iceberg format) and registered in Hive Metastore, you must upgrade them to Iceberg tables. You can achieve this using Spark's in-place metadata translation procedures, which work on tables in Spark's session catalog (`spark_catalog`) backed by Hive Metastore:

- **Snapshot Procedure:** Creates a new Iceberg table by reading the existing Parquet files. The old Parquet table remains active.
- **Migrate Procedure:** Converts the existing Parquet table directly into an Iceberg table, replacing the old table in the catalog.

```sql
/* Convert an existing Hive Parquet table to Iceberg in place */
CALL spark_catalog.system.migrate(
    table => 'analytics.orders'
);
```

This migration process reads the existing Parquet footers and generates corresponding Iceberg metadata files (manifests and JSON metadata) without rewriting the underlying data. The migrated table lives in the Hive Metastore; to move it to a REST catalog afterward, use `register_table` as shown above.

---

## 10. Catalog Best Practices

To maintain a healthy lakehouse, organizations should adhere to several operational best practices when designing and managing their Iceberg catalogs.

### Design a Single Source of Truth

Avoid registering the same physical table data files in multiple independent catalogs. For example, do not register the same table in both an AWS Glue Catalog and a Project Nessie catalog. Because catalogs do not share transaction states, they cannot coordinate concurrent writes. If two catalogs modify the same files, they will overwrite each other's pointers, causing metadata corruption and data loss. Always designate a single catalog to act as the writer, and configure other engines to sync or read from that catalog.

### Configure Automatic Metadata Cleanup

Every write operation to an Iceberg table creates new metadata files, manifest files, and physical data files. Over time, these historical files accumulate, increasing object storage costs and catalog pointer overhead.

Implement a maintenance process to clean up historical files. In Spark, you can run system procedures to expire snapshots and remove orphan files:

```sql
/* Expire snapshots older than 7 days */
CALL rest_catalog.system.expire_snapshots(
    table => 'analytics.orders',
    older_than => TIMESTAMP '2026-05-15 00:00:00.000'
);

/* Clean up physical files no longer tracked by metadata */
CALL rest_catalog.system.remove_orphan_files(
    table => 'analytics.orders'
);
```

### Implement Monotonic ID Counters for Column Resolution

Iceberg resolves table columns using unique column IDs, rather than column names. This design is what allows Iceberg to support schema evolution operations, like column renames and reordering, without rewriting data.

When designing custom REST catalog servers or database integrations, ensure that column ID assignment is strictly monotonic. If column IDs are recycled during column drop and add operations, client engines can misalign columns during query planning, leading to incorrect query results.

### Choose the REST Spec for Long Term Portability

When building a new data lakehouse, prioritize REST-compliant catalogs like Apache Polaris or another catalog that implements the Iceberg REST spec. By using REST as the primary connection interface, you future-proof your architecture. If you decide to change your backend catalog database or migrate from AWS to Google Cloud, you can swap the REST catalog server without modifying the configuration of your query engines. This decoupling ensures your data lakehouse remains open and portable.

---

## Frequently Asked Questions

### What does an Apache Iceberg catalog do?

A catalog maps each table name to the location of its current metadata file and swaps that pointer atomically when a write commits. That atomic swap is what lets several engines read and write the same tables without corrupting them.

### What are the main types of Iceberg catalogs?

Iceberg ships clients for REST, Hive Metastore, AWS Glue, JDBC, Nessie, and Hadoop (file system) catalogs. The REST protocol is the common interface today: Apache Polaris, Project Nessie, Unity Catalog, the AWS Glue Iceberg REST endpoint, Amazon S3 Tables, and Snowflake Horizon Catalog all serve it.

### Should I use a REST catalog, AWS Glue, or Hive Metastore for Iceberg?

Use a REST catalog for new multi-engine platforms because every major engine speaks it and it supports credential vending. Glue fits AWS-only stacks and now exposes its own Iceberg REST endpoint. Keep Hive Metastore mainly where existing Hive infrastructure already runs.

### Is Project Nessie still maintained?

Yes. Nessie is still released (0.109.0 shipped on October 8, 2026), it adds Git-like branches and tags across tables, and it can serve the Iceberg REST API as well as its native API.

### Can I move an Iceberg table to a new catalog without rewriting data?

Yes. Stop writes, then call the register_table procedure in the new catalog with the table's current metadata.json location. The data and metadata files stay where they are; only the catalog pointer is created.
