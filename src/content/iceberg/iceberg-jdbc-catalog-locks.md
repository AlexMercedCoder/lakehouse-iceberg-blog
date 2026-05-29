---
term: "Iceberg JDBC Catalog Locks"
description: "A database row-level locking mechanism used by SQL-backed Iceberg catalogs to coordinate concurrent commits and ensure transactional integrity."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "iceberg-lock-manager"
  - "iceberg-jdbc-catalog"
  - "iceberg-concurrent-writes"
keywords:
  - jdbc catalog lock
  - sql catalog locking
  - iceberg jdbc database locks
  - table locking jdbc
lastUpdated: 2026-05-29
---

## Iceberg JDBC Catalog Locks

**Iceberg JDBC Catalog Locks** are database-level lock implementations used when storing Apache Iceberg table pointers in relational databases (such as PostgreSQL, MySQL, or MariaDB). Because the catalog must ensure that pointer swaps are atomic, it needs a lock mechanism to manage concurrent writes. When using a JDBC catalog, Iceberg leverages the database engine's transaction features to secure these commits.

### Locking Implementation

The JDBC catalog uses a helper database table to manage active locks. By default, this is a table named `iceberg_locks`. The table schema tracks catalog names, namespaces, and table names:

```sql
/* Conceptual representation of the iceberg_locks database table */
CREATE TABLE iceberg_locks (
    catalog_name VARCHAR(255),
    table_namespace VARCHAR(255),
    table_name VARCHAR(255),
    lock_time TIMESTAMP,
    PRIMARY KEY (catalog_name, table_namespace, table_name)
);
```

### Commit Protocol

When an engine attempts to commit a new snapshot to a JDBC catalog table, it executes a locking transaction:

1.  **Acquire Lock**: The engine runs an `INSERT` statement into `iceberg_locks` for the target table. If the database insert succeeds, the engine holds the lock. If it fails (due to a primary key constraint violation), it means another engine is currently committing, and the client retries after a short delay.
2.  **Pointer Swap**: The engine updates the `iceberg_tables` catalog pointer table to point to the new metadata JSON path.
3.  **Release Lock**: The engine deletes the lock row from `iceberg_locks` within the same transaction commit block.

This mechanism ensures that only one write operation updates the table pointer at a time, preventing split-brain scenarios and guaranteeing strict serializability.
