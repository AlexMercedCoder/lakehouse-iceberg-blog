---
term: "Dremio Metadata Caching"
description: "Dremio Metadata Caching is the process of storing table metadata (such as schemas, partition statistics, and file lists) locally on coordinator nodes to accelerate query planning and bypass object storage request latency."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-sabot-engine"
  - "iceberg-metadata-file"
  - "iceberg-manifest-list"
  - "dremio-columnar-cloud-cache-c3"
keywords:
  - dremio metadata caching
  - query planning acceleration
  - object storage latency bypass
  - metadata cache refresh
  - coordinator caching
lastUpdated: 2026-05-29
---

## Dremio Metadata Caching

**Dremio Metadata Caching** is an optimization system that stores table structures, file locations, schemas, and partition statistics locally on Dremio coordinator nodes. During the query compilation phase, the coordinator node must evaluate the composition of a table (such as file lists, column boundaries, and data sizes) to construct an optimal query plan.

Retrieving this metadata directly from cloud object storage (such as Amazon S3, Azure Data Lake Storage, or Google Cloud Storage) or external database catalogs on every query introduces high latency. Dremio Metadata Caching keeps this information in local coordinator storage, enabling rapid query planning and sub-second execution starts.

## Why Metadata Caching is Critical

Querying data lakes without metadata caching suffers from significant performance bottlenecks:

- **Request Latency**: Cloud storage requests suffer from Time to First Byte (TTFB) latency. Fetching multiple metadata files to plan a query can take several seconds, even before query execution begins.
- **API Request Costs**: Cloud providers charge per metadata read request (for example, GET and LIST calls). Caching metadata locally dramatically reduces the number of requests sent to the cloud storage provider.
- **Throttling Prevention**: Relational databases and object stores apply request limits. High-concurrency query engines can trigger API rate limiting or throttling without a local cache.

## How Dremio Caches Table Metadata

Dremio's coordinator handles metadata tracking based on the data source type:

### For Raw File Directories

When querying raw files (such as directories containing Parquet or CSV logs), Dremio automatically scans the directories, learns the schemas, and caches the file listings and block locations.

### For Apache Iceberg Tables

Apache Iceberg tables maintain their own metadata structure (manifest lists, manifest files, and `.metadata.json` files). Dremio's coordinator reads these Iceberg files and caches their contents locally. During query planning:

1.  **Cache Lookup**: Dremio checks the local cache for the table's current snapshot and manifest definitions.
2.  **Split Planning**: The query planner uses the cached manifest information to partition data and calculate file splits.
3.  **Bypassing S3 Reads**: The planner avoids contacting S3 for manifest files, completing query compile loops in milliseconds.

## Cache Refresh Configurations

To ensure data accuracy, Dremio provides configurable policies to manage cache synchronization:

- **Expire Metadata After**: Controls how long Dremio trusts the cached metadata before executing a background refresh call.
- **Metadata Dataset Discovery**: Configures how Dremio discovers new files in a directory (for example, automatically scanning or relying on manual refreshes).
- **Manual Refresh SQL**: Engineers can force an immediate metadata synchronization using SQL statements:

```sql
ALTER PDS analytics.orders REFRESH METADATA;
```

For Iceberg tables managed through REST Catalogs (like Apache Polaris or other managed catalogs), metadata changes are communicated instantly via catalog pointer updates, ensuring Dremio queries read fresh data without metadata lag.
