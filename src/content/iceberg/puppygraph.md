---
term: "PuppyGraph"
description: "A real-time, zero-ETL graph query engine that allows users to query relational data lakes, including Apache Iceberg, as a unified graph model."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "iceberg-catalog"
  - "rest-catalog-credential-vending"
keywords:
  - puppygraph
  - zero etl graph
  - graph query engine
  - opencypher iceberg
  - gremlin data lake
lastUpdated: 2026-05-29
---

## PuppyGraph

**PuppyGraph** is a real-time, zero-ETL graph query engine. Rather than requiring developers to copy relational tables into a specialized graph database (like Neo4j) via complex ETL pipelines, PuppyGraph queries relational data stores and data lakes directly as a graph model. It supports standard graph query languages like openCypher and Gremlin.

### Iceberg Integration Scope

PuppyGraph provides native compatibility with Apache Iceberg catalogs and tables:

- **Zero-ETL Schema Mapping**: PuppyGraph maps existing Iceberg tables directly into nodes and edges at query time. For example, a `users` table acts as node vertices, and a `transactions` table acts as connecting edges, without moving the data.
- **Catalog Connectivity**: PuppyGraph integrates with Iceberg catalogs (including AWS Glue, REST Catalogs, Apache Polaris, and Databricks Unity Catalog). It queries the catalog to discover tables and fetch schemas automatically.
- **Vectorized Graph Execution**: To support multi-hop graph traversals (such as 10-hop relationship queries), PuppyGraph utilizes a vectorized execution engine. It reads data files directly from cloud object storage (like S3) using path-based credential vending, executing joins and traversals in memory.
- **Hybrid Analytics**: Because PuppyGraph is read-only on the lakehouse storage, the same Iceberg tables can be queried simultaneously using SQL for traditional BI (via engines like Dremio) and openCypher for graph-based fraud detection.
