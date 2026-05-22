---
title: "Maintaining Apache Iceberg Tables: Compaction, Snapshot Expiration, and Orphan File Cleanup"
description: "An in-depth guide to orchestrating maintenance operations on Apache Iceberg tables, covering bin-packing, sort-based, Z-Order compaction, snapshot expiration, and orphan file removal, with query acceleration details for the Dremio engine."
pubDatetime: 2026-05-22T10:00:00Z
author: "Alex Merced"
tags:
  ["Apache Iceberg", "Compaction", "Data Engineering", "Dremio", "Apache Spark"]
category: "Data Engineering"
slug: 2026-05-22-apache-iceberg-maintenance-compaction
draft: false
---

The core promise of an open data lakehouse is to deliver the scalability and low storage cost of an object store combined with the transactional reliability and performance of an enterprise data warehouse. To fulfill this promise, data platform administrators must establish structured table maintenance routines. Unlike traditional databases that manage storage layouts automatically behind proprietary interfaces, an open lakehouse exposes physical files on object storage directly to developers and query engines. This exposure provides extreme flexibility but shifts the responsibility of storage layout optimization to data engineers.

In an active lakehouse environment where tables are constantly modified by streaming ingest pipelines and batch ETL processes, tables can degrade over time. Data files can fragment, metadata structures can grow bloated, and snapshots can accumulate, leading to increased query latency and rising cloud storage costs.

In this comprehensive guide, we will explore the core maintenance tasks required to keep Apache Iceberg tables in a healthy, high-performance state. We will dissect the \"small files problem,\" compare compaction techniques (bin-packing, sort-based, and Z-Order spatial clustering), write Spark SQL scripts to execute maintenance operations, and explain how the Dremio engine leverages optimized layouts to achieve sub-second execution speeds.

---

## 1. The \"Small Files Problem\" and Storage Layout Latency

In modern data lakehouses, data is often ingested in near-real-time from message queues like Apache Kafka, or via frequent micro-batch jobs running every few minutes. While this ingestion pattern ensures that fresh data is available quickly, it creates a significant structural issue: the creation of thousands of very small files on object storage. This is commonly referred to as the \"small files problem.\"

```
Legacy / Uncompacted Table Layout:
+-----------------------------------------------------------------------------------+
|  10,000 files x 10 KB = 100 MB total.                                             |
|  Querying requires 10,000 HTTP GET requests, causing high network connection delay.|
+-----------------------------------------------------------------------------------+

Compacted Table Layout:
+-----------------------------------------------------------------------------------+
|  1 file x 100 MB = 100 MB total.                                                  |
|  Querying requires 1 HTTP GET request, reading data at maximum network speed.     |
+-----------------------------------------------------------------------------------+
```

### The Physics of Object Storage Latency

Amazon S3 and other cloud object stores are designed for high throughput and durability, but they have non-trivial connection establishment latency. Every HTTP request sent to S3 incurs overhead. This includes DNS resolution, TCP handshake setup, TLS negotiation, and S3 internal request routing. Typically, the time to first byte for a GET request is between 10 and 50 milliseconds.

Suppose a query engine needs to scan a table containing 10,000 files of 10 kilobytes each. The actual data volume is only 100 megabytes. However, to read this data, the query engine must execute 10,000 separate GET requests. If executed sequentially, the network overhead would consume minutes. Even when executed in parallel, the overhead is substantial and can trigger S3 rate limiting (which caps requests at 5,500 GET requests per second per prefix), leading to HTTP 503 throttling errors.

Conversely, if those same records are compacted into a single 100-megabyte Parquet file, the query engine performs a single GET request, establishes a single connection, and reads the entire dataset at the maximum bandwidth of the network connection. By consolidating data, compaction eliminates request latency, prevents S3 throttling, and lowers your AWS billing charges (since S3 charges per 1,000 API requests).

### How Parquet Layouts Interact with File Size

The Parquet file format is columnar, meaning it stores data columns adjacent to each other rather than rows. Parquet files organize data into row groups, column chunks, and pages:

- **Row Groups**: Horizontal divisions of data within the file. A typical row group contains between 100,000 and 1,000,000 rows.
- **Column Chunks**: Column-specific segments within a row group.
- **Pages**: The smallest unit of physical storage, containing actual values, repetition levels, and definition levels.

To plan queries efficiently, engines read Parquet file footers. The footer contains metadata, including min/max values for every column within each row group. If a file is too small (for instance, containing only a few thousand rows), the row groups are tiny, and the overhead of reading file footers outweighs the benefits of columnar skipping. Storing data in optimized file sizes (typically between 128 MB and 512 MB) ensures that row groups are large enough to make columnar skip statistics effective, while remaining small enough to be easily processed in parallel.

---

## 2. In-Depth Analysis of Compaction Techniques

Compaction is the process of reading existing small files, consolidating their contents, and writing them out as larger, optimized files. In Apache Iceberg, compaction is a metadata-only rewrite operation. The data files are physically written, and a new snapshot is created, but the logical content of the table does not change. Iceberg supports three primary compaction strategies.

### Bin-Packing

Bin-packing is the fastest and least resource-intensive compaction strategy. It operates on a simple algorithm: it groups small files into \"bins\" based on file size and writes each bin out as a new, larger file.

```
Input Files: [10MB, 15MB, 5MB, 20MB, 80MB, 12MB, 8MB]
Target File Size: 100MB

Bin 1: [10MB, 15MB, 5MB, 20MB] -> Compacted into File A (50MB)
Bin 2: [80MB, 12MB, 8MB]       -> Compacted into File B (100MB)
```

Bin-packing does not reorganize or sort the rows within the files. It simply reads the raw rows and packs them sequentially. Because it does not sort the data, bin-packing requires minimal CPU cycles and memory, making it highly cost-effective. It is ideal as a first-line defense against the small files problem in high-frequency ingest pipelines. However, because it does not reorganize row order, it does not optimize the table for specific query search paths.

### Sort-Based Compaction and Spark Execution Trade-Offs

Sort-based compaction reads small files, sorts the rows based on one or more target columns, and writes the sorted data out into large files.

For example, if you frequently query the `analytics.orders` table filtering by `customer_id`, you can run sort compaction using `customer_id` as the sort key. This groups all records with the same customer ID into adjacent physical locations within the Parquet files.

Sorting dramatically improves query performance by maximizing Parquet min/max statistics skipping. If a query filters for `customer_id = 'C001'`, the query engine inspects the min/max statistics in the row group footers. In a sorted file, only a few row groups will contain values matching `'C001'`. The query engine skips all other row groups, reducing disk reads. If the file was not sorted, `'C001'` records would be scattered across every row group in every file, forcing the engine to scan the entire dataset.

When orchestrating sort-based compaction in Spark, you must choose between partition-level sorting and global sorting:

- **Partition Sorting**: Sorts data files within each logical partition independently. If your table is partitioned by day, Spark sorts the data inside each day folder. This is fast and restricts shuffles to individual partition boundaries.
- **Global Sorting**: Sorts data across the entire table, regardless of logical partitions. This requires a global range partitioner in Spark, resulting in a large network shuffle as data is redistributed across all Spark executors. Global sorting is more expensive but provides the highest possible query performance for non-partitioned tables or tables with coarse partitioning.

### Z-Order Spatial Clustering (Space-Filling Curves)

While sort-based compaction is highly effective when filtering on a single column, it has a significant limitation: you must prioritize one column over another. If you sort a table by `customer_id` and then by `order_date`, the data is organized primarily by customer ID. Within each customer ID, the records are sorted by date. If you query the table filtering only by `order_date`, the min/max statistics are ineffective because dates are scattered across different customer ID blocks.

Z-Order clustering solves this by organizing data along a multi-dimensional space-filling curve. A space-filling curve maps multi-dimensional attributes into a single-dimensional line while maintaining spatial locality. This means that points that are close to each other in multi-dimensional space remain close to each other in physical storage.

```
Z-Order Bit Interleaving Example:
Suppose we want to cluster by customer_id (integer representable) and order_date (integer days).

customer_id (binary): 0 1 0 1
order_date (binary):  1 1 0 0

Interleaved Z-Address: 0 1 1 1 0 0 1 0 (taking alternating bits)
```

To Z-Order data, the compaction engine takes the binary representations of the target columns and interleaves their bits to create a single coordinate (a Z-address). The data is then sorted based on this Z-address.

The mapping function $f: \mathbb{R}^d \to \mathbb{R}$ transforms multidimensional parameters into a single dimension. To perform Z-ordering on a dataset, the Spark coordinator first scans the target columns (for example, `customer_id` and `order_date`) to determine their minimum and maximum ranges. It then projects these values onto an integer grid. Once projected, the bits of the binary coordinate representations are interleaved:

- Let the coordinate values be represented as binary arrays. For a point $(x, y)$, where $x = x_1 x_2 ... x_k$ and $y = y_1 y_2 ... y_k$, the Z-address is constructed by taking alternate bits: $z = x_1 y_1 x_2 y_2 ... x_k y_k$.
- Spark sorts the rows based on this interleaved Z-value.
- The sorted records are written sequentially to Parquet files on S3.

Because the Z-address is built by alternating bits, a query filtering on either $x$ or $y$ (or both) can skip files. The Z-curve traces a recursive Z-shaped fractal path through the coordinate space. When the query engine applies a filter, it calculates the range of Z-values that could contain matching data, compares it to the min/max Z-addresses in each Parquet file footer, and skips the files that do not overlap.

#### Z-Order vs. Hilbert Curves

While Z-Ordering is widely used, it has some spatial partitioning issues. At quadrant boundaries, Z-Order curves make sudden jumps. For example, two adjacent points located on opposite sides of a main quadrant division line can end up with highly different Z-addresses, separating them physically on disk.

The Hilbert curve is an alternative space-filling curve that avoids these sudden jumps by dynamically rotating the coordinate grid at each level of detail. This rotation ensures that the curve never crosses itself and maintains smoother spatial locality. Some advanced compaction runtimes support Hilbert curve sorting, which can offer slightly better read performance than Z-Order, though at the expense of even higher compaction CPU overhead.

---

## 3. Configuring and Executing Compaction in Apache Spark

Compaction in Apache Iceberg is typically orchestrated using Apache Spark. Spark provides native SQL procedures to execute compaction on target tables.

We will use our standard analytical tables for these examples:

- `analytics.orders` (fields: `order_id`, `customer_id`, `order_date`, `status`, `amount`)
- `analytics.customers` (fields: `customer_id`, `name`, `email`, `state`, `signup_date`)

First, we set up our Spark session to connect to our Iceberg catalog:

```python
from pyspark.sql import SparkSession

# Initialize Spark Session configured with Iceberg catalog
spark = SparkSession.builder \
    .appName("IcebergTableCompaction") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.glue_catalog.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog") \
    .config("spark.sql.catalog.glue_catalog.warehouse", "s3://my-lakehouse-bucket/warehouse/") \
    .getOrCreate()
```

### Executing Bin-Packing Compaction

To run a fast bin-packing compaction on the `analytics.orders` table, we call the `rewrite_data_files` procedure using Spark SQL.

```python
# Execute bin-packing compaction using Spark SQL procedures
spark.sql("""
    CALL glue_catalog.system.rewrite_data_files(
      table => 'analytics.orders',
      strategy => 'binpack',
      options => map(
        'target-file-size-bytes', '536870912', /* 512 MB target size */
        'min-input-files', '10'                 /* Only compact partitions with >= 10 files */
      )
    )
""")
```

In this procedure call:

- `strategy => 'binpack'`: Specifies that we are using the bin-packing algorithm.
- `target-file-size-bytes`: Instructs the engine to target 512 megabytes per output file.
- `min-input-files`: Prevents Spark from spending compute resources on partitions that are already clean (containing fewer than 10 files).

### Executing Z-Order Compaction

For the `analytics.orders` table, we can Z-Order the data by `customer_id` and `order_date` to accelerate join queries and time-series reports.

```python
# Execute Z-Order compaction on the orders table
spark.sql("""
    CALL glue_catalog.system.rewrite_data_files(
      table => 'analytics.orders',
      strategy => 'sort',
      sort_order => 'zorder(customer_id, order_date)',
      options => map(
        'target-file-size-bytes', '536870912', /* 512 MB target */
        'max-file-group-size-bytes', '107374182400' /* Process in 100 GB groups */
      )
    )
""")
```

### Compacting Manifest Files

In addition to compacting data files, you should also compact metadata manifest files. Every time a write job runs, Iceberg writes a new manifest file. Over time, tables can accumulate hundreds of small manifest files, which slows down query planning.

We can merge small manifest files using the `rewrite_manifests` procedure:

```python
# Compact metadata manifests to optimize query planning
spark.sql("""
    CALL glue_catalog.system.rewrite_manifests(
      table => 'analytics.orders'
    )
""")
```

### Advanced Compaction Configurations and Partial Progress

When executing compaction on large fact tables (containing terabytes of data), running the entire compaction inside a single large transaction is risky. If the compaction job takes several hours and another writer commits an update to the table in the meantime, the compaction's CAS transaction may fail, forcing you to rerun the entire compaction.

To prevent this, you can configure partial progress. Partial progress divides the compaction job into separate file groups and commits each group independently.

```python
# Run compaction with partial progress enabled
spark.sql("""
    CALL glue_catalog.system.rewrite_data_files(
      table => 'analytics.orders',
      options => map(
        'partial-progress.enabled', 'true',
        'partial-progress.max-commits', '10',
        'max-concurrent-file-group-rewrites', '4',
        'target-file-size-bytes', '536870912'
      )
    )
""")
```

Let us dissect these properties:

- `'partial-progress.enabled' = 'true'`: Instructs Iceberg to commit compacted files in smaller batches rather than waiting for the entire table compaction to finish.
- `'partial-progress.max-commits' = '10'`: Limits the number of commits Iceberg can execute during this job, ensuring we do not overload the catalog with too many micro-commits.
- `'max-concurrent-file-group-rewrites' = '4'`: Allows Spark to compile up to 4 file groups in parallel, maximizing cluster utilization.

### Restricting Compaction with Filters

In many production environments, you only need to compact recent partitions. For example, if data is written continuously to the current day's partition, the historical partitions are already static and compacted. Compacting the entire table every night wastes massive amounts of cluster time.

You can restrict compaction to a specific partition or data range using the `where` option:

```python
# Compact only the data written in the month of May 2026
spark.sql("""
    CALL glue_catalog.system.rewrite_data_files(
      table => 'analytics.orders',
      where => 'order_date >= CAST("2026-05-01" AS DATE)'
    )
""")
```

### Programmatic Compaction via PySpark Actions API

In addition to running compaction using standard Spark SQL queries, you can orchestrate compactions programmatically using PySpark's access to the Java classes in the Spark actions framework. This is highly useful when building custom Python script orchestrators that are executed by Airflow or AWS Glue.

```python
# Reference the Java Classes using the PySpark JVM gateway
jvm = spark._jvm
table_identifier = jvm.org.apache.iceberg.catalog.TableIdentifier.of("analytics", "orders")
iceberg_catalog = spark._jsparkSession.sessionState().catalogManager().catalog("glue_catalog")
java_table = iceberg_catalog.loadTable(table_identifier)

# Construct and execute the RewriteDataFiles action programmatically
actions = jvm.org.apache.iceberg.spark.actions.SparkActions.get(spark._jsparkSession)
result = actions.rewriteDataFiles(java_table) \
    .binPack() \
    .filter(jvm.org.apache.iceberg.expressions.Expressions.greaterThanOrEqual("order_date", "2026-05-01")) \
    .option("target-file-size-bytes", "536870912") \
    .execute()

# Print execution summaries
print(f"Compacted data files count: {result.rewrittenDataFilesCount()}")
print(f"Added data files count: {result.addedDataFilesCount()}")
```

This Java interface interaction allows python processes to capture granular result payloads (such as the list of files removed and added) directly in their runtime variables, enabling programmatic logging and diagnostics.

---

## 4. Operational Cleaning: Snapshot Expiration and Orphan Files

While compaction optimizes active data layouts, tables still accumulate historical files that are no longer needed. To keep storage costs under control and maintain catalog performance, you must prune these historical assets.

### Apache Iceberg Metadata Architecture

To understand how snapshot expiration works, we must inspect the internal schemas of Iceberg metadata files:

1.  **Metadata JSON File**: Holds the table's schema, partitioning layout, and a log of all snapshots. It references a Manifest List file for each snapshot.
2.  **Manifest List File**: A binary Avro file that lists the manifest files associated with a specific snapshot. Its fields include:
    - `manifest_path`: The URI of the manifest file.
    - `added_snapshot_id`: The ID of the snapshot that added the manifest.
    - `added_data_files_count`: Number of data files added in this manifest.
    - `partitions`: Min/max values of partition fields within the manifest (used for query planning partition pruning).
3.  **Manifest File**: A binary Avro file that lists individual data and delete files. Its schema contains entry states (`0` for existing, `1` for added, `2` for deleted) and a `data_file` struct:
    - `file_path`: The physical location of the Parquet file on S3.
    - `file_format`: The storage format (e.g. Parquet).
    - `record_count`: Number of rows in the data file.
    - `column_sizes`: Map of column IDs to bytes stored.
    - `value_counts` and `null_value_counts`: Data distribution stats.
    - `lower_bounds` and `upper_bounds`: Min/max values for every column chunk (used for row group skipping).

### Detailed Manifest Field Properties

The fields stored inside the `data_file` struct are crucial for metadata-level query pruning:

- `lower_bounds` and `upper_bounds`: These maps store the minimum and maximum binary values for each column ID. When an engine receives a filter (for example, `WHERE amount > 500.0`), it checks these ranges. If the file statistics indicate that the maximum value in the file is `450.0`, the query engine skips parsing the file.
- `null_value_counts` and `nan_value_counts`: These arrays track how many rows in the column contain null values or floating-point NaN values. If a query filters for non-null values and a file contains only nulls, the file is bypassed immediately.
- `column_sizes`: Tracks the compressed byte sizes of each column chunk, allowing the query planner to calculate the memory required to load specific columns before reading the file from S3.

### Snapshot Expiration Mechanics

Iceberg's time travel feature allows you to query table states from days or weeks ago. Every time you insert, update, or delete data, Iceberg creates a new metadata snapshot. These historical snapshots reference physical data files on S3.

If you keep every snapshot forever, your storage consumption will grow continuously. To limit this growth, you should establish a snapshot retention window (such as 7 days) and expire older snapshots.

```python
# Expire snapshots older than seven days, retaining at least three snapshots
spark.sql("""
    CALL glue_catalog.system.expire_snapshots(
      table => 'analytics.orders',
      older_than => CAST(current_timestamp() - INTERVAL 7 DAYS AS TIMESTAMP),
      retain_last => 3
    )
""")
```

When `expire_snapshots` runs, the metadata changes as follows:

1.  **Identify Expirations**: Iceberg scans the table history log in the metadata JSON file, finding all snapshots created before the `older_than` threshold.
2.  **Filter Last Snapshots**: It protects the last `retain_last` snapshots from expiration, preserving basic history.
3.  **Compare Reference Sets**: It loads the manifest list files for the surviving snapshots and compiles a set of all active manifest paths and data file paths. It then loads the manifest list files for the expired snapshots.
4.  **Evaluate Manifest Reuse**: In Iceberg, multiple snapshots can share the same manifest files. If an expired snapshot references a manifest file that is also referenced by a surviving snapshot, that manifest file is retained.
5.  **Reconcile Deletion List**: Physical Parquet data files are added to a deletion list only if they are referenced in the manifests of expired snapshots and are not referenced by any manifest in any active snapshot.
6.  **Delete and Commit**: The coordinator deletes the orphan Parquet files and expired manifest list files from S3, writes a new metadata JSON file that removes the expired snapshots from the table's snapshot history array, and commits the pointer swap in Glue catalog.

This reference-tracking architecture prevents deleting data that is still active, while purging old files safely.

### Removing Orphan Files

Under normal operations, Iceberg tracks all files. However, write failures can sometimes cause files to accumulate on S3 without being registered in the metadata catalog. For instance, if a Spark executor crashes halfway through a write transaction, it may have already written several Parquet files to the S3 bucket. Because the transaction was never committed to the Glue Catalog, these files are not linked to any metadata snapshot. They are \"orphan files.\"

Orphan files are invisible to query engines, but they continue to consume S3 storage space and increase your cloud storage costs. You can clean them using the `remove_orphan_files` procedure.

```python
# Purge orphan files older than three days from the orders storage location
spark.sql("""
    CALL glue_catalog.system.remove_orphan_files(
      table => 'analytics.orders',
      older_than => CAST(current_timestamp() - INTERVAL 3 DAYS AS TIMESTAMP)
    )
""")
```

The `remove_orphan_files` procedure:

1.  Scans the physical S3 directory associated with the table.
2.  Reads the table's metadata tree to construct a list of all files that are officially registered in active snapshots.
3.  Compares the physical file list with the registered file list.
4.  Identifies any physical files on S3 that are not in the metadata list and deletes them.

We configure the `older_than` parameter to 3 days to prevent deleting files from active, running write jobs that have not yet committed their transactions.

---

## 5. Query Performance and the Dremio Acceleration Layer

Establishing regular compaction, snapshot expiration, and manifest rewriting routines ensures that your Iceberg tables remain in an optimal state for analytical query engines. This optimization is especially beneficial when querying data through a Dremio engine.

```
                         Dremio Optimization Pipeline
+--------------------+
|   User SQL Query   |
+---------+----------+
          |
          v
+--------------------+
| Dremio Coordinator | --> Caches Iceberg metadata locally.
+---------+----------+     Plans queries in milliseconds, skipping S3 lookups.
          |
          v
+--------------------+
|   Dremio Executor  | --> Scans compacted Parquet files column-by-column.
+---------+----------+     Loads values directly into Apache Arrow memory.
          |
          +--------------> Applies cached positional delete lists in-memory.
```

The Dremio engine is an open lakehouse query accelerator designed for interactive analytics. It bypasses traditional storage bottlenecks using several structural features.

### 1. Vectorized Memory Scans via Apache Arrow

Dremio uses Apache Arrow as its internal in-memory execution format. Apache Arrow represents data in column arrays rather than rows, matching the physical layout of Parquet files.

When Dremio reads compacted Parquet files, it loads the column data chunks directly into Arrow memory buffers. Because the format is identical, the engine avoids the CPU overhead of serializing and deserializing rows. When tables are compacted into clean 512 MB files, Dremio read tasks can stream column segments into memory at hardware speeds.

### 2. Caching Positional Delete Files

In Iceberg tables, row-level updates and deletes are often managed using the Merge-on-Read (MoR) strategy. Instead of rewriting an entire Parquet file to delete a single row, the writer creates a small \"positional delete file\" listing the file path and row index of the deleted record.

When querying the table, standard query engines must read the base data files and the delete files, join them in memory, and filter out the deleted rows. If a table contains thousands of uncompacted delete files, this join operation becomes a massive CPU bottleneck.

The Dremio engine accelerates this by caching positional delete files in memory. Dremio loads these deleted row indexes into an active coordinator cache. When an executor scans a base Parquet file, Dremio applies the cached delete index mask in memory, avoiding the need to load and parse delete files from S3 for every query.

### 3. Local Coordinator Metadata Caching

Query planning in Iceberg requires traversing the metadata tree: reading the catalog pointer, loading the metadata JSON, parsing the manifest list, and reading the manifest files. If the catalog is remote and S3 network latency is high, this planning phase can take several seconds.

Dremio eliminates this overhead by maintaining a local metadata cache on its coordinator nodes. When a query is executed, Dremio compares the table version pointer in the Glue Catalog. If the version has not changed, Dremio plans the query using its local metadata cache, reducing query startup latency from seconds to milliseconds.

### 4. Data Reflections Refresh Management

Dremio includes an automatic query acceleration feature called Data Reflections. Reflections are physically optimized representations of datasets stored as Parquet files on S3.

For example, we can configure an Aggregation Reflection on our joined `analytics.orders` and `analytics.customers` dataset. When a user runs a query, Dremio's optimizer (which utilizes Apache Calcite) parses the query into a logical algebra tree. Calcite compares this tree with the structures of active Reflections. If a match is found, the optimizer rewrites the query plan to scan the Reflection rather than the raw tables, returning results in milliseconds.

For these Reflections to operate efficiently, the underlying Iceberg tables must be regularly compacted. If the base tables are fragmented, Dremio's Reflection refresh jobs take longer to run, consuming excess cluster resources.

Dremio manages Reflections using scheduled refresh cycles. When a reflection is scheduled for update, Dremio checks the metadata JSON log. If the changes are append-only (new files added), Dremio can execute an incremental refresh, reading only the newly added Parquet files and appending their results to the Reflection storage location. However, if a compaction job or row-level update has rewritten the base files (changing the physical file layouts), Dremio must execute a full refresh, reading the entire base table and rebuilding the Reflection Parquet files. Keeping tables compacted ensures that full refreshes are completed quickly without impacting database cluster resources.

---

## 6. Maintenance Scheduling and S3 Storage Tiering Integration

To keep your open lakehouse running smoothly, you should automate maintenance tasks using a scheduler like Apache Airflow or AWS Glue Workflows.

### Storage Optimization via S3 Intelligent-Tiering

While compaction and cleanups manage file volume, long-term storage costs can still accumulate. Many analytical datasets have a strict access decay curve: recent data (for example, the last 30 days) is queried constantly, while historical data (older than 90 days) is rarely accessed but must be retained for compliance or year-over-year reporting.

To optimize costs without introducing operational complexity, you should configure Amazon S3 Intelligent-Tiering on your lakehouse bucket. S3 Intelligent-Tiering automatically monitors access patterns at the object level and transitions inactive Parquet files to lower-cost access tiers:

1.  **Frequent Access Tier**: Default storage state. Data is read here at regular rates.
2.  **Infrequent Access Tier**: If an object is not accessed for 30 consecutive days, S3 moves it here, saving up to 40 percent on storage costs.
3.  **Archive Instant Access Tier**: If an object remains unaccessed for 90 consecutive days, it transitions here, saving up to 68 percent.

Because Iceberg references exact file paths in metadata, query engines continue to access objects directly without changes, and S3 handles the tier promotion instantly if an old partition is suddenly queried. By combining Iceberg's compaction (which ensures files are large and optimized for tier transitions) with S3 Intelligent-Tiering, you build an automated, low-cost long-term storage system.

### Recommended Scheduling Checklist

#### Daily Tasks

- **Bin-Packing Compaction**: Run daily bin-packing on highly active partitions in the `analytics.orders` table to merge small files written by streaming ingest pipelines during the day.
- **Monitor S3 Throttling**: Review CloudWatch metrics for S3 `5xx` errors. If throttling occurs, verify that Iceberg's prefix hashing features are enabled.

#### Weekly Tasks

- **Z-Order Compaction**: Run sort-based or Z-Order compaction on the `analytics.orders` table during off-peak hours (such as over the weekend) to reorganize the data by `customer_id` and `order_date`.
- **Snapshot Expiration**: Run `expire_snapshots` with a 7-day retention window to clean up historical Parquet files and release S3 storage.
- **Manifest Compaction**: Run `rewrite_manifests` to consolidate metadata files and maintain fast query planning.

#### Monthly Tasks

- **Orphan File Cleanup**: Run `remove_orphan_files` with an `older_than` threshold of 3 days to purge abandoned files from failed writes.
- **Review Table Properties**: Audit table metadata retention properties to ensure that snapshot retention parameters match business compliance needs.

---

## 7. Summary

Building an open lakehouse on AWS using Apache Iceberg, the AWS Glue Catalog, and S3 provides a reliable, cost-efficient, and scalable foundation for enterprise data platforms. However, maintaining high performance requires regular attention to the physical layout of your data.

- Implement **bin-packing compaction** daily to merge small files written by streaming ingestion pipelines.
- Run **Z-Order compaction** weekly to group related rows spatially, enabling efficient column group skipping during queries.
- Execute **snapshot expiration** and **orphan file cleanup** regularly to release cloud storage and lower S3 costs.

Optimizing your physical storage layouts ensures that query engines like **AWS Athena** can execute ad-hoc analysis efficiently, and that the **Dremio engine** can leverage its vectorized Arrow execution, metadata cache, and Data Reflections to deliver sub-second query performance for interactive analytical applications.
