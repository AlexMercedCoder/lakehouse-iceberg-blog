---
term: "Bauplan"
description: "A Python-native serverless lakehouse engine that uses Apache Iceberg as its core storage format to run pipelines with Git-style versioning."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "nessie-git-like-branching"
  - "iceberg-table-format"
keywords:
  - bauplan
  - serverless lakehouse
  - python lakehouse
  - data versioning bauplan
lastUpdated: 2026-05-29
---

## Bauplan

**Bauplan** is a Python-native serverless database and data lakehouse engine. It is designed to run data pipelines and ETL processes using standard Python code without managing infrastructure. Bauplan uses Apache Iceberg as its core storage format, writing transactional data directly to the user's S3 buckets.

### Iceberg Integration Scope

Bauplan integrates Apache Iceberg to provide transactional safety and data versioning:

- **Core Storage Format**: All tables created or updated by Bauplan are written in standard Apache Iceberg format. This ensures that curated data can be queried immediately by external engines (such as Dremio or Snowflake) without data duplication or migration.
- **Git-Style Version Control**: Bauplan leverages Iceberg snapshots and catalog branching (using Project Nessie) to provide Git-like version control for data. Developers can create isolated branches to run pipelines and test updates, then merge changes back into production atomically.
- **Query Engine Integration**: Bauplan integrates engines like DuckDB to execute data tasks. It parses Iceberg metadata to execute file and partition pruning, ensuring fast processing times during execution.
- **REST Catalog Support**: Bauplan exposes table definitions via a standard Iceberg REST Catalog, allowing external platforms to connect and query tables using standard APIs.
