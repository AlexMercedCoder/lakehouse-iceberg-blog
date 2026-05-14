---
term: "Iceberg CDC (Change Data Capture)"
description: "CDC with Apache Iceberg enables real-time synchronization of operational database changes (inserts, updates, deletes) into Iceberg lakehouse tables, using tools like Debezium and Apache Flink to capture and apply row-level change events with exactly-once semantics."
category: "Patterns & Architecture"
relatedTerms:
  - "iceberg-upsert"
  - "flink-apache-iceberg"
  - "iceberg-streaming"
  - "iceberg-merge-on-read"
  - "iceberg-row-level-deletes"
keywords:
  - iceberg cdc
  - change data capture iceberg
  - debezium iceberg
  - cdc lakehouse iceberg
  - kafka cdc iceberg
lastUpdated: 2026-05-14
---

## Iceberg CDC (Change Data Capture)

**Change Data Capture (CDC) with Apache Iceberg** is the pattern of continuously capturing row-level changes (inserts, updates, deletes) from operational databases and applying them to Iceberg tables in near real-time. This produces an always-current analytical copy of operational data in the lakehouse — without the latency, cost, and operational complexity of traditional nightly batch ETL.

## What is CDC?

Change Data Capture is a database technique that tracks all changes to database tables and makes those changes available as an event stream. Rather than bulk-exporting the entire table on a schedule, CDC captures each individual INSERT, UPDATE, and DELETE as a discrete event with:

- **Operation type**: I (insert), U (update), D (delete)
- **Before image**: The row's values before the change (for updates and deletes)
- **After image**: The row's values after the change (for inserts and updates)
- **Timestamp and transaction ID**: For ordering and exactly-once processing

## The CDC + Iceberg Architecture

The standard architecture for CDC into Iceberg:

```
Operational DB (MySQL/PostgreSQL/Oracle)
  │ (binary log / WAL)
  ▼
Debezium (CDC connector)
  │ (Kafka events: per-row change records)
  ▼
Apache Kafka (CDC event stream)
  │ (Flink reads change events)
  ▼
Apache Flink (apply changes as upserts/deletes)
  │ (writes positional/equality delete files + new data files)
  ▼
Apache Iceberg Table (continuously updated lakehouse mirror)
  │ (queryable by any engine)
  ▼
Dremio / Spark / Trino (analytical queries)
```

## Debezium: The CDC Capture Layer

**Debezium** is the most widely used open-source CDC tool, providing connectors for MySQL, PostgreSQL, MongoDB, SQL Server, Oracle, and others. It reads the database's write-ahead log (WAL) or binary log and publishes change events to Kafka in a standardized format.

Example Debezium event for a MySQL UPDATE:

```json
{
  "op": "u",
  "before": { "order_id": 1001, "status": "pending", "total": 150.0 },
  "after": { "order_id": 1001, "status": "shipped", "total": 150.0 },
  "source": { "ts_ms": 1715700000000, "db": "orders_db", "table": "orders" }
}
```

## Flink CDC: Direct Database Reading

**Flink CDC** (Apache Flink CDC Connectors) provides an alternative that reads directly from database binary logs without needing a separate Kafka deployment:

```java
// Flink CDC: read directly from MySQL without Kafka
MySqlSource<String> mySqlSource = MySqlSource.<String>builder()
    .hostname("mysql-host")
    .port(3306)
    .databaseList("orders_db")
    .tableList("orders_db.orders")
    .username("cdc-user")
    .password("cdc-password")
    .deserializer(new JsonDebeziumDeserializationSchema())
    .build();

DataStream<String> cdcStream = env.fromSource(mySqlSource,
    WatermarkStrategy.noWatermarks(), "MySQL CDC Source");
```

## Applying CDC Events to Iceberg

CDC events are applied to Iceberg tables as upserts. For each event:

- **INSERT**: Add the new row to Iceberg.
- **UPDATE**: Delete the old row (via equality/positional delete file) + insert the new row.
- **DELETE**: Add an equality delete file for the deleted row.

```java
// Flink: apply CDC stream to Iceberg as upsert
FlinkSink.forRowData(cdcRowStream)
    .tableLoader(TableLoader.fromCatalog(catalogLoader, "db.orders"))
    .upsert(true)
    .equalityFieldColumns(Arrays.asList("order_id"))  // primary key
    .build();
```

## CDC Challenges and Solutions

### Initial Snapshot

Before streaming CDC begins, you need an initial full snapshot of the source table. Debezium handles this automatically: it takes a consistent snapshot of the source table first, then switches to streaming changes from the log.

### Schema Changes

If the source database schema changes (e.g., a new column is added), the CDC stream must handle it. Iceberg's schema evolution capabilities handle new columns gracefully — they simply appear as NULL in existing rows.

### Late-Arriving Events

Out-of-order events require careful handling. A DELETE event arriving before the corresponding INSERT could cause incorrect state. Flink's event-time processing and watermarks help manage ordering.

### Exactly-Once Delivery

Flink's checkpoint mechanism + Iceberg's atomic snapshot commits ensure exactly-once delivery. Even if the Flink job restarts, no events are applied twice.

## CDC Use Cases in the Lakehouse

| Use Case                       | Example                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| Operational database analytics | Real-time sales order analysis without impacting the OLTP DB |
| Compliance and audit           | Track all changes to customer records for regulatory review  |
| GDPR erasure propagation       | DELETE in source DB propagates to Iceberg via CDC            |
| Multi-region sync              | Replicate operational DB to lakehouse in another region      |
| ML feature freshness           | Keep ML feature tables current with production data changes  |

## Monitoring CDC Pipelines

Key metrics to monitor:

- **CDC lag**: Time between source DB change and Iceberg commit.
- **Snapshot commit frequency**: Aligned with Flink checkpoint interval.
- **Delete file accumulation**: Monitor via `table.inspect.files` — trigger compaction when delete file count exceeds threshold.
- **Kafka consumer lag**: For Kafka-based architectures, ensure Flink is keeping up with Kafka topic throughput.
