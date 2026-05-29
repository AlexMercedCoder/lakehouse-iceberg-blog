---
term: "Iceberg Spec V3 Object-Store Storage Layout"
description: "A storage layout configuration in Apache Iceberg that uses random prefix hashes to distribute data files evenly across cloud object storage partitions."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-file-path-spec"
  - "iceberg-spec-v3"
keywords:
  - object store storage layout
  - write object storage enabled
  - s3 prefix throttling
lastUpdated: 2026-05-29
---

## Iceberg Spec V3 Object-Store Storage Layout

The **Iceberg Spec V3 Object-Store Storage Layout** refers to the optimized location provider configuration designed to bypass folder partitioning bottlenecks on cloud object storage systems like Amazon S3 or Google Cloud Storage. By generating random hash prefixes for data file storage paths, this layout distributes write and read operations across multiple physical storage partitions, eliminating I/O throttling limits.

### The Prefix Bottleneck Problem

In cloud object storage, performance scales based on prefix directories. For instance, Amazon S3 supports up to 3500 PUT/POST/DELETE and 5500 GET/HEAD requests per second per prefix.

If a table is partitioned using traditional Hive-style hierarchical folders (e.g. `/data/year=2026/month=05/day=29/`), all concurrent write operations target a single folder prefix. This can trigger request throttling and degrade pipeline performance.

### How Hash Prefixing Works

To prevent throttling, administrators enable the object storage location provider by setting table properties:

```sql
/* Configure the table to utilize object storage layout with hash prefixes */
ALTER TABLE logs.web_events SET TBLPROPERTIES (
    'write.object-storage.enabled' = 'true',
    'write.object-storage.folder' = 's3://my-bucket/logs_data/'
);
```

When this property is enabled, Iceberg generates a deterministic, high-entropy hash for each data file and prepends it to the file path, placing files under randomized directories:

```
s3://my-bucket/logs_data/a1b2c3d4/data/year=2026/month=05/day=29/file1.parquet
s3://my-bucket/logs_data/e5f67a8b/data/year=2026/month=05/day=29/file2.parquet
```

Because each file is written to a distinct directory prefix, the storage system treats them as independent partitions. This allows the overall write throughput to scale horizontally with the number of concurrent executor tasks.
