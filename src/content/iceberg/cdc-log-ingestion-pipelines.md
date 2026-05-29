---
term: "CDC Log Ingestion Pipelines"
description: "Data pipelines that capture database transaction logs and apply those insert, update, and delete events to lakehouse tables in real time."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "debezium-cdc-engines"
  - "iceberg-cdc"
keywords:
  - cdc log ingestion
  - transaction log cdc
  - real time ingestion
  - change data capture pipeline
lastUpdated: 2026-05-29
---

## CDC Log Ingestion Pipelines

**CDC Log Ingestion Pipelines** (Change Data Capture) are real-time ingestion streams that replicate changes from source transactional databases (such as PostgreSQL, MySQL, or Oracle) to a data lakehouse. Rather than running periodic SQL query pulls that scan the source database (which increases production query load), CDC pipelines read the database's internal transaction log directly.

### The Pipeline Architecture

A typical CDC ingestion pipeline consists of several components:

1.  **Source Transaction Log**: The database log (e.g., PostgreSQL WAL or MySQL binlog) that records all DML events.
2.  **CDC Capture Engine**: A service (like Debezium) that reads the log, parses the events, and formats them into standardized JSON or Avro messages.
3.  **Event Stream Message Bus**: A streaming broker (like Apache Kafka or Redpanda) that buffers the change messages.
4.  **Ingestion Writer Engine**: A streaming compute client (like Apache Flink or Spark Structured Streaming) that reads messages from the bus and writes them to the lakehouse:

```
  Source DB ──> Transaction Log ──> CDC Engine ──> Kafka ──> Ingest Engine ──> Iceberg
```

### Writing CDC Events to Iceberg

Ingestion engines write CDC events to Apache Iceberg tables using one of two strategies:

- **Upserts (Merge-on-Read)**: Flink or Spark writes incoming updates directly to position or equality delete files, updating the active pointers. This maintains low latency but increases query read amplification.
- **Append-Only Log**: The pipeline appends every DML event as a new row in a log table. A downstream compaction job then runs periodically to flatten the history into a consolidated target table.
