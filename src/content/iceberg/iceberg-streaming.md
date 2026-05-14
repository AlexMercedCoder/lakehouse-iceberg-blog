---
term: "Iceberg Streaming Ingestion"
description: "Iceberg streaming ingestion is the pattern of continuously writing data from event streams, Kafka topics, and CDC feeds into Apache Iceberg tables with low latency and exactly-once guarantees, typically using Apache Flink as the streaming compute engine."
category: "Patterns & Architecture"
relatedTerms:
  - "flink-apache-iceberg"
  - "iceberg-cdc"
  - "iceberg-upsert"
  - "iceberg-merge-on-read"
  - "iceberg-compaction"
  - "iceberg-small-file-problem"
keywords:
  - iceberg streaming ingestion
  - real-time iceberg
  - kafka iceberg streaming
  - flink iceberg streaming
  - iceberg low latency
lastUpdated: 2026-05-14
---

## Iceberg Streaming Ingestion

**Streaming ingestion into Apache Iceberg** is the process of continuously writing data from event streams, Kafka topics, database CDC feeds, and IoT sensors directly into Iceberg tables with low latency and exactly-once delivery guarantees. This capability is a cornerstone of the modern data lakehouse, enabling "real-time analytics" on Iceberg data without a separate hot-path streaming store.

## The Lambda Architecture Problem

Before streaming lakehouse architectures, organizations typically ran two parallel data systems:

- **Speed layer (Lambda)**: Apache Kafka + Apache Flink/Spark Streaming → proprietary real-time database for low-latency queries.
- **Batch layer**: Daily/hourly ETL jobs → Data warehouse or Hive for historical analytics.

This "lambda architecture" required maintaining two codebases, reconciling inconsistencies between the two systems, and paying for two storage tiers.

Iceberg streaming ingestion collapses this to a single system:

```
Kafka → Flink (streaming) → Iceberg tables → Dremio/Spark/Trino (query)
```

Both real-time (5–60 second freshness) and historical analytics run against the same Iceberg tables. No lambda.

## Key Streaming Ingestion Patterns

### Pattern 1: Append-Only Event Stream

The simplest pattern: append events from Kafka to an Iceberg table continuously.

```java
// Flink: Kafka → Iceberg append
DataStream<Event> kafkaStream = env.fromSource(kafkaSource, ...);

FlinkSink.forRow(kafkaStream, schema)
    .tableLoader(TableLoader.fromCatalog(..., "db.events"))
    .upsert(false)  // append only
    .build();
```

Use case: IoT telemetry, clickstream, application logs.

### Pattern 2: CDC Upsert (Change Data Capture)

Apply database change events (INSERT, UPDATE, DELETE) from MySQL/PostgreSQL via Debezium to an Iceberg table that mirrors the source database.

```java
// Flink CDC: MySQL → Iceberg upsert
MySqlSource<String> cdcSource = MySqlSource.builder()
    .serverTimeZone("UTC")
    .tableList("orders_db.orders")
    .build();

FlinkSink.forRowData(cdcStream)
    .tableLoader(...)
    .upsert(true)
    .equalityFieldColumns(List.of("order_id"))  // primary key
    .build();
```

Use case: Lakehouse mirror of operational database for analytical queries.

### Pattern 3: Kafka → Iceberg with Kafka Connect

For simple cases, Kafka Connect's Iceberg Sink connector handles ingestion without custom Flink code:

```json
{
  "name": "iceberg-sink",
  "config": {
    "connector.class": "io.tabular.iceberg.connect.IcebergSinkConnector",
    "tasks.max": "4",
    "topics": "orders",
    "iceberg.catalog.type": "rest",
    "iceberg.catalog.uri": "https://catalog.example.com",
    "iceberg.tables": "db.orders"
  }
}
```

## Exactly-Once Delivery

Exactly-once delivery to Iceberg is achieved through the alignment of Flink's checkpoint mechanism with Iceberg's snapshot commits:

1. Flink buffers records and takes a checkpoint at configured intervals.
2. At checkpoint completion, Flink commits a new Iceberg snapshot with all buffered records.
3. If the job fails and restarts from checkpoint, Flink re-reads from Kafka (from the committed offset) and replays records not yet in a committed Iceberg snapshot.
4. The same records land in Iceberg exactly once — no duplicates, no data loss.

## Small File Management in Streaming

The fundamental challenge of streaming Iceberg ingestion is **small file accumulation**. Frequent commits (e.g., every 60 seconds) produce many small Parquet files. Each Flink task produces one file per commit. For a 20-task Flink job committing every minute, that's 20 × 60 × 24 = 28,800 small files per day per table.

**Solution**: Run continuous or scheduled compaction alongside the ingestion pipeline:

```python
# Airflow DAG: hourly compaction
from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator

with DAG("iceberg_compaction", schedule="@hourly"):
    compact = SparkSubmitOperator(
        task_id="compact_events",
        application="s3://scripts/compact.py",
        application_args=["db.events"]
    )
```

Or use Dremio's automatic background optimization to manage compaction without manual scheduling.

## Freshness Considerations

The achievable data freshness depends on commit interval:

| Commit Interval | Freshness   | Small Files Risk |
| --------------- | ----------- | ---------------- |
| 10 seconds      | ~10 seconds | Very high        |
| 1 minute        | ~1 minute   | High             |
| 5 minutes       | ~5 minutes  | Moderate         |
| 15 minutes      | ~15 minutes | Low              |
| 1 hour          | ~1 hour     | Very low         |

For most analytical workloads, 1–5 minute freshness balances latency against file management overhead. Sub-minute freshness is rarely necessary and significantly increases operational complexity.
