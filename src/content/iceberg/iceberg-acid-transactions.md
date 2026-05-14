---
term: "ACID Transactions in Apache Iceberg"
description: "Apache Iceberg delivers full ACID transaction guarantees on object storage through optimistic concurrency control and atomic metadata commits, enabling reliable concurrent reads and writes without a centralized lock manager."
category: "Core Concepts"
relatedTerms:
  - "what-is-apache-iceberg"
  - "iceberg-snapshot"
  - "iceberg-time-travel"
  - "iceberg-merge-on-read"
  - "iceberg-copy-on-write"
  - "iceberg-row-level-deletes"
keywords:
  - iceberg acid transactions
  - apache iceberg atomicity
  - iceberg concurrency control
  - acid on object storage
  - iceberg transactional
lastUpdated: 2026-05-14
---

## ACID Transactions in Apache Iceberg

One of Apache Iceberg's most significant contributions to the data lakehouse ecosystem is delivering true **ACID transaction guarantees** on top of object storage — a class of storage that was not designed for transactional workloads. Understanding how Iceberg achieves ACID semantics is essential for anyone designing reliable data pipelines.

ACID stands for:

- **Atomicity** — An operation either fully succeeds or has no effect. No partial writes.
- **Consistency** — Every transaction brings the table from one valid state to another valid state.
- **Isolation** — Concurrent transactions do not interfere with each other.
- **Durability** — Once committed, changes survive failures.

## The Core Mechanism: Optimistic Concurrency Control

Object storage does not support row-level locking. Iceberg sidesteps this limitation entirely by managing transactions through **metadata commits** rather than locks.

### How an Atomic Write Works

1. A writer creates new data files in object storage. These files are invisible to readers until committed.
2. The writer creates a new **snapshot** that references the new data files (via manifest files).
3. The writer creates a new **table metadata file** pointing to the new snapshot.
4. The writer atomically swaps the catalog's metadata pointer from the old metadata file to the new one.

Step 4 is the critical atomic operation. Object storage systems support conditional puts (S3: `If-None-Match`, GCS: `x-goog-if-generation-match`) that allow only one writer to succeed when two attempt to update the same pointer simultaneously. If another writer already committed, the losing writer's attempt fails cleanly and it can retry.

### Read Isolation

Readers always see a consistent snapshot. When a query starts, it reads the current metadata pointer and uses that **frozen snapshot** for the entire query duration. Even if new commits land mid-query, the reader continues working with the same snapshot — providing **snapshot isolation** semantics.

This is why Iceberg time travel is trivial: every snapshot is permanently accessible until explicitly expired.

## Atomicity: No Partial Writes

Because data files are written before the metadata commit, readers never see partially written tables. If a writer crashes after writing data files but before committing metadata, the new files simply become **orphan files** — invisible to any reader, and cleaned up by the orphan file cleanup process. The table remains in its last valid state.

## Concurrent Writers

Multiple engines can write to the same Iceberg table concurrently. Common scenarios:

- **Non-conflicting appends**: Two Spark jobs appending to different partitions. Both succeed without interference.
- **Conflicting updates**: Two jobs updating the same rows. One will fail its commit and retry with conflict resolution logic.

Iceberg provides configurable retry logic and conflict detection at the partition level. If two writers touch different partitions, they can both succeed. If they touch overlapping data, the conflict is detected and resolved according to the operation type.

## ACID for Streaming Workloads

Apache Flink + Iceberg supports exactly-once semantics for streaming writes. Flink checkpoints align with Iceberg snapshot commits, ensuring that even in the event of a Flink job restart, no data is duplicated and no data is lost.

## Comparing Iceberg ACID to Database ACID

Iceberg does not provide **row-level locking** or **serializable isolation** in the full RDBMS sense — it provides **snapshot isolation**, which is the correct semantics for analytical workloads. In practice, this means:

| ACID Property | Traditional RDBMS               | Apache Iceberg                       |
| ------------- | ------------------------------- | ------------------------------------ |
| Atomicity     | Row/transaction level           | File + metadata commit level         |
| Consistency   | Schema + constraint enforcement | Schema enforcement                   |
| Isolation     | Serializable / MVCC             | Snapshot isolation                   |
| Durability    | WAL + fsync                     | Object storage (11 nines durability) |

For OLAP analytics, snapshot isolation is the appropriate guarantee. Iceberg's approach is specifically optimized for the write patterns of data engineering pipelines (bulk appends, partition overwrites, incremental updates) rather than OLTP point transactions.

## ACID and Compliance

Iceberg's ACID guarantees make it the right foundation for compliance-sensitive workloads:

- **GDPR right-to-erasure**: Row-level deletes (via equality delete files) allow precise removal of individual user records without full table rewrites.
- **Audit trails**: The immutable snapshot history provides a complete audit log of all table changes.
- **Reproducibility**: The ability to query any historical snapshot ensures that analytical results are reproducible for regulatory review.
