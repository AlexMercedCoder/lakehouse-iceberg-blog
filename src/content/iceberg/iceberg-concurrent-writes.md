---
term: "Iceberg Concurrent Write Handling"
description: "Apache Iceberg uses optimistic concurrency control with atomic catalog commits to safely handle multiple simultaneous writers, detecting and resolving conflicts based on the operations performed so that compatible concurrent writes both succeed while truly conflicting writes fail cleanly."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-acid-transactions"
  - "iceberg-snapshot"
  - "iceberg-catalog"
  - "iceberg-sequence-number"
  - "iceberg-rest-catalog"
keywords:
  - iceberg concurrent writes
  - iceberg optimistic concurrency
  - iceberg write conflicts
  - iceberg multi-writer
  - iceberg atomic commit
lastUpdated: 2026-05-14
---

## Iceberg Concurrent Write Handling

Apache Iceberg uses **optimistic concurrency control** to handle multiple simultaneous writers. Rather than locking tables during writes (pessimistic concurrency), Iceberg allows concurrent writes to proceed in parallel, then detects conflicts at commit time and either merges compatible operations or fails conflicting ones cleanly.

This design enables high-throughput parallel ingestion while maintaining ACID correctness.

## The Optimistic Concurrency Protocol

Every Iceberg write follows this protocol:

1. **Read**: The writer reads the current table metadata (current snapshot, manifests, file locations).
2. **Plan**: Based on the current metadata, the writer plans its operation (which files to add, which to delete, which manifests to create).
3. **Execute**: The writer writes new data files to object storage and creates new manifest files.
4. **Commit attempt**: The writer sends a commit request to the catalog, specifying:
   - The base snapshot it read from (the "expected" current snapshot).
   - The new snapshot it wants to become current.
5. **Catalog check**: The catalog atomically checks: "Is the current snapshot still the one this writer based its plan on?"
   - **Yes (no conflict)**: Commit succeeds. The new snapshot becomes current.
   - **No (someone else committed first)**: Conflict detected. The writer must retry.

## Conflict Detection and Retry

When a conflict is detected, the Iceberg client library evaluates whether the conflict is **resolvable**:

### Resolvable Conflicts (Retry Succeeds)

Two appends to different partitions → Both can succeed. The retry re-reads the latest snapshot, re-plans the commit to include the other writer's changes, and retries.

```
Writer A: APPEND to partition 2026-05-14 → reads snapshot 100
Writer B: APPEND to partition 2026-05-15 → reads snapshot 100
B commits first → snapshot 101
A retries: reads snapshot 101, sees B's partition is different from A's
A re-commits cleanly → snapshot 102 (both A and B's data present)
```

### Irresolvable Conflicts (Fail)

Two writers both trying to overwrite the same partition → True conflict. One succeeds, one fails with a `CommitFailedException`.

```
Writer A: OVERWRITE partition 2026-05-14 → reads snapshot 100
Writer B: OVERWRITE partition 2026-05-14 → reads snapshot 100
B commits first → snapshot 101
A retries: reads snapshot 101, sees B already rewrote the same partition
A fails: CommitFailedException (cannot merge conflicting overwrites)
```

## Retry Configuration

```python
# PyIceberg: configure retry behavior
catalog = load_catalog("my_catalog", **{
    "type": "rest",
    "uri": "https://catalog.example.com",
    "commit.retry.num-retries": "5",      # retry up to 5 times
    "commit.retry.min-wait-ms": "100",    # wait 100ms minimum between retries
    "commit.retry.max-wait-ms": "5000",   # wait up to 5s between retries
    "commit.retry.total-timeout-ms": "60000",  # give up after 60s total
})
```

```sql
-- Spark: configure commit retries via table properties
ALTER TABLE db.orders SET TBLPROPERTIES (
    'commit.retry.num-retries' = '5',
    'commit.retry.min-wait-ms' = '100',
    'commit.retry.max-wait-ms' = '5000'
);
```

## Catalog Atomicity: The Commit Guarantee

The atomic catalog commit is the foundation of Iceberg's concurrency model. Different catalog backends implement atomicity differently:

| Catalog               | Atomicity Mechanism                              |
| --------------------- | ------------------------------------------------ |
| Apache Polaris (REST) | RDBMS transaction (optimistic locking)           |
| Project Nessie        | Multi-version concurrency control (MVCC)         |
| AWS Glue              | Conditional updates (optimistic locking)         |
| Hive Metastore        | Table-level locks (pessimistic — can bottleneck) |
| JDBC Catalog          | Database transaction (varies by DB)              |

The REST Catalog (Polaris, Nessie) and cloud-managed catalogs (Glue) provide the best concurrency characteristics. Hive Metastore's table-level locking is a known bottleneck for high-concurrency write workloads.

## Conflict Types and Their Behavior

| Write Operation         | Concurrent Operation    | Result                                        |
| ----------------------- | ----------------------- | --------------------------------------------- |
| APPEND (partition A)    | APPEND (partition A)    | Both succeed (retried)                        |
| APPEND (partition A)    | APPEND (partition B)    | Both succeed                                  |
| OVERWRITE (partition A) | APPEND (partition A)    | Fail one                                      |
| OVERWRITE (partition A) | OVERWRITE (partition B) | Both succeed                                  |
| DELETE (partition A)    | APPEND (partition A)    | Fail one                                      |
| SCHEMA CHANGE           | APPEND                  | Both succeed (append retries with new schema) |

## Isolation Level

Iceberg provides **snapshot isolation** (serializable for single-table operations):

- Readers always see a consistent snapshot — never a partially-written state.
- Writers see the state as of their read time — write skew is possible in theory but controlled by the conflict detection logic.
- The catalog's atomic compare-and-swap is the serialization point.

For workflows requiring strict serializability across multiple table operations, Nessie catalog-level transactions provide cross-table atomic commits.
