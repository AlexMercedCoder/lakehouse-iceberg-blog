---
title: "Open Table Format Benchmarks: Why They Require Critical Evaluation"
pubDatetime: 2026-05-22T12:00:00Z
description: "An in-depth analysis of open table format benchmarks comparing Apache Iceberg, Delta Lake, and Apache Hudi, detailing the pitfalls of standard benchmarks and how to choose a format."
author: "Alex Merced"
tags:
  - open table formats
  - apache iceberg
  - delta lake
  - apache hudi
  - benchmarks
slug: 2026-05-22-open-table-format-benchmarks-guide
draft: false
canonicalURL: "https://datalakehousehub.com/posts/2026-04-29-apache-iceberg-masterclass-01-table-formats/"
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/posts/2026-04-29-apache-iceberg-masterclass-01-table-formats/).

The transition from traditional, closed data warehouses to open lakehouse architectures is one of the most significant shifts in modern data engineering. By decoupling storage formats from query processing engines, organizations can store their data in public cloud object storage while executing queries using specialized, high-performance engines. At the center of this transition are open table formats: Apache Iceberg, Delta Lake, and Apache Hudi.

As organizations evaluate these formats, performance is frequently cited as a primary decision criterion. This focus has led to a flood of performance benchmarks published by vendors, cloud providers, and independent technology groups. These benchmarks, often utilizing standard industry test suites like TPC-H or TPC-DS, make bold claims about which format is the fastest, the most cost-effective, or the most scalable.

However, for data architects and engineers, these benchmarks can be difficult to interpret. A benchmark published by one vendor may show that Delta Lake is multiple times faster than Apache Iceberg, while a study published by another show that Iceberg outperforms Delta Lake on identical hardware. This divergence arises because open table format performance is not a static property of the table layout itself. Instead, performance is the result of a complex interaction between the physical data layout, the query engine, the client library versions, and the underlying cloud infrastructure.

This guide provides an in-depth analysis of the open table format benchmark landscape. We examine the methodology behind these benchmarks and explain why they must be taken with a grain of salt. We analyze the technical variables that influence performance results, outline a workload-centric evaluation framework, and provide a guide for selecting a format based on ecosystem alignment. Finally, we discuss how query engines like the Dremio engine accelerate performance across all formats.

---

## 1. The Landscape of Table Format Benchmarks

To understand why table format benchmarks often yield conflicting results, we must first look at the landscape of published studies and the methodologies they use.

### Vendor-Sponsored Benchmarks

Most benchmarks available online are sponsored by companies that have a financial interest in the adoption of a specific table format. For example:

- **Databricks** frequently publishes benchmarks demonstrating the performance of Delta Lake, often highlighting its integration with the proprietary Photon execution engine.
- **Onehouse**, founded by the creators of Apache Hudi, publishes studies showing Hudi's strength in handling real-time ingestion, incremental processing, and mutable workloads.
- **Tabular** (subsequently acquired by Snowflake), founded by the creators of Apache Iceberg, published analyses detailing Iceberg's efficiency in query planning, metadata pruning, and cross-engine operations.

These studies typically rely on standard benchmarks like TPC-DS, which simulates a retail product supplier with complex query patterns, or TPC-H, which focuses on ad-hoc decision support queries. While these benchmarks are designed to be objective, the configurations used to run them can be adjusted to favor one format or engine over another.

### Independent and Community Studies

In addition to vendor publications, independent consulting groups, open-source communities, and data engineering teams at large enterprises have published their own evaluations. These studies often focus on practical engineering concerns, such as how easily a format integrates with multiple engines (such as Spark, Trino, Flink, and Dremio), the difficulty of setting up write transactions, and how performance degrades over time as data is modified.

These independent reports often paint a more balanced picture. They show that while one format might have a slight edge in write speed, another might offer better read performance for specific query types, while a third might provide superior integration with legacy catalog systems.

### The Problem of Static Benchmarks

The primary limitation of any published benchmark is that it represents a static snapshot of a specific system configuration at a single point in time. In the fast-moving world of open-source data engineering, table formats and query engines are updated constantly. An optimization introduced in a new release of Apache Iceberg or Delta Lake can render previous benchmark results obsolete. Therefore, relying on external benchmarks to make long-term architectural decisions is a risky approach.

---

## 2. Why Benchmarks Require Critical Evaluation

When evaluating table format benchmarks, data teams must look beyond the headline numbers and scrutinize the underlying methodologies. There are four critical technical variables that influence performance results and can easily bias findings if not controlled for.

### 1. Compute Architecture and Sizing

The hardware and compute resources used to execute a benchmark have a significant impact on the results. In cloud environments, compute performance is determined by virtual machine instance types, CPU generation, memory allocation, and disk configurations.

For instance, some query engines rely heavily on local NVMe SSDs to cache data blocks, while others read data directly from cloud object storage. If a benchmark is executed on instances with fast local storage, an engine that caches data aggressively will show a massive performance advantage. However, this advantage may not translate to a production environment if the data team deploys the engine on standard instances without local SSDs to reduce costs.

Furthermore, cluster size plays a key role. A benchmark run on a small 4-node cluster may highlight metadata parsing overhead as a major bottleneck, whereas the same test run on a 100-node cluster might be limited by network bandwidth or object storage rate limits. When reviewing a benchmark, you must verify that the compute sizing aligns with what your organization can realistically afford and manage in production.

### 2. Engine Selection, Version, and Format Optimizations

A table format does not execute queries; a query engine does. Therefore, a table format benchmark is always a test of a specific query engine running on top of that format.

This distinction is critical because query engines are optimized for different table formats in varying degrees. For example:

- Databricks has spent years optimizing its runtime and the Photon engine to work with Delta Lake. Running a benchmark on Databricks comparing Delta Lake and Apache Iceberg may show that Delta Lake is faster, but this is a reflection of Databricks' engine optimizations rather than an inherent limitation of the Iceberg format.
- Similarly, engines like Snowflake, Trino, and Dremio have built native connectors for Apache Iceberg that optimize partition pruning, statistical calculations, and metadata reads.

Furthermore, the version of the engine used in the test can skew results. An engine version that lacks support for Iceberg metadata caching or Delta Lake log pruning will perform poorly compared to a newer version where those features are enabled. If a benchmark compares Format A using a highly optimized engine version and Format B using a basic or legacy connector, the results are misleading.

### 3. Version of the Table Format Libraries

Like query engines, the table format libraries themselves evolve rapidly. Each minor and major release introduces performance improvements, write optimizations, and metadata fixes.

For example, early versions of Apache Iceberg relied primarily on Copy-on-Write for updates, which introduced write latency. The introduction of Merge-on-Read, positional delete files, and optimized delete file writers in later versions of the Iceberg library significantly reduced update overhead.

If a benchmark compares Delta Lake using its latest library version against an older version of Apache Iceberg, it will fail to capture these improvements. When analyzing benchmark results, data teams must verify the exact library versions used and confirm that all formats were configured with equivalent performance-enhancing features.

### 4. Object Storage Latency and Network Throughput

Because open lakehouses store data in cloud object storage (such as Amazon S3, Google Cloud Storage, or Azure Blob Storage), storage latency and network throughput are major performance variables.

Cloud storage is not a local disk; it is a distributed network service. API requests to retrieve data (GET requests) and metadata (LIST requests) are subject to network latency, throttling, and request limits. If an engine must make hundreds of metadata requests to resolve a query, object storage latency will dominate the execution time.

To mitigate this, engines use metadata caching and file bundling. If a benchmark does not account for object storage fluctuations or fails to configure connection pooling and caching properly, the results will vary from run to run. A format that appears fast in one test may appear slow in another due to transient network congestion or S3 throttling during the run.

### 5. Architectural Differences in Statistical Metadata Storage

Another factor that biases query planning benchmarks is how each format stores and structures statistical metadata for query planning. Query engines rely on column-level statistics (such as minimum/maximum values, null counts, and value counts) to prune files and determine join orders.

Apache Iceberg stores these statistics directly inside its manifest files, partitioned hierarchically. This allows the query coordinator to prune irrelevant files during the metadata scanning phase without reading the data files themselves. In contrast, Delta Lake stores statistics within its transaction log JSON files and periodically bundles them into Parquet checkpoints. If a query engine does not natively optimize the parsing of these transaction logs, or if the checkpoint files become large, the metadata scanning phase will experience significant delays. Apache Hudi utilizes a dedicated Metadata Table with internal index structures (like bloom filters and column statistics) to accelerate query planning.

When a benchmark is run using an engine that has deep integration with one format's metadata structures but lacks equivalent optimization for another, query planning times will be artificially skewed. An engine might plan an Iceberg query in milliseconds but take seconds to plan a Delta Lake query simply because its log parser is inefficient.

---

## 3. The Pitfall of Synthetic Benchmarks vs. Real-World Workloads

Standard benchmarks like TPC-DS are valuable for testing engine capabilities, but they do not replicate the query patterns, ingestion frequencies, or data structures of a real-world enterprise. Relying solely on synthetic benchmarks can lead data teams to select a format that is ill-suited for their actual workloads.

### TPC-DS vs. Enterprise Query Patterns

TPC-DS queries are complex, multi-way joins designed to simulate business intelligence reporting on a clean, relational schema. In contrast, real-world data lakehouse queries often target denormalized tables, json fields, or flat files.

Moreover, TPC-DS datasets are static. The data is loaded once, and a series of read-only queries are executed. In a production lakehouse, data is constantly updated. Ingestion pipelines write micro-batches, updates are applied via CDC, and maintenance tasks compact files in the background. A table format that excels in a read-only TPC-DS test may perform poorly under the pressure of concurrent reads and writes.

Let us illustrate this with a practical example. Suppose our target workload consists of joining customer profiles and order transactions. We will use our standard schema names: `analytics.customers` and `analytics.orders`.

In a synthetic benchmark, the query might look like this:

```sql
SELECT c.state, COUNT(o.order_id) AS total_orders, SUM(o.amount) AS total_amount
  FROM rest_catalog.analytics.customers c
  JOIN rest_catalog.analytics.orders o
    ON c.customer_id = o.customer_id
 WHERE o.order_date >= DATE '2026-01-01'
 GROUP BY c.state;
```

To optimize this query in a synthetic benchmark, a developer might manually partition the tables by `state` and `order_date`, and run compaction immediately before executing the read test.

In a real-world production environment, however:

- The `analytics.orders` table receives continuous writes, creating small files.
- The `analytics.customers` table undergoes SCD Type 2 updates, producing delete files.
- The query is executed concurrently by dozens of business analysts.

Under these conditions, a static benchmark cannot predict which format will perform best. The performance will be determined by how efficiently the format handles concurrent updates, how quickly the engine processes delete files on the fly, and how well background compaction jobs run without locking the tables.

### Concurrency Control and Write Conflicts

Synthetic read benchmarks ignore the impact of write conflicts and commit locking patterns. In production environments, tables must handle concurrent operations.

All three formats employ Optimistic Concurrency Control (OCC) to handle simultaneous writes. OCC assumes that conflicts are rare; when a transaction begins, it reads the current table state and prepares its updates. At commit time, it checks if another writer has modified the table. If a conflict is detected, the transaction must retry.

The implementation details of these commits differ by format and catalog:

- **Apache Iceberg** relies on catalog-specific locking mechanisms. When using an AWS Glue catalog, it uses Glue's native locking; when using Nessie, it relies on git-like commit operations; when using a REST catalog, the locking is handled by the REST server. This provides fine-grained control and scalability.
- **Delta Lake** historically relied on file system drivers (such as S3 multi-part upload or Azure storage leases) or Databricks-managed control planes to coordinate ACID commits on object storage.
- **Apache Hudi** supports multi-writer configurations using lock providers like ZooKeeper, Hive Metastore, or Amazon DynamoDB.

If a concurrent ingestion benchmark is executed on a catalog that has poor locking performance on cloud object storage, commit times will spike, and transactions will fail due to write collisions. Read-only synthetic benchmarks completely ignore these operational constraints, hiding the performance degradation that occurs under heavy multi-writer pressure.

### Workload-Centric Evaluation

Rather than relying on vendor-published TPC-DS numbers, data teams should implement a workload-centric evaluation framework. This involves:

1.  **Defining Your Data Profile**: Identify your ingestion patterns (such as batch, micro-batch, or streaming), update frequencies, delete rates, and data volume.
2.  **Identifying Core Queries**: Select a representative set of queries from your actual workloads, including BI dashboards, ad-hoc reports, and ML training pipelines.
3.  **Building a Test Environment**: Deploy your chosen query engines (such as Spark, Trino, or Dremio) on hardware configurations that match your production budget.
4.  **Simulating Production Operations**: Run ingestion jobs, apply updates, execute queries, and run compaction tasks simultaneously. Measure query latencies, write speeds, and storage footprints under this realistic load.

By executing a workload-centric test, you will obtain performance metrics that directly reflect how the formats will behave in your environment, allowing you to make an informed architectural decision.

---

## 4. Ecosystem Alignment: How to Choose a Format

While performance is an important consideration, the long-term success of a lakehouse initiative depends heavily on ecosystem alignment and tooling support. A table format is only as useful as the tools that can read and write it.

Let us outline the key factors to consider when choosing a table format, and establish clear guidelines for when to select each option.

### Why Apache Iceberg is the Standard Default

For most organization-wide lakehouse initiatives, Apache Iceberg should be the default choice. This recommendation is based on Iceberg's design, governance model, and broad ecosystem support.

- **Engine-Neutral Specification**: Iceberg was designed from the beginning to be independent of any single processing engine. It was developed at Netflix to solve scalability issues with Hive, and is governed by the Apache Software Foundation. This ensures that no single vendor controls the roadmap or restricts features to proprietary platforms.
- **Broad Engine Support**: Because it is engine-neutral, virtually every major data tool has built native integration for Apache Iceberg. This includes open-source engines (Spark, Flink, Trino, Presto), cloud query engines (AWS Athena, Google BigQuery, Snowflake), and modern acceleration layers like the Dremio engine. This multi-engine compatibility prevents vendor lock-in, allowing data teams to use Spark for ingestion, Trino for ad-hoc queries, Snowflake for BI, and Dremio for sub-second acceleration, all querying the same physical Iceberg files.
- **Advanced Features**: Iceberg offers robust implementations of hidden partitioning, schema evolution, partition evolution, snapshot isolation, and time travel. These features make it highly stable and easy to manage at scale.
- **Security and Credential Vending**: The Iceberg REST Catalog specification introduces a standardized protocol for credential vending. When a query engine connects to the REST catalog, the catalog server authenticates the client and dynamically generates short-lived, scoped access tokens (such as temporary S3 credentials or SAS tokens) for the specific files the client needs to read or write. This removes the need to distribute broad, permanent storage-level IAM credentials directly to every query engine or client application. This standardized security protocol distinguishes Iceberg from Delta Lake, which has historically relied on direct filesystem-level authentication configurations or platform-specific access layers.

### When to Use Delta Lake

Delta Lake, originally created by Databricks, is a high-performance table format with a large user base. It should be considered under the following conditions:

- **All-in on the Databricks Stack**: If your organization's data platform is built entirely on Databricks, Delta Lake is the logical choice. Databricks provides native optimization features for Delta Lake that may not be available for other formats within their environment.
- **Accepting Vendor Lock-In**: While Delta Lake is open-source, its roadmap and primary optimizations are heavily driven by Databricks. If you choose Delta Lake, you must accept that the best performance and newest features may require running Databricks runtimes, and that integrating Delta Lake with non-Spark engines (like Snowflake or BigQuery) may introduce additional configurations.

### When to Use DuckLake

DuckLake is an emerging pattern tailored for lightweight or embedded data analytics workflows. It should be considered under these specific constraints:

- **All-in on DuckDB**: If your analytical pipelines are designed around DuckDB for local, in-memory, or single-node processing, DuckLake offers an efficient mechanism to manage tables without the overhead of a full Hadoop or Spark cluster.
- **Small-Scale Analytics**: DuckLake is ideal for edge computing, local development, or small-scale BI dashboards where deploying a distributed catalog like Glue or Nessie is unnecessary.

### When to Explore Hudi, Paimon, or Fluss

For specialized architectures, formats like Apache Hudi, Apache Paimon, or Apache Fluss may be appropriate:

- **High-Frequency Streaming Upserts**: If your primary workload is real-time streaming ingestion with high rates of row-level updates and deletes (such as a financial trading log or real-time inventory system), Apache Hudi should be evaluated. Hudi was designed specifically for incremental processing and features advanced indexing and merge strategies that optimize streaming writes.
- **Paimon and Fluss**: These formats are designed to integrate tightly with real-time stream processing engines like Apache Flink. If your architecture is built around continuous streaming queries, real-time materialized views, and low-latency stream analytics, Paimon and Fluss provide optimized storage layers that match Flink's processing model.

### Format Comparison Matrix

To help guide the decision-making process, let us summarize the key differences in a structured format:

| Capability / Feature      | Apache Iceberg                          | Delta Lake                        | Apache Hudi                        | DuckLake                |
| :------------------------ | :-------------------------------------- | :-------------------------------- | :--------------------------------- | :---------------------- |
| **Governance**            | Apache Foundation                       | Linux Foundation                  | Apache Foundation                  | Open Source (Community) |
| **Primary Sponsor**       | Multi-vendor (Snowflake, AWS, Cloudera) | Databricks                        | Onehouse                           | DuckDB Community        |
| **Ecosystem Neutrality**  | High (Excellent cross-engine support)   | Medium (Optimized for Databricks) | Medium (Optimized for Spark/Flink) | Low (Focused on DuckDB) |
| **Streaming Performance** | Good (Merge-on-Read)                    | Good (Buffered writes)            | Excellent (Advanced indexing)      | N/A (Batch/Local)       |
| **SCD Type 2 / CDC**      | Excellent (SQL MERGE / MoR support)     | Excellent (SQL MERGE support)     | Excellent (Incremental log)        | Basic (Manual writes)   |
| **Best Engine Fit**       | Spark, Trino, Dremio, Athena, Snowflake | Databricks Spark, Photon          | Spark Streaming, Flink             | DuckDB                  |

---

## 5. Query Acceleration with the Dremio Engine

Regardless of which open table format you choose, query performance is ultimately determined by the execution engine. High-performance engines like the Dremio engine are designed to accelerate queries across these formats, minimizing the latency difference between the layouts.

Let us look at how the Dremio engine optimizes queries over Apache Iceberg, Delta Lake, and other open tables.

### Vectorized Memory Layouts (Apache Arrow)

The Dremio engine uses Apache Arrow as its in-memory data representation. Arrow is a columnar format designed for fast analytical processing.

When Dremio executes a query, it reads data from the underlying Parquet files (the physical storage format for Iceberg, Delta, and Hudi) and maps it directly into Arrow memory buffers. Because Arrow is structured column-by-column, the engine can execute calculations across arrays of values in a single CPU instruction using SIMD. This vectorized execution model reduces CPU cycles and speeds up aggregations, joins, and filters over large tables.

Furthermore, the Dremio engine executes its query processing operations directly in off-heap memory using C++ memory allocations. This design prevents Java Virtual Machine (JVM) garbage collection overhead, which often limits the performance of Java-based execution engines under heavy analytical loads. The in-memory data structures are aligned with modern CPU cache architectures, maximizing memory locality and minimizing hardware cache misses.

Additionally, Dremio integrates with Apache Arrow Flight, a high-performance framework for streaming large datasets over the network. Arrow Flight replaces legacy JDBC and ODBC serialization protocols with a stream-oriented gRPC interface. This allows client applications, such as Python pandas/Polars scripts or business intelligence tools, to stream query results from Dremio directly into client memory without the CPU-intensive serialization and deserialization steps required by traditional database drivers, delivering end-to-end data acceleration.

### Metadata Caching

Query planning in an open lakehouse requires reading metadata files to locate the data files that match a query's filters. If the metadata files are stored in remote cloud object storage, the latency of listing and reading these files can slow down query planning.

Dremio mitigates this latency by maintaining a local coordinator metadata cache. The Dremio coordinator automatically caches table metadata (such as Iceberg manifests or Delta Lake logs) on fast local storage. When a query is submitted, Dremio resolves the file paths from its local cache, reducing query planning time to milliseconds. This metadata caching allows Dremio to bypass the latency of S3 or ADLS API calls during query planning.

### SQL Reflections

Dremio's Data Reflections provide a powerful optimization mechanism. A Reflection is an accelerated physical representation of a table's data, stored in Parquet format and managed automatically by Dremio.

When a query is run, Dremio's optimizer (powered by Apache Calcite) checks if an active Reflection can satisfy the query. If a match is found, Dremio automatically rewrites the query plan to read from the Reflection instead of scanning the source table.

This is highly beneficial for table format evaluations. For example, if a query on a raw Iceberg table is slow due to complex joins, we can build a Raw or Aggregation Reflection. The queries will be redirected to the Reflection, delivering sub-second responses without requiring us to change our SQL queries or migrate our table format.

### Positional and Equality Delete Caching

As explored in previous guides, writing updates to Merge-on-Read tables generates positional or equality delete files. At read time, these delete files must be applied to the base data files to filter out modified rows, which is a major performance bottleneck for query engines.

The Dremio engine optimizes this reconciliation by caching delete files in memory. When reading an Iceberg table, Dremio loads the delete information into memory. As the vectorized reader scans base data files, it filters out deleted rows in memory on the fly. This caching eliminates the need to repeatedly fetch delete files from cloud storage, minimizing the read penalty associated with Merge-on-Read datasets.

---

## 6. Real-World Execution: Running a Comparative Workload Query

To show how the Dremio engine accelerates a typical analytical workload across these tables, let us write a benchmark query that aggregates sales performance from our standard tables: `analytics.orders` and `analytics.customers`.

Suppose we want to compute the total revenue and order counts for customers in California ('CA') and New York ('NY') for orders placed in the first half of 2026. The SQL query is structured as follows:

```sql
SELECT c.name, c.email, COUNT(o.order_id) AS order_count, SUM(o.amount) AS total_spent
  FROM rest_catalog.analytics.customers c
  JOIN rest_catalog.analytics.orders o
    ON c.customer_id = o.customer_id
 WHERE c.state IN ('CA', 'NY')
   AND o.order_date BETWEEN DATE '2026-01-01' AND DATE '2026-06-30'
 GROUP BY c.name, c.email
 ORDER BY total_spent DESC;
```

Let us look at how the Dremio engine accelerates this join execution:

1.  **Metadata Pruning**: Dremio queries the coordinator metadata cache to resolve the active snapshots for both tables. It uses the filter `o.order_date BETWEEN '2026-01-01' AND '2026-06-30'` to prune manifest files, identifying only the Parquet files that contain data for that date range.
2.  **Column Projection**: Dremio reads only the column chunks needed for the query (`customer_id`, `name`, `email`, `state` from customers; `order_id`, `customer_id`, `order_date`, `amount` from orders). It ignores all other columns, reducing network IO.
3.  **Vectorized Hash Join**: Dremio loads the pruned data into Apache Arrow memory buffers. It builds a hash table on `c.customer_id` using SIMD operations, and streams the order data through the hash table to perform the join.
4.  **Reflection Acceleration**: If we have a Raw Reflection containing the joined tables, Dremio's Calcite optimizer rewrites the plan to read directly from the Reflection, bypassing the join operation entirely and returning results in milliseconds.

---

## 7. Conclusion

When choosing an open table format, data teams should look beyond the numbers presented in vendor-sponsored benchmarks. Performance is not an intrinsic property of a table format; it is a dynamic outcome determined by cluster sizing, engine optimizations, library versions, and cloud network storage latency.

Synthetic benchmarks like TPC-DS are useful for testing engine boundaries, but they do not reflect the complexity of real-world pipelines. A workload-centric evaluation using your own data profiles, ingestion rates, and query patterns is the only reliable way to evaluate performance.

In terms of ecosystem alignment, Apache Iceberg is the recommended default choice for most enterprises due to its open governance and broad cross-engine support. Delta Lake is appropriate for Databricks-centric environments, DuckLake is ideal for small-scale DuckDB workflows, and specialized formats like Hudi or Paimon should be reserved for high-frequency streaming architectures.

Finally, by deploying high-performance execution layers like the Dremio engine, organizations can accelerate queries across all formats. Through vectorized execution using Apache Arrow, metadata caching, and SQL Reflections, Dremio delivers the speed required for modern analytics, allowing data teams to focus on building value rather than worrying about formatting constraints.
