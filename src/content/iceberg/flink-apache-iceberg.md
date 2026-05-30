---
term: "Apache Flink and Apache Iceberg"
description: "Apache Flink is the leading stream processing engine for Apache Iceberg, enabling real-time data ingestion with exactly-once semantics, CDC processing, and Iceberg table writes that smoothly integrate with batch analytics workloads."
category: "Engines & Integrations"
relatedTerms:
  - "spark-apache-iceberg"
  - "iceberg-streaming"
  - "iceberg-merge-on-read"
  - "iceberg-upsert"
  - "iceberg-cdc"
  - "what-is-apache-iceberg"
keywords:
  - flink apache iceberg
  - flink iceberg streaming
  - flink iceberg sink
  - apache flink iceberg tables
  - real-time iceberg ingestion
lastUpdated: 2026-05-14
---

## Apache Flink and Apache Iceberg

**Apache Flink** is the premier stream processing engine for Apache Iceberg, enabling real-time data ingestion from event streams, Kafka topics, and CDC feeds directly into Iceberg tables with exactly-once delivery guarantees. Flink + Iceberg is the standard architecture for organizations that need both streaming ingestion and batch analytics on the same data: a core requirement of the modern data lakehouse.

## Why Flink + Iceberg is a Natural Pair

The lakehouse promise is to eliminate the lambda architecture (separate batch and streaming systems). Flink accomplishes this for the write side:

- **Kafka → Flink → Iceberg**: Real-time event streams land in Iceberg tables immediately, making them queryable by batch analytics engines (Dremio, Spark, Trino) with low latency.
- **CDC → Flink → Iceberg**: Database change events from MySQL, PostgreSQL (via Debezium) flow through Flink and are applied to Iceberg tables as row-level inserts, updates, and deletes.
- **Exactly-once semantics**: Flink's checkpoint mechanism aligns with Iceberg snapshot commits, ensuring no data is duplicated or lost during pipeline restarts.

## Setup

Add the Flink-Iceberg connector to your project:

```xml
<dependency>
  <groupId>org.apache.iceberg</groupId>
  <artifactId>iceberg-flink-runtime-1.19</artifactId>
  <version>1.5.0</version>
</dependency>
```

## Streaming Write to Iceberg

### DataStream API

```java
DataStream<RowData> stream = ...; // your event stream

FlinkSink.forRowData(stream)
    .tableLoader(TableLoader.fromCatalog(
        CatalogLoader.rest("my_catalog", properties, "db.orders")
    ))
    .upsert(false)  // append mode; set true for upsert
    .equalityFieldColumns(Arrays.asList("order_id"))  // for upsert
    .build();
```

### Flink SQL

```sql
-- Register Iceberg catalog in Flink SQL
CREATE CATALOG my_catalog WITH (
    'type' = 'iceberg',
    'catalog-type' = 'rest',
    'uri' = 'https://my-catalog.example.com',
    'credential' = 'client-id:client-secret'
);

USE CATALOG my_catalog;

-- Create Iceberg table in Flink SQL
CREATE TABLE db.events (
    event_id    BIGINT,
    event_time  TIMESTAMP(3),
    user_id     BIGINT,
    event_type  STRING,
    WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
) PARTITIONED BY (day(event_time));

-- Streaming INSERT from Kafka source
INSERT INTO db.events
SELECT event_id, event_time, user_id, event_type
FROM kafka_source;
```

## Exactly-Once Semantics

Flink's checkpoint mechanism ensures exactly-once delivery to Iceberg:

1. Flink takes a checkpoint at configured intervals (e.g., every 60 seconds).
2. At each checkpoint, the Flink-Iceberg sink commits a new Iceberg snapshot containing all data written since the last checkpoint.
3. If the Flink job fails and restarts from a checkpoint, it continues writing from the last committed snapshot.
4. Data written after the last checkpoint but before the failure is replayed from Kafka (not duplicated, because the snapshot wasn't committed).

## CDC Upserts: The MERGE Pattern

The most complex and important Flink + Iceberg pattern is CDC upsert processing:

```java
// Flink CDC: process Debezium events from MySQL
DataStream<RowData> cdcStream = env.fromSource(
    MySqlSource.builder()
        .serverTimeZone("UTC")
        .tableList("orders_db.orders")
        .build(),
    WatermarkStrategy.noWatermarks(),
    "mysql-orders-source"
);

// Write as upsert to Iceberg (uses equality deletes for MoR)
FlinkSink.forRowData(cdcStream)
    .tableLoader(tableLoader)
    .upsert(true)
    .equalityFieldColumns(Arrays.asList("order_id"))  // PK for upsert matching
    .build();
```

This pipeline:

1. Reads INSERT, UPDATE, DELETE events from MySQL CDC via Debezium.
2. Applies them to the Iceberg table as an upsert stream.
3. UPDATEs become delete (equality delete file for old version) + insert (new row).
4. DELETEs become equality delete files.

## Flink Iceberg Snapshot Interval

The snapshot commit frequency directly controls:

- **Query freshness**: How current the data is for batch analytics engines reading the table.
- **Small file accumulation**: More frequent commits = more small files = more compaction needed.

```java
FlinkSink.forRowData(stream)
    .tableLoader(tableLoader)
    .set(FlinkWriteOptions.SNAPSHOT_PROPERTY_PREFIX + "commit.interval.ms", "60000") // 60s
    .build();
```

## Combining Flink Writes with Spark/Dremio Reads

The canonical lakehouse streaming architecture:

```
Kafka → Flink (write, exactly-once) → Iceberg tables → Dremio/Spark/Trino (read)
```

Flink handles the streaming ingestion with low-latency commits. Dremio or Spark handle the analytical query workload against the same Iceberg tables. No data movement, no ETL between systems: the lakehouse architecture at its finest.
