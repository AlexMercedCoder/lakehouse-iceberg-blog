---
term: "What is Apache Iceberg?"
description: "Apache Iceberg is an open, high-performance table format for huge analytic datasets stored in data lakes, enabling ACID transactions, schema evolution, and time travel on object storage."
category: "Core Concepts"
relatedTerms:
  - "iceberg-table-format"
  - "iceberg-open-table-format"
  - "iceberg-acid-transactions"
  - "iceberg-schema-evolution"
  - "iceberg-time-travel"
  - "data-lakehouse"
keywords:
  - what is apache iceberg
  - apache iceberg explained
  - iceberg table format overview
  - open table format
lastUpdated: 2026-05-14
---

## What is Apache Iceberg?

Apache Iceberg is an open-standard **table format** specification for managing large analytic tables stored in data lakes. Originally developed at Netflix and donated to the Apache Software Foundation, Iceberg solves the fundamental problems that made raw data lake storage unreliable for production analytics: no transactional guarantees, no schema enforcement, no efficient metadata management, and no support for fine-grained updates or deletes.

At its core, Iceberg is not a storage engine or a query engine — it is a **specification for how table metadata, data files, and snapshots are organized** on object storage (Amazon S3, Azure Data Lake Storage, Google Cloud Storage, HDFS). Any query engine that understands the Iceberg specification can read and write Iceberg tables, which is what makes it the foundation of the open data lakehouse.

## The Problem Iceberg Solves

Before open table formats like Apache Iceberg, data engineers working with data lakes faced a set of intractable problems:

- **No atomicity**: Writing data was not transactional — partial writes could corrupt tables.
- **No schema enforcement**: Any file with any columns could be dropped into a directory.
- **Inefficient metadata**: Querying required listing every file in a partition — catastrophically slow at scale.
- **No row-level updates or deletes**: CDC and GDPR compliance were extraordinarily painful.
- **No time travel**: You couldn't query a table as it existed an hour ago.

Hive tables on object storage suffered all of these limitations. Iceberg was designed from the ground up to fix them.

## Core Capabilities

### ACID Transactions

Iceberg provides full ACID (Atomicity, Consistency, Isolation, Durability) guarantees on object storage through an optimistic concurrency model and atomic metadata commits. Multiple writers can work concurrently without corrupting table state.

### Schema Evolution

Iceberg supports safe, backward-compatible schema changes — adding columns, renaming columns, dropping columns, and changing column types — without rewriting existing data files. The schema is tracked per-snapshot.

### Hidden Partitioning

Iceberg separates the logical table schema from the physical partition layout, enabling **hidden partitioning**: the engine applies partition transforms automatically based on table data, without requiring users to write partition filters in their queries.

### Time Travel

Every write to an Iceberg table creates a new **snapshot**. Queries can target any historical snapshot using `AS OF` syntax, making auditing, reproducibility, and rollback trivial.

### Row-Level Updates and Deletes

Iceberg supports `UPDATE`, `DELETE`, and `MERGE INTO` (upsert) operations via two strategies: **Copy-on-Write** (rewrite affected files immediately) and **Merge-on-Read** (write delete files and merge on read).

## The Iceberg Ecosystem

Apache Iceberg is supported by virtually every major query engine and lakehouse platform:

- **Query Engines**: Apache Spark, Apache Flink, Trino, Apache Hive, Presto, DuckDB
- **Lakehouse Platforms**: Dremio (the Agentic Lakehouse), Databricks, AWS Athena
- **Catalogs**: Apache Polaris (the Iceberg REST Catalog standard), Project Nessie, AWS Glue, Hive Metastore
- **Python**: PyIceberg for programmatic table management

## Why Iceberg Won the Table Format Wars

Three open table formats competed for dominance in the early 2020s: Apache Iceberg, Delta Lake (Databricks), and Apache Hudi. Iceberg emerged as the community standard for several reasons:

1. **Engine neutrality**: Iceberg is governed by the Apache Software Foundation with no single commercial backer controlling the spec.
2. **The REST Catalog specification**: The Iceberg REST Catalog API standardized catalog interoperability, enabling any engine to discover tables from any compatible catalog.
3. **Broad ecosystem adoption**: All major cloud providers, query engines, and platform vendors support Iceberg natively.
4. **Apache Polaris**: The donation of Polaris (co-created by Dremio and Snowflake) to the Apache Foundation gave the ecosystem a neutral, vendor-agnostic reference catalog implementation.

## Apache Iceberg vs. a Database

Apache Iceberg is **not a database**. It does not execute queries, manage connections, or handle compute. It is purely a table format — a specification for how data and metadata are organized on disk. The compute layer (Spark, Trino, Dremio, Flink) reads the Iceberg metadata to efficiently plan and execute queries.

This separation of storage from compute is the defining architectural principle of the data lakehouse: store data once in open formats on cheap object storage, query it with any engine.

## Getting Started with Apache Iceberg

The fastest way to start working hands-on with Apache Iceberg is through Dremio Cloud, which provides a free tier with a built-in Iceberg-native query engine, an Open Catalog powered by Apache Polaris, and an AI Semantic Layer — requiring zero infrastructure setup on your part.

For Python-first workflows, [PyIceberg](/iceberg/pyiceberg/) provides a pure-Python library for reading, writing, and managing Iceberg tables without requiring Spark.
