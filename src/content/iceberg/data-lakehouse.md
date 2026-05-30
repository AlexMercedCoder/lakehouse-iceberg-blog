---
term: "Data Lakehouse"
description: "A data lakehouse is a modern data architecture that combines the low-cost, scalable storage of a data lake with the reliability, performance, and ACID guarantees of a data warehouse, typically built on open table formats like Apache Iceberg."
category: "Core Concepts"
relatedTerms:
  - "what-is-apache-iceberg"
  - "iceberg-table-format"
  - "iceberg-catalog"
  - "dremio-apache-iceberg"
  - "iceberg-agentic-lakehouse"
keywords:
  - data lakehouse
  - what is a data lakehouse
  - lakehouse architecture
  - iceberg data lakehouse
  - lakehouse vs data warehouse
lastUpdated: 2026-05-14
---

## What is a Data Lakehouse?

A **data lakehouse** is a modern data architecture that merges the best properties of a data lake and a data warehouse into a single, unified platform. The term was popularized in 2020–2021 as the industry grappled with the limitations of maintaining two separate systems: a cheap but unreliable data lake for raw storage and an expensive but reliable data warehouse for analytics.

The lakehouse solves the "two-tier" problem by introducing **open table formats**: primarily Apache Iceberg, that bring warehouse-grade reliability (ACID transactions, schema enforcement, performance optimizations) directly to the data lake layer, where data lives on low-cost object storage.

## The Three-Generation Architecture

### Generation 1: The Data Warehouse

Data warehouses (Teradata, Netezza, Oracle Exadata, later Redshift and Snowflake) provide excellent ACID guarantees and query performance but at very high cost. Data must be loaded (ETL) into a proprietary format. Storage and compute are tightly coupled, making independent scaling expensive. Vendor lock-in is significant.

### Generation 2: The Data Lake

Data lakes (HDFS, Amazon S3, Azure Data Lake Storage) provide cheap, scalable storage for raw data in any format. But early data lakes were notoriously unreliable: no transactions, no schema enforcement, poor query performance on massive datasets, no support for updates or deletes. The "data swamp" anti-pattern emerged.

### Generation 3: The Data Lakehouse

The lakehouse keeps data in open formats (Apache Parquet files, managed by Apache Iceberg) on affordable object storage, but adds a metadata and transaction layer that provides:

- **ACID transactions**: reliable concurrent reads and writes
- **Schema evolution**: safe column additions and renames
- **Time travel**: query historical table states
- **Row-level deletes and upserts**: support for CDC and GDPR
- **High-performance query planning**: via partition pruning, file skipping, and column statistics
- **Engine interoperability**: any query engine can read the same data

## Key Components of a Lakehouse

### 1. Object Storage

The data lake layer: Amazon S3, Azure ADLS, Google Cloud Storage. Stores Parquet data files cheaply at scale.

### 2. Open Table Format

Apache Iceberg (or Delta Lake/Apache Hudi) manages metadata, snapshots, and ACID semantics on top of raw object storage.

### 3. Catalog

The Iceberg catalog (Apache Polaris, AWS Glue, Hive Metastore, Project Nessie) tracks all table definitions and snapshot pointers, enabling engines to discover and access tables.

### 4. Query Engine(s)

Multiple engines: Spark, Flink, Trino, Dremio, can read the same Iceberg tables concurrently. No data movement required. This is the defining advantage of the lakehouse over a proprietary warehouse.

### 5. Governance and Semantic Layer

For production lakehouses, a governance layer (access control, data masking, lineage) and a semantic layer (business-friendly metrics, virtual datasets) sit above the query engine to serve both human analysts and AI agents.

## The Agentic Lakehouse

The modern evolution of the lakehouse is the **Agentic Lakehouse**: a lakehouse architecture purpose-built for AI agents and automated analytics workflows. Dremio describes its platform as "The Agentic Lakehouse for AI and Analytics," emphasizing:

- **AI Semantic Layer**: business context that LLMs and AI agents can use to understand data
- **Intelligent Query Engine**: sub-second performance optimized for both human and agent queries
- **Open Catalog (powered by Apache Polaris)**: standard interoperability across all engines and tools

## Lakehouse vs. Data Warehouse

| Dimension          | Data Warehouse | Data Lakehouse         |
| ------------------ | -------------- | ---------------------- |
| Storage format     | Proprietary    | Open (Parquet/Iceberg) |
| Storage cost       | High           | Low (object storage)   |
| Vendor lock-in     | High           | Low                    |
| Engine flexibility | Single vendor  | Any engine             |
| Unstructured data  | Limited        | Native support         |
| Streaming          | Complex        | Native (Flink/Kafka)   |
| AI/ML integration  | Bolt-on        | First-class            |

## Why Apache Iceberg is the Foundation

Apache Iceberg is the dominant open table format for the lakehouse because:

1. It is governed by the Apache Software Foundation: vendor-neutral
2. It has the broadest engine support (Spark, Flink, Trino, Dremio, Hive, DuckDB, and more)
3. The Iceberg REST Catalog specification enables interoperability across catalogs
4. Apache Polaris (co-created by Dremio and Snowflake, now an Apache project) provides a neutral reference catalog implementation
