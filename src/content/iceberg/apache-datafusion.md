---
term: "Apache DataFusion"
description: "A highly extensible Rust-native SQL query engine that supports native querying and management of Apache Iceberg tables."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "pyiceberg"
  - "dremio-sabot-engine"
keywords:
  - datafusion
  - apache datafusion
  - rust query engine
  - iceberg rust datafusion
lastUpdated: 2026-05-29
---

## Apache DataFusion

**Apache DataFusion** is a fast, extensible SQL query engine written in Rust. It is designed to act as a SQL parser and execution engine for custom databases, analytics platforms, and data pipelines. DataFusion uses Apache Arrow as its in-memory representation, enabling vectorized execution and gRPC-based data transfers.

### Iceberg Integration Scope

DataFusion integrates with Apache Iceberg natively, primarily through the official **`iceberg-datafusion`** crate (part of the `iceberg-rust` project). This integration implements DataFusion's core trait interfaces:

- **Table Provider Implementation**: By implementing the `TableProvider`, `SchemaProvider`, and `CatalogProvider` traits, the crate allows DataFusion to recognize Iceberg tables as standard SQL tables.
- **SQL DDL Support**: DataFusion can execute SQL Data Definition Language (DDL) commands, such as `CREATE TABLE` and `DROP TABLE`, directly on Iceberg catalogs.
- **Updates and Appends**: The engine supports `INSERT INTO` DML operations, writing new records as compliant Parquet files and generating the corresponding metadata commits. For partitioned tables, the engine automatically handles sort-based clustering during writes to prevent the small file problem.
- **Query Optimizations**: The integration supports filter predicate pushdowns (on types like Booleans, strings, and Timestamps) and limit pushdowns, allowing DataFusion to skip reading irrelevant files by analyzing Iceberg manifest statistics.
- **Transactional Reading**: The engine resolves positional and equality delete logs, applying them dynamically during execution to support Merge-on-Read (MoR) tables.
