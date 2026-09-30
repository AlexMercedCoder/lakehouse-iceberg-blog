---
title: "Common Misconceptions About Data Lakehouse and Apache Iceberg"
pubDatetime: 2026-05-22T09:00:00Z
description: "Addressing common search queries and reader confusion about Data Lakehouse architectures, Apache Iceberg catalogs, partitions, and lock-in."
author: "Alex Merced"
tags:
  - data lakehouse
  - apache iceberg
  - data engineering
slug: 2026-05-22-data-lakehouse-and-iceberg-misconceptions
draft: false
faqs:
  - question: "Is a data lakehouse just a database on object storage?"
    answer: "No. A data lakehouse separates storage from compute, using open file formats (like Parquet) and open table formats (like Apache Iceberg) to enable multiple diverse query engines to query and update the same data concurrently without copying it."
  - question: "Does Apache Iceberg replace my data catalog?"
    answer: "No. Apache Iceberg is a table format specification. You still need an Iceberg catalog (like Apache Polaris, Nessie, or a REST Catalog) to manage table-level transactions, namespaces, and atomic pointer updates."
  - question: "Does Apache Iceberg cause partition lock-in?"
    answer: "No. Iceberg uses hidden partitioning. Partition values are derived from the actual columns at query time. If you decide to change your partitioning strategy, you can evolve the partitioning spec instantly without rewrites."
---

The open data lakehouse has emerged as the standard architecture for modern data platforms. By combining the governance and transactions of a data warehouse with the scale and cost efficiency of a data lake, the lakehouse allows organizations to run analytics, business intelligence, and machine learning on a single copy of data.

However, as adoption has surged, so has architectural confusion. A significant amount of terminology overlap and vendor-specific marketing has led to misconceptions among data engineers and architects. In this guide, we address the most common misconceptions about data lakehouse architectures and Apache Iceberg. We analyze the underlying design principles and metadata behaviors to help you build a robust and highly performant data stack.

---

## 1. Misconception: "A Data Lakehouse Is Just a Database on Object Storage"

A common initial reaction from database developers looking at the lakehouse pattern is: _"Is this not just a traditional database, but we are placing the files in S3 or ADLS instead of local disks?"_

### Decoupling Compute and Storage

A traditional relational database (RDBMS) or cloud data warehouse (like Snowflake or Google BigQuery in its traditional model) tightly couples its storage format with its query engine. Only the database's own query processor can read or write the internal files. These engines utilize proprietary, closed layouts that organize data into customized page structures. For example, PostgreSQL organizes records into 8 KB page blocks, while cloud warehouses use custom columnar formats optimized for their own execution networks.

A data lakehouse separates the two layers entirely:

```
┌────────────────────────────────────────────────────────┐
│                     COMPUTE LAYER                      │
│   ┌───────────────┐ ┌───────────────┐ ┌─────────────┐  │
│   │  Dremio (SQL) │ │ Apache Spark  │ │ Flink (CDC) │  │
│   └───────┬───────┘ └───────┬───────┘ └───────┬─────┘  │
└───────────┼─────────────────┼─────────────────┼────────┘
            │                 │                 │
            ▼                 ▼                 ▼
┌────────────────────────────────────────────────────────┐
│                     METADATA LAYER                     │
│                    [Apache Iceberg]                    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                      │
│             [Cloud Object Storage (S3/GCS)]            │
└────────────────────────────────────────────────────────┘
```

In a decoupled architecture, the storage tier consists of open file formats like Apache Parquet or ORC, and the metadata tier uses open table formats like Apache Iceberg. Because the metadata and data structures are open standards, multiple query engines can query and modify the same data files simultaneously.

For instance, you can ingest high-velocity data using Apache Flink, run heavy batch transformation jobs using Apache Spark, and execute interactive SQL queries or BI dashboards using Dremio, all pointing to the exact same files on S3. No data duplication or ingestion pipelines are needed to sync data between different tools.

### Query Engine Execution on Open Formats

When you submit a query to Dremio or Spark querying an Iceberg table, the engine does not request data through a proprietary storage manager. Instead, it reads the Iceberg metadata files directly from S3 to determine which specific Parquet files contain the matching rows. The engine then uses its own execution workers to fetch those Parquet files, process the columns in memory, and stream the results back.

This model eliminates vendor lock-in. If a new, faster query engine or a cheaper processing tool is introduced, you can immediately point it at your existing Iceberg tables on S3 and begin querying. You do not need to execute expensive migrations or format conversions.

Furthermore, decoupling compute from storage changes the economics of data platform scaling. In a traditional database, if you need more compute power to support concurrent queries during business hours, you must scale the entire database cluster. This scales storage and compute in lockstep, forcing you to pay for storage you do not need. In a lakehouse, storage capacity is billed at cheap object storage rates (approximately 23 dollars per terabyte per month on AWS S3), while compute resources can be scaled up or paused dynamically on an hourly basis.

### Columnar Cloud Caching and Vectorized Execution

To achieve performance parity with coupled systems, modern lakehouse engines employ advanced caching and execution strategies. For example, Dremio implements a Columnar Cloud Cache (C3) that automatically caches Parquet blocks on local NVMe SSDs in compute nodes as queries run. Subsequent queries bypass the object store, fetching data directly from local NVMe, which reduces read latency. Dremio also processes data in-memory using Apache Arrow, which organizes records in columnar format, maximizing CPU cache locality and enabling SIMD hardware vectorization. To avoid traditional JDBC or ODBC serialization bottlenecks, clients fetch results via Arrow Flight SQL, which streams data over gRPC, ensuring high throughput for AI agents and analytical applications.

---

## 2. Misconception: "Apache Iceberg Replaces My Catalog"

Another common point of confusion is the role of the metadata catalog. Because Apache Iceberg has configuration settings and classes called catalogs (such as <code>GlueCatalog</code>, <code>NessieCatalog</code>, or <code>RestCatalog</code>), many believe that adopting Iceberg eliminates the need for an external catalog.

### The Metadata Hierarchy

To understand why this is a misconception, we must look at how Apache Iceberg coordinates a table change. Iceberg structures metadata hierarchically:

```
                  ┌──────────────────────┐
                  │    Catalog Pointer   │
                  └──────────┬───────────┘
                             │ (Resolves to latest metadata JSON)
                  ┌──────────▼───────────┐
                  │  Table Metadata JSON │
                  └──────────┬───────────┘
                             │ (Tracks snapshots)
                  ┌──────────▼───────────┐
                  │     Manifest List    │
                  └──────────┬───────────┘
                             │ (Groups manifest files)
                  ┌──────────▼───────────┐
                  │     Manifest File    │
                  └──────────┬───────────┘
                             │ (Tracks individual Parquet files)
                  ┌──────────▼───────────┐
                  │   Data/Delete Files  │
                  └──────────────────────┘
```

1. **Table Metadata File (JSON):** This file stores the table's schema, partition specifications, properties, and a history of previous snapshots.
2. **Manifest List (Avro):** Every commit or snapshot creates a manifest list. This file contains a list of manifest files that make up that specific snapshot, along with stats for each manifest (like partition ranges and file counts).
3. **Manifest File (Avro):** Manifests track individual data and delete files. They store column-level statistics (min/max values, null counts) for each Parquet file.
4. **Data and Delete Files:** The physical files (usually Parquet) that contain the actual records.

### An Anatomy of the Table Metadata JSON

To illustrate this, here is a simplified representation of what is tracked in the table metadata JSON file (e.g., <code>v1.metadata.json</code>):

```json
{
  "format-version": 2,
  "table-uuid": "d54d2452-f542-4f36-a192-3852086e3f28",
  "location": "s3a://lakehouse-warehouse/db/user_events",
  "last-sequence-number": 2,
  "last-updated-ms": 1779494400000,
  "last-column-id": 4,
  "schemas": [
    {
      "type": "struct",
      "schema-id": 0,
      "fields": [
        { "id": 1, "name": "event_id", "required": true, "type": "string" },
        { "id": 2, "name": "user_id", "required": true, "type": "string" },
        {
          "id": 3,
          "name": "event_time",
          "required": true,
          "type": "timestamp"
        },
        { "id": 4, "name": "payload", "required": false, "type": "string" }
      ]
    }
  ],
  "current-schema-id": 0,
  "partition-specs": [
    {
      "spec-id": 0,
      "fields": [
        {
          "source-id": 3,
          "field-id": 1000,
          "name": "event_time_day",
          "transform": "day"
        }
      ]
    }
  ],
  "default-spec-id": 0,
  "snapshots": [
    {
      "snapshot-id": 8374928172948293,
      "timestamp-ms": 1779494400000,
      "manifest-list": "s3a://lakehouse-warehouse/db/user_events/metadata/snap-8374928172948293.avro",
      "summary": {
        "operation": "append",
        "added-data-files": "4"
      }
    }
  ],
  "current-snapshot-id": 8374928172948293
}
```

### The Role of the Catalog

The hierarchical metadata structure works beautifully, but it introduces a problem. Every write, update, or delete operation writes a new table metadata JSON file. How do query engines reading the table know which metadata JSON file represents the current state? And how do concurrent writers prevent overwriting each other's commits?

This is where the catalog is required. The catalog serves as the single source of truth for the location of the latest table metadata JSON file. It coordinates transactions using a Compare-And-Swap (CAS) pattern:

1. When a writer (like Spark) wants to update a table, it reads the current metadata JSON file path from the catalog (e.g., <code>v1.metadata.json</code>).
2. The writer writes new data files and compiles a new metadata JSON file (e.g., <code>v2.metadata.json</code>).
3. The writer requests the catalog to atomically swap the table pointer from <code>v1.metadata.json</code> to <code>v2.metadata.json</code>.
4. If another writer committed a change in the meantime, the catalog rejects the swap. The first writer must then read the new state, merge its changes, and try the commit swap again.

Without an Iceberg catalog (such as Apache Polaris, Nessie, AWS Glue, or a REST catalog implementation), multiple engines could write to the same table concurrently, leading to silent data corruption or overwritten snapshots. Iceberg defines the table format structure, while the catalog manages transaction coordination and pointer safety.

### Nessie and Polaris: Distinct Architectural Choices

Architects selecting an Iceberg catalog often choose between stateless REST catalogs and transactional catalog databases:

- **Apache Polaris:** A lightweight, open-source REST catalog that exposes standard Iceberg REST endpoints. It acts as a stateless service that enforces role-based access control and integrates with identity providers using OAuth2. Its primary mechanism is credential vending: Polaris generates scoped, short-lived AWS IAM, GCP IAM, or Azure SAS security tokens, allowing engines like Dremio or Spark to access only the specific cloud storage locations needed for a query, preventing broad storage access.
- **Project Nessie:** A transactional catalog database that brings Git-like version control to data lakehouses. It tracks commits in a database backend (such as PostgreSQL, DynamoDB, or Cassandra) and structures metadata references as a commit graph. This allows teams to create branches (for example, `CREATE BRANCH dev FROM main`), perform multi-table ETL transformations in isolation, verify data quality, and merge the branch back to the production branch atomically, guaranteeing that queries running on production never see partial updates.

---

## 3. Misconception: "Apache Iceberg Causes Partition Lock-In"

Under the legacy Hive table format, partition layouts are hard-coded into the directory structure of the object storage (for example: <code>s3://bucket/table/year=2026/month=05/day=22/data.parquet</code>). This directory-based partitioning model creates two severe limitations:

1. **Query Leakage:** Users must manually include partition columns in their SQL filters (e.g., <code>WHERE year = 2026 AND month = 5 AND day = 22</code>). If a user queries the table using only a timestamp filter (e.g., <code>WHERE event_time &gt;= '2026-05-22 00:00:00'</code>), the engine must list every single directory in the S3 bucket to find the data, causing query times to spike.
2. **Partition Lock-In:** If the table's query patterns change (for example, switching from partitioning by day to partitioning by hour because data volume tripled), you must execute an expensive job to rewrite the entire historical dataset into a new directory structure.

Because of this legacy behavior, some developers assume that Apache Iceberg also locks you into whatever partition strategy you define during table creation.

### Hidden Partitioning

Apache Iceberg eliminates both issues through a capability called **Hidden Partitioning**. When you create an Iceberg table, you define partitions based on transformations of existing columns, rather than creating new virtual partition columns.

For example, consider the following table definition:

```sql
CREATE TABLE demo.db.user_events (
  event_id STRING,
  user_id STRING,
  event_time TIMESTAMP,
  payload STRING
)
USING iceberg
PARTITIONED BY (days(event_time));
```

Iceberg tracks partition values internally within the metadata of each data file. The physical directory structure on S3 is completely hidden from the user and the query engine.

When a query is submitted:

```sql
SELECT COUNT(*)
FROM demo.db.user_events
WHERE event_time BETWEEN '2026-05-01 00:00:00' AND '2026-05-05 23:59:59';
```

Iceberg inspects the query filter, recognizes that the filter targets <code>event_time</code>, and applies the daily partition transformation internally. It prunes out all partition files that do not fall within the requested date range before the query reaches the execution stage. Users do not need to know how the table is partitioned to write fast queries.

### Partition Evolution

If your data volume increases and you decide that partitioning by day is no longer sufficient, you can evolve the partitioning spec instantly using a metadata-only command:

```sql
ALTER TABLE demo.db.user_events REPLACE PARTITION FIELD event_time WITH hours(event_time);
```

Once this command is executed:

1. All new writes to the table are automatically partitioned by hour.
2. The old historical data remains partitioned by day.
3. Iceberg updates the table metadata JSON file to track two distinct partition specifications (spec 0 for daily, and spec 1 for hourly).

When a query is run, Iceberg uses **split-planning** to query the daily partition files using spec 0 and the hourly partition files using spec 1, stitching the results together seamlessly. The user does not need to know that the partition layout changed, and the organization avoids the time and cost of rewriting historical data.

Here is the internal mechanics of split-planning. During the planning phase, the engine reads the partition spec history from the table metadata. If the query covers a time range spanning both spec 0 and spec 1, the engine splits the plan into two scan tasks:

- **Task A (Spec 0):** Evaluates partition daily buckets for dates before the evolution event.
- **Task B (Spec 1):** Evaluates partition hourly buckets for timestamps after the evolution event.

The engine executes these scan tasks in parallel, and unions the output blocks. This design prevents partition layout evolution from ever requiring historical data migrations.

---

## 4. Misconception: "Time Travel Requires Storing Infinite Duplicate Data"

A major benefit of Apache Iceberg is the ability to query previous snapshots of a table. This is highly useful for debugging, auditing, or running reproducible machine learning models. A common concern among data engineers is that keeping months of historical snapshots will cause storage costs on S3 to grow exponentially as duplicate data files accumulate.

### How Snapshot-Based Metadata Sharing Works

To understand why storage costs do not grow exponentially, we must look at how Iceberg manages commits. When you write data to an Iceberg table, you do not write a new copy of the entire table. Instead, Iceberg uses **metadata sharing**:

```
[Snapshot 1 Metadata] ──────► [Manifest List 1] ──────► [Manifest File A] ──────► [Data File 1, Data File 2]

[Snapshot 2 Metadata] ──────► [Manifest List 2] ──────► [Manifest File A] ──────► [Data File 1, Data File 2]
                                                └──────► [Manifest File B] ──────► [Data File 3 (New Data)]
```

If you append 1 million rows of new data to a table containing 100 million rows:

1. Spark writes the new rows to a new Parquet file (e.g., <code>data_3.parquet</code>).
2. Spark writes a new manifest file (e.g., <code>manifest_b.avro</code>) to track <code>data_3.parquet</code>.
3. Spark writes a new manifest list (e.g., <code>manifest_list_2.avro</code>) that references both <code>manifest_a.avro</code> (the old files) and <code>manifest_b.avro</code> (the new file).
4. The table metadata JSON is updated to register Snapshot 2, while retaining the pointer to Snapshot 1.

Because Snapshot 2 shares references to the data files created in Snapshot 1, the only additional storage cost is the size of the new Parquet file (<code>data_3.parquet</code>). There is zero replication of the existing 100 million rows.

### The Cost of Updates and Deletes

While appends are storage-efficient, update and delete operations do increase storage overhead. Under a **Copy-On-Write (COW)** model, if you update 1 row in a Parquet file containing 1 million rows, the engine must write a new Parquet file containing the 999,999 unchanged rows plus the 1 updated row.

The old Parquet file cannot be deleted immediately because it is still needed by Snapshot 1. Until Snapshot 1 is expired, both Parquet files remain on S3, creating write amplification and storage overhead.

Under a **Merge-On-Read (MOR)** model, the engine does not rewrite the base Parquet file. Instead, it writes a small positional delete file or equality delete file indicating that the specific row was modified, along with a new Parquet file containing only the updated record. This limits write amplification but increases the number of small files that query engines must read and merge at runtime.

### Mathematical Comparison of Copy-On-Write and Merge-On-Read

To understand the operational trade-offs, we can evaluate the write amplification mathematically. Consider a table where each data file is exactly 256 MB and contains approximately 1 million records. If an ETL job updates a single record:

- **Copy-On-Write (COW):** The engine must read the entire 256 MB file, modify the target record in memory, and write a new 256 MB Parquet file. This represents a write amplification factor of 1,000,000 to 1, consuming significant disk I/O and network bandwidth to object storage.
- **Merge-On-Read (MOR):** The engine writes only a small delete file (approximately 10 KB) containing the file path and position index of the modified record, plus a small insert file (approximately 5 KB) containing the updated values. The write amplification is effectively zero.

However, during a read query on this MOR table, the query engine must scan the 256 MB base file, read the 10 KB delete file, build an in-memory hash set of deleted row positions, and filter them out before joining or aggregating. If there are many delete files, query performance degrades significantly.

To control these models, you configure Iceberg table properties:

- `write.update.mode`: Sets the update format to either `copy-on-write` or `merge-on-read`.
- `write.delete.mode`: Sets the delete format to `copy-on-write` or `merge-on-read`.
- `write.merge.mode`: Sets the merge format (for SQL `MERGE INTO` statements) to `copy-on-write` or `merge-on-read`.

Regular compaction using `rewrite_data_files` and `rewrite_position_deletes` is necessary to merge MOR delete files back into clean data files, reconciling the storage footprint and query performance.

### Managing Storage Lifecycle and Table Maintenance

To prevent historical snapshots from creating runaway storage costs, you must configure a snapshot retention policy and run regular maintenance procedures.

#### Snapshot Expiration

To clean up old, unneeded snapshots, run the <code>expire_snapshots</code> procedure. This removes the references to old snapshots in the metadata JSON and physically deletes any orphaned Parquet files from S3 that are no longer referenced by any active snapshot.

For example, in Spark SQL, you can run:

```sql
CALL demo.system.expire_snapshots(
  table => 'demo.db.user_events',
  older_than => TIMESTAMP '2026-05-15 00:00:00',
  retain_last => 5
);
```

Behind the scenes, the snapshot expiration algorithm executes these steps:

1. Identify all snapshots in the metadata JSON that are older than the specified timestamp.
2. Filter this list to preserve the last N snapshots defined by the <code>retain_last</code> parameter.
3. Traverse the manifest lists of all surviving snapshots, compiling a set of all active data and delete files.
4. Traverse the manifest lists of the snapshots being expired. Find any files that are referenced in the expired snapshots but are absent from the active file set.
5. Physically delete these orphaned data and delete files from the object storage bucket.
6. Write a new table metadata JSON file excluding the expired snapshot references, and commit the catalog pointer.

#### Removing Orphan Files

Occasionally, failed write jobs or network dropouts can leave Parquet files on S3 that were never committed to any metadata file. These files are invisible to Iceberg but still incur storage costs. Run the <code>remove_orphan_files</code> procedure to locate and delete these unreferenced files:

```sql
CALL demo.system.remove_orphan_files(
  table => 'demo.db.user_events',
  older_than => TIMESTAMP '2026-05-20 00:00:00'
);
```

#### Compacting Data Files

Frequent small writes or Merge-On-Read updates create many small data and delete files, which degrades query performance. Run the compaction procedure (<code>rewrite_data_files</code>) to merge small files into optimized 128 MB or 512 MB Parquet files:

```sql
CALL demo.system.rewrite_data_files(
  table => 'demo.db.user_events',
  strategy => 'sort',
  sort_order => 'user_id ASC',
  options => map('max-file-size-bytes', '536870912')
);
```

---

## 5. Misconception: "Data Lakehouses Lack Fine-Grained Security and Governance"

A persistent argument from traditional data warehouse advocates is that open data lakes lack the security controls required by enterprise organizations. They argue that because files are stored openly on S3, you cannot enforce role-based access control (RBAC), row-level filtering, or column-level masking without placing a proprietary database engine in front of the storage bucket.

### Credential Vending and Access Control

This is a misconception that ignores the capabilities of modern open REST Catalogs and semantic layers.

In an open lakehouse architecture, security is enforced at two distinct levels:

1. **Metadata and Pointer Security (The Catalog):** Open REST Catalogs like **Apache Polaris** implement **credential vending**. When a query engine requests the location of an Iceberg table, it must authenticate with Polaris using OAuth2 tokens. Polaris checks the engine's role-based access permissions. If authorized, Polaris contacts S3 to generate short-lived, read-only security credentials (like AWS IAM session tokens) for the specific paths containing the table's data files. The query engine never has permanent read or write access to the raw S3 bucket.
2. **Access Control Policies in Polaris:** Polaris allows you to define granular access policies on namespaces and tables, ensuring that different compute engines or tenant groups only see the metadata they are authorized to access.

### Fine-Grained Security in the Semantic Layer

While the catalog secures the files on object storage, a semantic layer like **Dremio** enforces fine-grained role-based access control (RBAC), row-level filtering, and column-level masking before results are returned to users or AI agents.

#### Enforcing Row-Level Security

If you want sales representatives to only see customer data from their own region, you can define a row-level security policy directly in Dremio. The engine automatically appends filtering conditions to the generated query plan before scanning the Iceberg tables:

```sql
CREATE OR REPLACE ROW FILTER demo.db.customers.region_filter
ON demo.db.customers
USING (
  CASE
    WHEN IS_MEMBER('Admins') THEN TRUE
    ELSE region = CURRENT_USER_REGION()
  END
);
```

#### Enforcing Column-Masking

Similarly, you can mask sensitive columns (like social security numbers or email addresses) based on the user's role:

```sql
CREATE OR REPLACE COLUMN MASKING POLICY demo.db.customers.ssn_mask
ON demo.db.customers (ssn)
USING (
  CASE
    WHEN IS_MEMBER('HR_Compliance') THEN ssn
    ELSE 'XXX-XX-XXXX'
  END
);
```

Because these security policies are defined at the engine and semantic tier, they are applied dynamically at query execution time. The underlying Parquet files remain unchanged on S3, allowing you to maintain a single copy of data while securing it for different user groups.

---

## 6. Misconception: "Iceberg Tables Are Tightly Bound to Apache Spark"

Because Apache Iceberg was originally designed by Netflix using Java libraries, and early adoptions were heavily focused on Spark pipelines, a lingering misconception is that Iceberg requires a Spark cluster or Java-based environment to operate.

### Multi-Engine and Language Interoperability

Today, Apache Iceberg is supported by almost every major data platform and query engine. You can read and write Iceberg tables using a wide variety of tools, including:

- **Dremio:** An Iceberg-native SQL engine optimized for high-performance BI and interactive queries.
- **Apache Flink:** Optimized for low-latency streaming write pipelines and Change Data Capture (CDC).
- **Trino:** Optimized for high-throughput ad-hoc SQL querying across diverse sources.
- **Snowflake and Google BigQuery:** Both platforms support Iceberg tables as first-class storage targets, allowing you to query Iceberg tables directly on your own S3 or GCS buckets.
- **DuckDB:** A local, single-node SQL engine that can read Iceberg metadata and query Parquet files directly on your laptop.

### Non-Java SDKs: PyIceberg and Rust

The introduction of **PyIceberg** (a pure Python implementation of the Iceberg specification) and the **Iceberg-Rust** libraries has decoupled the format from the Java Virtual Machine (JVM).

Data scientists and machine learning engineers can now read Iceberg tables directly into Python dataframes (like Pandas or Polars) without running a Java gateway or Spark session:

```python
from pyiceberg.catalog import load_catalog

# Connect to the Apache Polaris REST Catalog
catalog = load_catalog(
    "polaris",
    **{
        "uri": "http://polaris-service:8181/api/v1",
        "token": "my-oauth-token",
        "warehouse": "demo"
    }
)

# Load the Iceberg table metadata
table = catalog.load_table("db.user_events")

# Query and load data directly into a Polars DataFrame
df = table.scan(
    row_filter="event_time >= '2026-05-01T00:00:00Z'",
    selected_fields=("user_id", "event_time")
).to_arrow()
```

This flexibility allows organizations to build unified data pipelines where data engineers use Java/Scala in Spark for heavy transformations, while data scientists use Python/PyIceberg on their local workstations to train models on the same datasets.

---

## 7. Comparative Summary of Misconceptions

To clarify these architectural truths, refer to the summary reference table below:

| Feature / Topic      | Legacy Misconception                                                            | Modern Architectural Truth                                                                     |
| :------------------- | :------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------- |
| **Compute Engines**  | Locked into a single database runtime or storage vendor.                        | Decoupled; Spark, Dremio, Flink, and Snowflake query the same files.                           |
| **Catalogs**         | Iceberg is a standalone catalog that replaces Glue, Polaris, or Nessie.         | Iceberg is the table metadata format; catalogs coordinate atomic pointer commits.              |
| **Partitioning**     | Partitioning layout is rigid, leaks into SQL, and requires full table rewrites. | Hidden Partitioning resolves query leakage; partition specs evolve instantly without rewrites. |
| **Storage Cost**     | Retaining snapshots for time travel duplicates data and inflates S3 bills.      | Data files are shared across snapshots; only updates/deletes write new files.                  |
| **Security**         | Open object storage cannot support fine-grained RBAC, masking, or row filters.  | REST Catalogs vend temporary credentials; Dremio enforces Row/Column RBAC.                     |
| **Language Lock-in** | Iceberg requires Spark, Java, or JVM-based environments.                        | Decoupled; PyIceberg and Iceberg-Rust support Python, DuckDB, and Rust natively.               |

---

## Conclusion

By understanding the underlying mechanics of Apache Iceberg and the open lakehouse architecture, you can avoid common design mistakes. Decoupling storage from compute, utilizing REST catalogs for security, leveraging hidden partitioning for schema evolution, and running regular snapshot expiration procedures ensures that your data platform remains performant, secure, and adaptable as your workloads scale.

If you are ready to evaluate format performance under real workloads, check out our guide on [benchmarking open table formats](/benchmarks/open-table-formats/) or learn more about [Apache Iceberg Architecture](/apache-iceberg/).
