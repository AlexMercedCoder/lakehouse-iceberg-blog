---
term: "Object Storage Prefix Hashing"
description: "A layout strategy that prepends random hash prefixes to object paths to distribute storage request workloads across different physical shards in cloud object stores."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "iceberg-spec-v3-object-store-storage-layout"
  - "decoupled-compute-and-storage"
keywords:
  - object storage hashing
  - prefix hashing
  - s3 partition throttling
  - storage entropy prefix
lastUpdated: 2026-05-29
---

## Object Storage Prefix Hashing

**Object Storage Prefix Hashing** is a physical storage organization strategy designed to prevent request rate throttling in cloud object storage (such as Amazon S3). S3 and other cloud storage systems partition data based on the prefix of the object path. If thousands of query engines write or read files using the same folder prefix (for example, `s3://my-bucket/year=2026/month=05/day=29/`), S3 directs all those requests to a single storage partition shard. This concentration causes hotspots and triggers request throttling.

### How Prefix Hashing Works

To prevent hotspots, prefix hashing generates a random hash string from table values and prepends it to the target file path:

```
Standard Partition Path:
s3://my-bucket/warehouse/db/orders/data/year=2026/file1.parquet

Prefix Hashed Path:
s3://my-bucket/warehouse/db/orders/data/a8f9c1b2-year=2026/file1.parquet
```

Because the file paths now start with random, high-entropy character strings (e.g. `a8f9c1b2`), the cloud storage provider distributes the files across different physical partition shards. This layout increases the aggregate request limit, allowing query engines to run thousands of concurrent read and write operations without throttling.

### Implementation in Apache Iceberg

In Apache Iceberg, prefix hashing is enabled via table properties. When `write.object-storage.enabled` is set to `true`, Iceberg switches from its standard hierarchical directory provider to the `ObjectStoreLocationProvider`. The writer engine automatically generates entropy hashes and prepends them to all data, delete, and metadata files written to S3.
