---
term: "Iceberg Lock Manager"
description: "A catalog helper interface in Apache Iceberg used to manage transactional locks and secure pointer updates on catalogs that lack native atomic swap operations."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-optimistic-concurrency-control-occ"
  - "iceberg-catalog"
keywords:
  - iceberg lock manager
  - lock manager interface
  - catalog locking commits
lastUpdated: 2026-05-29
---

## Iceberg Lock Manager

The **Iceberg Lock Manager** is an interface in the Apache Iceberg catalog API designed to coordinate transactional locks during table commits. While modern catalogs (like REST catalogs or AWS Glue) support native atomic pointer swap operations, other catalogs (such as Hive Metastore or SQL databases) require a locking mechanism to prevent race conditions and split-brain metadata updates when concurrent writers attempt to commit.

### Role in Pointer Swapping

During a commit operation, Iceberg must update the pointer to the latest `.metadata.json` file. If the underlying catalog storage cannot guarantee an atomic compare-and-swap (CAS) operation, the Lock Manager is called:

1.  **Acquire Lock**: Before executing the commit, the writer requests a lock for the specific table namespace.
2.  **Verify and Swap**: Once the lock is acquired, the writer checks if the metadata version matches the expected base version. If valid, it writes the new pointer.
3.  **Release Lock**: The writer releases the table lock, allowing other staged commits to proceed.

### Configuring Lock Providers

Iceberg allows administrators to specify different lock manager implementations depending on their infrastructure. This is configured using catalog properties in Spark or Flink:

```sql
/* Configure a Spark catalog using DynamoDB for commit coordination locking */
SET spark.sql.catalog.my_catalog.lock-impl = 'org.apache.iceberg.aws.dynamodb.DynamoDbLockManager';
SET spark.sql.catalog.my_catalog.lock.table = 'iceberg_lock_table';
```

Common implementations include:

- **DynamoDB Lock Manager**: Uses an AWS DynamoDB table to manage locks, commonly used for tables stored on S3 when using Hive Metastore or direct Hadoop catalogs.
- **JDBC Lock Manager**: Uses database row locks inside a relational database catalog to coordinate commits.
- **Hive Lock Manager**: Leverages the Hive Metastore lock pool to manage concurrent table changes.
