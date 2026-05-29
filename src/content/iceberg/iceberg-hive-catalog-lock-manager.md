---
term: "Iceberg Hive Catalog Lock Manager"
description: "A coordination system that uses the Hive Metastore lock APIs to serialize concurrent table updates, ensuring commit safety in Hive-backed catalogs."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "iceberg-lock-manager"
  - "iceberg-hive-metastore"
  - "iceberg-concurrent-writes"
keywords:
  - hive catalog lock
  - hive metastore locks
  - hms lock manager
  - hive lock manager
lastUpdated: 2026-05-29
---

## Iceberg Hive Catalog Lock Manager

The **Iceberg Hive Catalog Lock Manager** is the mechanism used to coordinate concurrent updates when using a Hive Metastore (HMS) as the catalog. Because standard Hive Metastores do not have native atomic compare-and-swap features for tables that bypass the Hive engine, Iceberg uses Hive's internal transactional locking APIs to serialize writes and prevent engines from overwriting each other's commits.

### Locking Mechanism

When an Iceberg client commits to a Hive-backed table, it interacts with the Hive Metastore lock service:

1.  **Lock Request**: The client requests an exclusive write lock on the target table using the HMS client API (`lock` call).
2.  **HMS Lock DB**: The Hive Metastore records the lock request in its backend relational database (typically using tables like `HIVE_LOCKS`).
3.  **Polling**: The Iceberg client blocks and polls the metastore, waiting until the lock status changes to `ACQUIRED`.
4.  **Metadata Update**: Once the lock is acquired, the client retrieves the current table parameters, validates that the schema and snapshot have not changed, updates the table parameters to point to the new metadata JSON path, and commits.
5.  **Unlock**: The client sends an `unlock` command to HMS, releasing the table lock for subsequent writers.

### Configuration Properties

If the Hive Metastore is configured with ACID transactions enabled, Iceberg uses the metastore's database locks automatically. If HMS transactions are disabled, developers can configure alternative lock manager implementations (such as ZooKeeper lock managers) via Hadoop configuration properties:

```properties
/* Example Hadoop catalog properties for ZooKeeper lock coordination */
iceberg.catalog.hive.lock-manager = org.apache.iceberg.util.LockManagers$ZooKeeperLockManager
iceberg.catalog.hive.lock.zk.connect-string = localhost:2181
```

Using ZooKeeper offloads the lock coordination from the Hive Metastore database, resolving common bottleneck issues in high-concurrency environments.
