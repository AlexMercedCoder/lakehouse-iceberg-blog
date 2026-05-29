---
term: "Spice.ai"
description: "A data acceleration platform that enables application and AI developers to query, federate, and write to Apache Iceberg tables with sub-millisecond query performance."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "iceberg-rest-catalog"
  - "catalog-federation"
keywords:
  - spiceai
  - spice.ai
  - spice data connector
  - query acceleration spice
lastUpdated: 2026-05-29
---

## Spice.ai

**Spice.ai** is a modular data acceleration platform built for application developers and AI engineers. Utilizing an Apache Arrow-based query engine, Spice.ai connects to diverse catalogs to accelerate query speeds. It supports Apache Iceberg as a native first-class data source, enabling developers to query, federate, and write data using standard SQL.

### Iceberg Integration Scope

Spice.ai provides several integration capabilities for working with Iceberg tables:

- **Federated Queries**: Spice.ai can connect to multiple Iceberg tables and join them with other systems (such as PostgreSQL or Snowflake) in a single SQL query.
- **Query Acceleration**: To overcome the latency of cloud object storage, Spice.ai allows developers to selectively cache Iceberg tables into local in-memory engines (like DuckDB or the Spice Cayenne engine). This delivers sub-millisecond query execution while keeping the local cache synchronized with the source Iceberg tables.
- **Write Support**: Developers can write records to Iceberg tables using standard SQL `INSERT INTO` statements, which are committed securely via Iceberg's optimistic concurrency control (OCC).
- **Catalog Connectivity**: Rather than configuring individual datasets, Spice.ai supports catalog connectors (such as the Iceberg REST Catalog Connector or the AWS Glue Catalog Connector). This allows Spice.ai to discover and load all catalog tables automatically.
- **Declarative Configurations**: Connection details are defined in a YAML configuration file (Spicepod), mapping local database aliases to remote Iceberg catalog URLs and credentials.
