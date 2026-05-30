---
term: "VeloDB"
description: "A commercial data warehouse built on Apache Doris that offers native integration with Apache Iceberg tables for fast query acceleration and data warehousing features."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "doris-apache-iceberg"
  - "iceberg-table-format"
keywords:
  - velodb
  - velodb database
  - doris velodb
  - lakehouse query acceleration
lastUpdated: 2026-05-29
---

## VeloDB

**VeloDB** is a commercial real-time data warehouse built on Apache Doris. Designed for high-concurrency and low-latency analytics, VeloDB provides native integration with Apache Iceberg tables. It allows organizations to query open table format files directly on cloud object storage while leveraging data warehouse features like query caching, indexing, and materialized views.

### Iceberg Integration Scope

Because VeloDB is fully compatible with the Apache Doris ecosystem, it inherits and extends Doris's lakehouse capabilities:

- **Native Read and Write Support**: VeloDB reads and writes Iceberg tables conforming to V1, V2, and V3 formats. It supports advanced Iceberg features including schema evolution, partition evolution, time travel, and transactional commits.
- **Query Acceleration**: To minimize query latency on remote object storage, VeloDB utilizes multi-level caching (local NVMe SSD block caching) and asynchronous materialized views. These views precompute complex aggregations on Iceberg tables and serve them with sub-second response times.
- **Catalog Federation**: VeloDB integrates with various catalog providers, including AWS Glue, Hive Metastore, and standard REST catalogs (such as Apache Polaris or Unity Catalog). This allows it to run federated queries across Iceberg, Delta Lake, and internal database tables.
- **ELT Write-Back**: Data processed inside VeloDB can be written directly back to S3 or Google Cloud Storage as Iceberg tables using standard INSERT INTO SQL syntax, enabling pipeline operations.
