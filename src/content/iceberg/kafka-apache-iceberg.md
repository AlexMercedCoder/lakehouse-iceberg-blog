---
term: "Apache Kafka and Apache Iceberg"
description: "Apache Kafka and Apache Iceberg form the backbone of real-time lakehouse pipelines — Kafka provides the event streaming layer and Iceberg provides the governed, queryable storage layer, connected via Apache Flink or Kafka Connect Iceberg sink connectors."
category: "Engines & Integrations"
relatedTerms:
  - "iceberg-streaming"
  - "flink-apache-iceberg"
  - "iceberg-cdc"
  - "iceberg-small-file-problem"
  - "iceberg-incremental-read"
keywords:
  - kafka iceberg
  - apache kafka apache iceberg
  - kafka iceberg sink
  - kafka flink iceberg
  - streaming to iceberg kafka
lastUpdated: 2026-05-14
---

## Apache Kafka and Apache Iceberg

**Apache Kafka** is the dominant event streaming platform — a distributed, durable, high-throughput message bus used as the real-time data backbone in modern architectures. **Apache Iceberg** is the governed, queryable table layer for analytical data. Together, they form the foundational pipeline for real-time lakehouses: Kafka provides the continuous stream, Iceberg provides the governed analytical store.

The Kafka → Iceberg pipeline is one of the most common data architecture patterns in 2025:

```
Operational systems → Kafka topics → (Flink or Kafka Connect) → Iceberg tables → Analytics / AI
```

## Connection Patterns

### Pattern 1: Kafka → Apache Flink → Iceberg (Recommended)

The most powerful and widely adopted pattern. Apache Flink consumes from Kafka topics and writes to Iceberg with full streaming semantics:

```java
// Flink: consume from Kafka, write to Iceberg
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

// Kafka source
KafkaSource<String> source = KafkaSource.<String>builder()
    .setBootstrapServers("kafka:9092")
    .setTopics("orders")
    .setGroupId("iceberg-sink")
    .setValueOnlyDeserializer(new SimpleStringSchema())
    .build();

DataStream<String> kafkaStream = env.fromSource(
    source, WatermarkStrategy.noWatermarks(), "Kafka Source"
);

// Parse and transform
DataStream<RowData> ordersStream = kafkaStream.map(json -> parseOrder(json));

// Write to Iceberg
FlinkSink.forRowData(ordersStream)
    .tableLoader(TableLoader.fromCatalog(catalogLoader, TableIdentifier.of("analytics", "orders")))
    .distributionMode(DistributionMode.HASH)
    .writeParallelism(4)
    .build();

env.execute("Kafka to Iceberg Orders");
```

**Advantages of Flink**:

- Stateful stream processing (aggregations, joins, windowing) before writing.
- Exactly-once semantics (Flink + Iceberg two-phase commit integration).
- CDC handling: Debezium CDC events from Kafka → normalized upserts in Iceberg.
- Watermark-aware windowing for late data handling.

### Pattern 2: Kafka Connect Iceberg Sink

For simpler pipelines (no transformation logic needed), Kafka Connect provides a no-code/low-code approach to writing Kafka topic data directly to Iceberg:

**Tabular Iceberg Sink** (from the original Tabular team):

```json
{
  "name": "iceberg-sink-orders",
  "config": {
    "connector.class": "io.tabular.iceberg.connect.IcebergSinkConnector",
    "tasks.max": "4",
    "topics": "orders",
    "iceberg.catalog.type": "rest",
    "iceberg.catalog.uri": "https://my-polaris.example.com",
    "iceberg.catalog.credential": "client-id:client-secret",
    "iceberg.catalog.warehouse": "my-warehouse",
    "iceberg.tables": "analytics.orders",
    "iceberg.tables.auto-create-enabled": "true",
    "iceberg.control.topic": "iceberg-control",
    "iceberg.control.group-id": "iceberg-control-group"
  }
}
```

**Apache Kafka Connect (native / community connectors)**:

- **confluent/kafka-connect-iceberg**: Confluent's Iceberg sink connector.
- **MSR (Managed Schema Registry)**: Integrates with Confluent Schema Registry for schema evolution.

### Pattern 3: Spark Structured Streaming + Kafka

For teams already using Spark:

```python
# Spark Structured Streaming: Kafka → Iceberg
kafka_df = spark.readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "kafka:9092") \
    .option("subscribe", "orders") \
    .load()

parsed_df = kafka_df.select(
    from_json(col("value").cast("string"), order_schema).alias("data")
).select("data.*")

query = parsed_df.writeStream \
    .format("iceberg") \
    .outputMode("append") \
    .option("path", "s3://my-bucket/warehouse/analytics/orders") \
    .option("checkpointLocation", "s3://my-bucket/checkpoints/orders") \
    .trigger(processingTime="60 seconds") \
    .start()
```

## Exactly-Once Semantics

The Kafka → Iceberg pipeline can achieve **exactly-once delivery** — every Kafka message is written to Iceberg exactly once, with no duplicates and no missed messages:

**Flink + Iceberg**: The Iceberg Flink sink integrates with Flink's two-phase commit (2PC) protocol:

1. **Pre-commit**: Flink writes data files to Iceberg staging (not yet visible).
2. **Commit**: Flink coordinator signals Iceberg to commit the snapshot. If the job fails and restarts, Flink replays from the Kafka offset at the last successful checkpoint and aborts any uncommitted Iceberg snapshots.

**Kafka Connect + Iceberg**: The Tabular sink connector uses Iceberg's optimistic concurrency for exactly-once — idempotent commits ensure duplicate Kafka deliveries don't produce duplicate Iceberg rows.

## Managing the Small File Problem from Streaming

The Kafka → Iceberg pipeline naturally produces many small files (one or more files per micro-batch commit). Solutions:

1. **Increase commit interval**: 5-minute commits (vs. 60-second) reduce small file accumulation by 5x.
2. **Flink compaction operator**: Use Flink's in-stream compaction to merge files before committing.
3. **Post-stream compaction**: Run a separate scheduled compaction job (EMR, Dremio auto-optimization).

```python
# Flink: configure batched commits to reduce small files
FlinkSink.forRowData(ordersStream)
    .tableLoader(tableLoader)
    .toBranch("main")
    .set("write.target-file-size-bytes", "268435456")  # 256MB target
    .build();
```

## CDC Kafka → Iceberg (Debezium)

The most sophisticated pipeline: capture database changes via Debezium into Kafka, then upsert into Iceberg:

```
PostgreSQL → Debezium → Kafka (CDC events: INSERT/UPDATE/DELETE)
  → Flink (route by op type, key by PK) → Iceberg (MERGE INTO / EqualityDelete)
```

Flink handles the CDC event routing — `c` (create) → INSERT, `u` (update) → UPSERT, `d` (delete) → DELETE — maintaining a real-time replica of the operational database as an Iceberg table.
