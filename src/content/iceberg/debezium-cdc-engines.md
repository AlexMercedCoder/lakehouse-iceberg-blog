---
term: "Debezium CDC Engines"
description: "The standard open-source framework built on Apache Kafka Connect that monitors database transaction logs and translates change events into streaming messages."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "cdc-log-ingestion-pipelines"
  - "iceberg-cdc"
keywords:
  - debezium
  - debezium engine
  - change data capture debezium
  - kafka connect debezium
lastUpdated: 2026-05-29
---

## Debezium CDC Engines

**Debezium CDC Engines** refer to the connector instances within the Debezium framework, an open-source, distributed platform for change data capture. Built primarily on top of Apache Kafka Connect, Debezium monitors source databases, captures inserts, updates, and deletes, and streams those changes as event messages to Kafka topics. This framework is a primary data source for real-time lakehouse ingestion pipelines.

### How Debezium Connectors Work

Debezium deploys specialized connectors for different database systems (such as PostgreSQL, MySQL, SQL Server, MongoDB, and Oracle).

- **Non-Invasive Log Reading**: Rather than running regular `SELECT` queries that compete with application workloads, Debezium reads the database's commit log directly.
- **Event Formatting**: Every transaction event is converted into a structured message. Each message contains a `before` block showing the old values, an `after` block showing the new values, and a `source` block containing database transaction metadata (such as the LSN or timestamp).
- **Schema Schema Tracking**: Debezium monitors DDL changes (such as adding a column) and publishes schema updates to a schema registry, helping downstream lakehouse tables evolve their schemas automatically.

### Ingestion Integration

Downstream stream engines (like Flink, Spark, or PyIceberg-based streaming services) ingest Debezium events from Kafka. Many ingestion libraries include native Debezium format parsers, which automatically translate Debezium's `before`/`after` schema messages into Iceberg INSERT, UPDATE, and DELETE operations, simplifying the implementation of real-time transactional data lakes.
