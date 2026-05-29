---
term: "Dremio Iceberg Metadata Sync"
description: "Dremio Iceberg Metadata Sync is the background coordination process that updates Dremio's catalog pointer to reference the latest snapshot metadata file of external Iceberg tables."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-metadata-caching"
  - "iceberg-metadata-file"
  - "what-is-an-iceberg-catalog"
keywords:
  - iceberg metadata sync
  - dremio sync metadata
  - table pointer sync
  - discover iceberg updates
  - external engine write sync
lastUpdated: 2026-05-29
---

## Dremio Iceberg Metadata Sync

**Dremio Iceberg Metadata Sync** is the catalog synchronization process that updates Dremio's internal metadata pointer to reference the latest snapshot file of an Apache Iceberg table. In open data lakehouse architectures, multiple query engines (such as Apache Spark, Apache Flink, and Trino) write to the same Iceberg tables.

When an external engine commits a transaction, it creates a new metadata JSON file (for example, `v3.metadata.json`) containing the new table state. Dremio must learn about this new file to plan queries against the updated data.

## Sync Mechanisms

Dremio synchronizes its catalog pointers using two primary methods depending on how the data source is configured:

### 1. Catalog-Managed Sync

When Dremio is connected to a shared REST catalog (such as Apache Polaris, AWS Glue, or Hive Metastore):

- **Atomic Pointer Exchange**: The external query engine registers its commit directly with the shared catalog.
- **Direct Read**: The next time Dremio queries the table, it retrieves the current metadata JSON path directly from the catalog.
- **Minimal Latency**: This method requires no manual synchronization or directory scanning.

### 2. File-Based Storage Sync (Object Store Directory Sync)

When Dremio accesses Iceberg tables directly from file paths (such as directories on S3 or ADLS without a catalog manager):

- **Pointer Discovery**: Dremio must periodically scan the metadata folder to find the metadata JSON file with the highest version number.
- **Automatic Refresh Interval**: Administrators configure how often Dremio checks the storage path for updates (for example, every 10 minutes or 1 hour).
- **Manual SQL Refresh**: Developers can force an immediate pointer scan using the SQL refresh syntax:

```sql
ALTER TABLE analytics.orders REFRESH METADATA;
```

## Why Sync Matters

A robust metadata synchronization process is vital for multi-engine environments:

- **Data Consistency**: Prevents Dremio queries from reading stale snapshots when external pipelines insert new records.
- **Workload Isolation**: Ensures that complex ingestion pipelines running on Spark can commit changes asynchronously while Dremio users query stable states.
- **Query Planning Performance**: Fast pointer updates allow Dremio to plan queries using cached metadata, ensuring rapid query start times.
