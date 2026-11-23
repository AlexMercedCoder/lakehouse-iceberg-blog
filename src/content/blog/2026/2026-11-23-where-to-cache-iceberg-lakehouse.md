---
title: "Where to Cache an Iceberg Lakehouse: Engine, Shared, and Storage-Tier Caches Compared"
description: "Compare engine-local, shared, and storage-tier caches for Apache Iceberg tables: invalidation by snapshot, multi-engine waste, cross-cloud reads."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Data Engineering"
tags:
  - Apache Iceberg
  - caching
  - query performance
  - Alluxio
  - data lakehouse
slug: "where-to-cache-iceberg-lakehouse"
draft: false
canonicalURL: https://datalakehousehub.com/blog/where-to-cache-iceberg-lakehouse/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/where-to-cache-iceberg-lakehouse/).

Iceberg tables can be cached in three places: inside each query engine, in a shared layer between engines and object storage, or in the storage tier itself. In November 2026, Oracle and Google added storage-side and cross-cloud caches. Which tier fits depends on how many engines read the data and how fresh it must be.

Here is the problem as it usually shows up. A team runs a Trino cluster for dashboards and a Spark cluster for feature pipelines. Both read the same 40 Iceberg tables in Amazon S3. Someone turns on the Trino file cache, dashboards get faster, and the S3 request bill drops for that cluster. Then the Spark jobs keep reading the same Parquet files from S3, at full price, every hour. A month later a data scientist asks why her notebook shows yesterday's rows when the dashboard already shows today's.

Those are two different cache questions wearing one costume. The first is about placement: which tier holds the bytes, and who gets to share them. The second is about freshness: what decides that a cached thing is no longer the right thing to read. Apache Iceberg gives you an unusually clean answer to the second question, and that answer changes how you should think about the first.

If you want the definitions of hits, misses and time-to-live (TTL) first, the [Caching Explained for the Data Lakehouse](https://datalakehousehub.com/knowledgebase/caching/) glossary entry covers them. If your question is about caching the answers an AI agent returns, rather than the table files underneath, read [Semantic Caching for Data Agents](https://datalakehousehub.com/blog/semantic-caching-data-agents/) instead. This article stays at the level of files and bytes.

A short disclosure: I work at Dremio, which ships its own engine-side file cache, documented in the [Dremio Columnar Cloud Cache (C3)](https://iceberglakehouse.com/iceberg/dremio-columnar-cloud-cache-c3/) knowledge base page. The categories below apply to every engine, and the product examples come from each vendor's public documentation.

## The Three Tiers, With Products as Examples Only

Every cache keeps a copy of a remote byte somewhere closer, so the next read costs less than the first. For an Iceberg lakehouse, the remote byte sits in object storage, and the copy lands in one of three tiers.

### Tier 1: inside the query engine

An engine-local cache stores file pages on disks attached to the engine's own worker nodes. The first query that reads a Parquet file pulls it from object storage. The worker keeps a copy on local SSD, and later queries scheduled on that worker read the local copy.

Trino is a clean example. Its [file system cache](https://trino.io/docs/current/object-storage/file-system-cache.html) works with the Delta Lake, Hive and Iceberg connectors. The `alluxio` cache manager "caches files on local disks with the help of the open source Alluxio libraries." So Trino embeds Alluxio code as a library on each worker, without a separate Alluxio cluster. The docs say each node's cache is "managed separately," and the scheduler prefers "a fixed set of nodes for a given file" so repeat reads land where the bytes already sit.

Databricks offers the same tier for Spark workloads. Its [disk cache](https://docs.databricks.com/aws/en/optimizations/disk-cache) stores a copy of remote Parquet files "on its local storage in a fast intermediate format." The docs say it "works for all Parquet data files, including Delta Lake tables," and that it lives on each worker's local storage. Databricks also separates it clearly from the Spark cache, which holds in-memory DataFrame blocks and needs explicit code to populate.

The bytes sit one hop from the CPU that needs them. The weakness is scope. Only that cluster benefits, and when it scales down or restarts, the warm set shrinks with it.

### Tier 2: a shared layer between engines and storage

A shared cache runs as its own service. Engines read through it, and it fetches from object storage on a miss. Because the cache is not owned by one engine, a Parquet file that Trino warmed is already warm when Spark asks for it.

Alluxio is the reference example for this tier. Its [core concepts](https://documentation.alluxio.io/ee-da-en/core-concepts) page describes a master-less design in which "workers are typically co-located with your compute applications" and the client uses "a consistent hashing algorithm to map file paths to a set of distributed workers." It also describes eviction by policy (least recently used, or LRU, is the example given) and TTL settings that purge old entries. Alluxio's [data lake connectors](https://documentation.alluxio.io/ee-da-en/da-3.2/compute/data-lake-connectors) page names Trino and Spark as engines and Hive, Iceberg and Delta Lake as table formats.

One detail matters for anyone reading older blog posts. Trino's separate [Alluxio file system support](https://trino.io/docs/current/object-storage/file-system-alluxio.html) "has been removed," and the page points users to native file system support instead. Check what your Trino and Alluxio versions document before planning around the older integration.

The strength of this tier is reuse across engines. The cost is a second distributed system to size, patch, monitor and pay for, with its own failure modes.

### Tier 3: the storage tier itself

The third option skips the cache service entirely. You keep hot data on a faster storage class, close to compute, and every engine reads it through the normal object storage API.

Amazon S3 Express One Zone is the clearest example. AWS describes it as "a high-performance, single-zone Amazon S3 storage class" built for "consistent, single-digit millisecond data access," with objects stored in directory buckets inside one Availability Zone. AWS recommends placing the bucket in the same zone as your compute. The tradeoff is spelled out in the [S3 Express One Zone documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-high-performance.html). Data is stored "across multiple devices within a single Availability Zone but doesn't store data redundantly across Availability Zones," and the class is designed for 99.95 percent availability within that zone.

The November 2026 announcements also sit in this tier, or next to it. Oracle's Lake Cache, per [SiliconANGLE's November 4 report](https://siliconangle.com/2026/11/04/semantic-layer-turns-lakehouses-ai-decision-backbones-oracleaiworld/), "speeds up queries by moving the most-used Iceberg tables into Exadata's flash cache." The report gives no further detail on mechanics. Google, per [Techzine's report the same day](https://www.techzine.eu/news/analytics/145556/google-agentic-data-cloud-gets-cross-cloud-lakehouse/), made cross-cloud interconnect and caching for AWS and Azure generally available, with "retrieved data blocks" cached "locally within Google Cloud." Both are vendor-managed caches tied to that vendor's platform.

Every reader of a storage tier benefits with no client changes beyond the bucket or endpoint. The cost is placement: which tables go to the fast tier, and how they move in and out.

## Invalidation: Snapshot IDs as the Cache Key

Cache invalidation is hard in most systems because the thing you cached can change underneath you. A row gets updated in place, and the cache has no way to know.

Iceberg removes most of that problem by design. The [Iceberg table spec](https://iceberg.apache.org/spec/) says it plainly: "Once written, data and metadata files are immutable until they are deleted." A Parquet data file at a given path never changes its bytes. Manifests are immutable too. When a writer commits new data, it writes new files and a new snapshot, and the catalog swaps a pointer to the new table metadata.

That gives you a two-level model for freshness.

### Level 1: file bytes never go stale

A cache keyed by file path holds bytes that are correct forever for that path. There is no case where the cached copy of `00042-3-...parquet` disagrees with the object in storage, because the object in storage never changes. The worst outcome for a data file cache is waste: it holds bytes for a file that a later snapshot no longer references, or that snapshot expiration already deleted. Those entries age out through LRU eviction or TTL.

This is why engine-local and shared caches work well on Iceberg without clever invalidation logic.

### Level 2: the snapshot decides which bytes you should read

Staleness on an Iceberg table lives one level up, in the list of files a query reads. That list comes from the current snapshot, which comes from the table's current metadata file, which the catalog points to.

So the real cache key for a query's input is the snapshot ID. Two reads at the same snapshot ID see the same rows, regardless of which tier served the bytes.

The practical rule follows. Cache data files freely, keyed by path. Treat anything that resolves "which snapshot is current" as the freshness boundary, and keep its staleness window short and explicit.

### Where engines put that boundary

Engines cache the snapshot-resolution step too, and that is where the "yesterday's rows" complaint usually comes from. Iceberg's Spark integration documents a catalog cache with two properties in its [Spark configuration page](https://iceberg.apache.org/docs/latest/spark-configuration/). `cache-enabled` defaults to `true`. `cache.expiration-interval-ms` defaults to 30 seconds, where `-1` disables expiration and `0` disables caching entirely. A long-running Spark session with expiration disabled keeps reading the snapshot it first loaded until something refreshes the table.

Trino's Iceberg connector has its own version of this. The [Iceberg connector docs](https://trino.io/docs/current/connector/iceberg.html) list `iceberg.metadata-cache.enabled`, which controls in-memory caching of metadata files on the coordinator, and note that this cache "is not used when `fs.cache.enabled` is set to true." The Trino file system cache page also documents a separate `memory` cache manager that the coordinator uses for metadata files during planning, with a default TTL of one hour. Metadata files are immutable too, so caching them by path is safe. The pointer to the current metadata file is what has to stay fresh, and that comes from the catalog.

Shared caches need the same care. Alluxio's data lake connectors page states that "it is highly recommended to avoid caching the corresponding metadata files" for Iceberg tables, and it suggests excluding those paths with a `skipCache` filter. The reason is the same two-level model. Data files are safe to share. Anything that decides the current state belongs to the catalog.

For table bytes, the summary is simple. Your data cache almost never makes a reader stale. Your metadata and catalog caches do, and their TTLs are the numbers to write down.

## A Config Walkthrough: One Engine Cache, One Freshness Window

Abstract tiers are easier to reason about with real settings in front of you. The blocks below come straight from the Trino and Iceberg documentation. They show an engine-local data cache on one side and a catalog freshness window on the other.

First, Trino. File system caching is configured at the node level, then switched on per catalog.

```properties
# etc/config.properties (every node)
cache-manager.config-files=etc/cache-manager-alluxio.properties,etc/cache-manager-memory.properties

# etc/cache-manager-alluxio.properties
cache-manager.name=alluxio
fs.cache.directories=/tmp/trino-cache
fs.cache.max-sizes=500GB

# etc/catalog/<your-iceberg-catalog>.properties
fs.cache.enabled=true
```

Here is what each part does. `cache-manager.config-files` tells each node which cache managers to load. The `alluxio` manager handles table data on local disk, and the `memory` manager handles metadata files on the coordinator's heap. `fs.cache.directories` names the local paths for cached pages. The docs say storage "should be local, dedicated on each node, and not shared," and they advise against using the node's root partition. `fs.cache.max-sizes` caps each directory (you can use `fs.cache.max-disk-usage-percentages` instead). The `500GB` value is the docs' example, not a recommendation. Size it from the worksheet later in this article.

Two defaults matter. `fs.cache.ttl` defaults to `7d`, so an untouched page gets dropped after a week. `fs.cache.page-size` defaults to `1MB`, the unit of caching inside each file. The per-catalog `fs.cache.enabled=true` line turns caching on for that catalog's tables.

Now Spark with Iceberg. The data cache depends on your Spark platform, but the freshness window comes from the Iceberg catalog properties:

```properties
spark.sql.catalog.lake=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.lake.type=rest
spark.sql.catalog.lake.uri=https://catalog.example.internal/api/catalog
spark.sql.catalog.lake.cache-enabled=true
spark.sql.catalog.lake.cache.expiration-interval-ms=30000
```

`SparkCatalog` with `type=rest` points Spark at an Iceberg REST catalog at the given URI (the hostname here is a placeholder). The last two lines restate the defaults from the Iceberg docs: the catalog cache is on, and entries expire after 30,000 milliseconds. In practice this means a Spark session can plan against a table state that is up to 30 seconds old before it asks the catalog again. Setting the interval to `0` disables catalog caching, so every table load goes back to the catalog. Setting it to `-1` disables expiration, which is how long-lived sessions end up hours behind.

Put the two blocks side by side and the two-level model becomes concrete. Trino's data cache can hold a page for a week, and it is never wrong for that path. Spark's catalog cache holds a table pointer for 30 seconds, and that window is the real bound on staleness. When someone files a "stale data" ticket, check the catalog and metadata cache settings before you blame the file cache. On Databricks, the data-cache side is set with Spark configs such as `spark.databricks.io.cache.enabled` and `spark.databricks.io.cache.maxDiskUsage`.

## Multi-Engine Estates: When an Engine-Local Cache Is Wasted

The whole pitch of an Iceberg lakehouse is that many engines read one copy of the data. That pitch has a side effect on caching. Every engine-local cache warms its own copy of the same hot files, and none of them share.

Picture three readers on one table: a Trino cluster for BI, a Spark cluster for nightly transforms, and a Python service using a lightweight library for feature lookups. If each one caches locally, the hottest Parquet files get fetched from object storage three times and stored on three sets of SSDs. The request savings from one cache do nothing for the other two.

That duplication is not automatically bad. It becomes waste under specific conditions, and you can check for each one.

### Condition 1: the overlap is high

If two engines read mostly different tables, separate caches cost almost nothing extra. Measure overlap by listing hot tables per engine from query logs and intersecting the lists. If BI and ML pipelines both hammer the same fact tables, you pay twice for one warm set.

### Condition 2: one engine reads too rarely to stay warm

A nightly Spark job on a cluster that spins up for that job and terminates after gets almost nothing from a local cache, because it starts cold every run. A shared layer or a faster storage tier serves this reader better, because the warm set outlives the cluster.

### Condition 3: clusters autoscale hard

Engine-local caches assume the same workers stick around. When an autoscaler removes half the workers at night, their cached pages leave with them, and the morning dashboard rush pays full object storage latency until new workers warm up. If your clusters breathe a lot, a cache outside the cluster keeps more of its value.

### Condition 4: freshness requirements differ per engine

This one cuts the other way. A shared layer shares file bytes only. Each engine still needs its own catalog TTL, so differing freshness needs are no argument against sharing the bytes.

### When engine-local still wins

If one engine serves most of your interactive traffic, its local cache is the cheapest speedup you can buy, and Trino and Databricks both ship it as a configuration change. Count the readers that read the same hot tables and keep warm clusters running. If that count is one, cache in the engine. If it is two or more and the overlapping hot set is large, price a shared layer or a storage tier against the duplicated caches, using the worksheet below. Below that point, a second distributed system costs more in people time than the duplicate SSD space costs in money.

## Cross-Cloud Reads: Caching vs. Replication vs. Interconnect

Google's November 4 announcement puts a fourth question on the table: what to do when the engine runs in one cloud and the Iceberg table lives in another. Three answers exist, and they get blurred together in vendor messaging.

### Option A: cache the remote bytes near the engine

This is what Techzine describes for Google: data blocks retrieved from AWS or Azure are "cached locally within Google Cloud," over a private connection. The first read of a block crosses clouds. Repeat reads of the same block stay local.

Immutable data files make this safe: a cached remote block stays correct for as long as its file exists. The engine still fetches fresh metadata from the source catalog, and new commits produce new files that cross the boundary on first read. Transfer scales with the unique bytes your queries touch, not the table's total size. If dashboards hit the last 30 days of a five-year table, you move those 30 days once, plus new files.

### Option B: replicate the table into the engine's cloud

Replication copies the table, or a subset of it, into storage in the second cloud on a schedule or continuously. Readers in that cloud then read a local Iceberg table.

Replication moves every byte you choose to replicate, whether anyone reads it or not, and staleness equals your replication interval. Nipun Agarwal, senior vice president of software engineering for Oracle Database, made a related point in the SiliconANGLE piece: scheduled refreshes of copied data "can fall short when agents request it on demand." That paraphrase is the article's, not a direct quote, but the mechanism is clear. A copy is only as fresh as its last refresh.

Replication earns its place when the second cloud reads most of the table, often, and when you need the reads to survive an outage of the source cloud. A cache does not give you that second property, because a cache miss still needs the source.

### Option C: read directly over an interconnect

The third option is no copy at all. The engine reads straight from the remote bucket over a dedicated link, and every scan pays cross-cloud latency. Techzine reports that Google pairs its cache with a generally available interconnect and describes the queries as having "no variable egress costs," without further pricing detail. Confirm the cost model against your own contract. An interconnect changes the price and latency of each cross-cloud byte. A cache changes how many bytes cross at all.

### Choosing among them

Ask three questions in order. First, what fraction of the remote table do readers in the second cloud actually touch? Low fractions favor caching. Second, how fresh must those readers be? Tight freshness rules out replication on a slow schedule. Third, must the second cloud keep working if the first cloud's storage is unreachable? If yes, you need a replica, and a cache sits on top of it as an optimization.

Most estates end up with a mix. Hot, widely read tables get replicated. Long-tail tables get cached on demand. Rare one-off reads go direct.

## A Cost Worksheet: Inputs to Measure in Your Own Estate

I am not going to hand you numbers. A figure from someone else's estate tells you nothing about your prices or query mix. Here are the inputs, how to measure each, and how they combine. The broader method for modeling lakehouse spend lives in [Building an Honest TCO Model](https://iceberglakehouse.com/posts/lakehouse-vs-warehouse-tco/). This worksheet is the cache-specific slice of it.

### Inputs about the data

**Hot working set size.** The data file bytes your frequent queries touch over a day or a week. This sets the useful cache size. Too small and the cache churns.

**Commit frequency per hot table.** Each commit adds new files, and new files start cold in every tier.

**Churn from maintenance.** Every file compaction rewrites is a new path, so the cache treats it as new data. Count bytes rewritten per day.

Iceberg's metadata tables give you the first two inputs directly. This Spark SQL works against any Iceberg table (Trino exposes the same data as `"table$snapshots"` and `"table$files"`):

```sql
-- Commits per hour over the table's retained history
SELECT date_trunc('hour', committed_at) AS commit_hour,
       operation,
       count(*) AS commits
FROM prod.db.events.snapshots
GROUP BY date_trunc('hour', committed_at), operation
ORDER BY commit_hour DESC;

-- Size of the current snapshot's data files
SELECT count(*) AS data_files,
       sum(file_size_in_bytes) AS total_bytes
FROM prod.db.events.files
WHERE content = 0;
```

The first query groups the `snapshots` metadata table by hour and by `operation`. Appends tell you how often new data arrives. Replace and overwrite operations point at compaction or rewrite jobs, which create cold paths in every cache. The second query reads the `files` metadata table, which lists the current snapshot's files, and filters to `content = 0`, which the Iceberg docs define as data files (1 and 2 are position and equality deletes). The total is an upper bound on the table's hot set. Your real hot set is the subset of those bytes that queries touch, which you get from the next group of inputs.

### Inputs about the readers

**Bytes read per engine per day, by table.** Pull this from each engine's query history, then intersect by table to see overlap.

**Repeat-read ratio.** The share of those bytes already read in the prior window. A low ratio means caching anywhere helps little.

**Cluster uptime pattern.** Hours per day each cluster runs, and how much it scales. An engine-local cache only pays during uptime.

**Freshness requirement per reader.** The maximum acceptable lag between a commit and a reader seeing it. This sets catalog TTLs and rules out slow replication schedules.

### Inputs about price

**Object storage request and transfer cost** for the reads a cache avoids, including cross-region and cross-cloud transfer, from your bill by bucket.

**Cache hardware cost.** For engine-local caches, the price difference between worker instances with and without local SSD, times the node count and uptime. For a shared layer, the full instance cost of its workers plus the people time to run it. For a storage tier, the storage price of the faster class for the bytes placed there, plus the request price on that class, plus the cost of whatever job moves tables in and out.

**Operational time.** Hours per month spent tuning, debugging and upgrading the cache. This is the input most teams leave out, and for a shared layer it often decides the answer.

### How the inputs combine

For each candidate tier, estimate avoided cost as repeat-read bytes multiplied by the per-byte read cost they avoid, plus avoided request charges. Then subtract the tier's own cost: hardware, storage class premium, people time and the cold-read penalty from commits and compaction. Run it per hot table, then sum. Do it for engine-local with one cache per engine, for a shared layer with one cache for all, and for a storage tier with the hot set placed on the fast class.

Keep latency as a separate column. Interactive dashboards with a response-time target sometimes justify a cache even when the cost math is flat. Write that reason down next to the bill.

## A Decision Matrix by Workload Shape

With the worksheet filled in, most estates fall into one of a handful of shapes. The table maps each shape to the tier that usually fits and the setting to watch.

| Workload shape                                                                          | Tier that usually fits       | Why                                | Watch this                                 |
| --------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------- | ------------------------------------------ |
| One engine serves most interactive queries on long-lived clusters                       | Engine-local                 | Cheapest speedup, no new service   | Catalog and metadata cache TTLs            |
| Two or more long-lived engines share a large hot set                                    | Shared layer                 | One warm copy serves every engine  | Excluding metadata paths, operational time |
| Ephemeral job clusters that start cold every run                                        | Storage tier or shared layer | The warm set outlives the cluster  | Placement jobs and storage class premium   |
| Engine in one cloud, data in another, readers touch a small slice                       | Cross-cloud cache            | Moves only the bytes read, once    | First-read cost after every commit         |
| Engine in one cloud, data in another, readers touch most of it or need outage tolerance | Replica, cache on top        | Local reads survive source outages | Replication lag as the staleness bound     |
| Tables that commit every few minutes with tight freshness needs                         | Engine-local or none         | New files start cold everywhere    | Commit rate vs. repeat-read ratio          |

Two notes on reading it. First, the tiers stack. An engine-local cache on top of a storage-tier hot copy is a common pattern, and nothing in Iceberg prevents it. Second, the "watch this" column is where the failures show up. The most common one I see is a stale-data ticket blamed on the file cache when the cause is a long catalog cache expiration. The next most common is a cache hit rate that collapses after a compaction job rewrites the hot partitions, which is expected behavior and not a cache bug.

## Conclusion

Caching an Iceberg lakehouse comes down to two separate decisions. Placement decides who shares the warm bytes: one engine, every engine, or every reader of a storage class. Freshness decides which snapshot a reader sees, and on Iceberg that decision lives in the catalog and metadata caches, not in the data cache. Immutable data files make the data tier safe to cache aggressively. The snapshot pointer is the thing to keep on a short, written-down leash.

The November 2026 announcements from Oracle and Google show vendors moving caches closer to storage and across clouds. That is a reasonable direction for estates with many engines or many clouds. Your own choice still comes from the worksheet: measure the hot set, the overlap between engines, the commit rate and the prices you actually pay, then pick the tier that pays for itself.

## Keep Going

If this piece was useful, I have written a lot more on lakehouse architecture and Apache Iceberg internals. _Architecting an Apache Iceberg Lakehouse_ (Manning) covers how storage, catalogs and engines fit together, including the tradeoffs behind decisions like this one. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [SiliconANGLE: Oracle rethinks the lakehouse as AI agents become data consumers (November 4, 2026)](https://siliconangle.com/2026/11/04/semantic-layer-turns-lakehouses-ai-decision-backbones-oracleaiworld/)
- [Techzine: Google Agentic Data Cloud gets cross-cloud lakehouse (November 4, 2026)](https://www.techzine.eu/news/analytics/145556/google-agentic-data-cloud-gets-cross-cloud-lakehouse/)
- [Trino: File system cache](https://trino.io/docs/current/object-storage/file-system-cache.html)
- [Trino: Alluxio file system support](https://trino.io/docs/current/object-storage/file-system-alluxio.html)
- [Trino: Iceberg connector](https://trino.io/docs/current/connector/iceberg.html)
- [Databricks: Optimize performance with caching (disk cache)](https://docs.databricks.com/aws/en/optimizations/disk-cache)
- [Alluxio: Core concepts](https://documentation.alluxio.io/ee-da-en/core-concepts)
- [Alluxio: Data lake connectors](https://documentation.alluxio.io/ee-da-en/da-3.2/compute/data-lake-connectors)
- [AWS: S3 Express One Zone](https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-high-performance.html)
- [Apache Iceberg table spec (GitHub source)](https://github.com/apache/iceberg/blob/main/format/spec.md)
- [Apache Iceberg Spark configuration (GitHub source)](https://github.com/apache/iceberg/blob/main/docs/docs/spark-configuration.md)
- [Apache Iceberg Spark queries (GitHub source)](https://github.com/apache/iceberg/blob/main/docs/docs/spark-queries.md)
