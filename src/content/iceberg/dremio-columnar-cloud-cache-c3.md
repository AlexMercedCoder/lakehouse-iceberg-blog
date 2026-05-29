---
term: "Dremio Columnar Cloud Cache (C3)"
description: "Dremio Columnar Cloud Cache (C3) is a block-level storage caching mechanism on executor nodes that stores copies of data blocks on local NVMe SSDs, bypassing cloud object storage read latency."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-sabot-engine"
  - "dremio-reflections"
  - "iceberg-data-skipping"
keywords:
  - dremio c3 cache
  - columnar cloud cache
  - dremio storage cache
  - nvme caching query
  - cloud data cache dremio
lastUpdated: 2026-05-29
---

## Dremio Columnar Cloud Cache (C3)

**Dremio Columnar Cloud Cache (C3)** is a highly optimized, block-level caching architecture designed to accelerate query performance by utilizing high-speed local NVMe solid-state drives (SSDs) attached to Dremio executor nodes. C3 acts as a cache layer between Dremio's execution engine and cloud object storage services (such as Amazon S3, Azure Data Lake Storage, and Google Cloud Storage).

By keeping frequently accessed data blocks close to the execution compute resources, C3 bypasses the high network latency, storage request throttling, and throughput limitations associated with remote object stores.

## How C3 Operates

Unlike traditional caches that operate on whole files or tables, C3 manages data at a fine-grained block level:

1.  **Block-Based Access**: When a query requests data from a Parquet or Iceberg file, Dremio executor nodes read the data in specific byte range block requests rather than downloading the entire file.
2.  **Local Storage Copy**: During the initial read from cloud object storage, the executor node streams the requested blocks to its local NVMe drive while executing the query.
3.  **Subsequent Queries**: When subsequent queries require the same byte ranges of those files, the executor node reads the blocks directly from the local NVMe drive, achieving NVMe-speed performance.
4.  **Automatic Management**: C3 automatically coordinates storage space. If the local drive reaches capacity, C3 utilizes a Least Recently Used (LRU) eviction algorithm to clean older cache blocks to make room for new reads.

## Columnar Cache Alignment

C3 is purpose-built for columnar file formats like Apache Parquet and Apache Iceberg. Because columnar files store data by columns (in row groups and page structures), queries often retrieve only a small fraction of the columns in a table.

C3 caches only the specific bytes containing the queried columns. For example, if a query scans only the `amount` column in a table with 100 columns, C3 caches only the byte offsets containing the `amount` column's data blocks, saving local SSD space and maximizing cache efficiency.

## Benefits for Apache Iceberg Tables

Caching Iceberg tables with C3 provides three major operational benefits:

- **Request Cost Reduction**: Cloud providers charge per GET request. Reading blocks from local NVMe caches instead of S3 decreases the total number of cloud storage requests, leading to lower cloud infrastructure bills.
- **Protection Against Throttling**: High-concurrency query workloads can overwhelm cloud storage API limits, causing requests to be throttled. C3 absorbs these reads locally, insulating the query engine from throttling bottlenecks.
- **Vectorized Speed**: Because NVMe drives provide extremely high read throughput, C3 can feed data to the vectorized Sabot execution engine fast enough to saturate CPU capacity, maximizing the value of Dremio's columnar processing capabilities.
