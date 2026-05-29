---
term: "Single Source of Truth (SSOT)"
description: "A data design principle where a central repository serves as the definitive reference for the state and metadata definitions of all tables across an enterprise."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-table-format"
keywords:
  - single source of truth
  - ssot
  - catalog source of truth
  - data lakehouse ssot
lastUpdated: 2026-05-29
---

## Single Source of Truth (SSOT)

In data lakehouse architectures, a **Single Source of Truth (SSOT)** is the architectural goal of having a single repository define the exact composition, schema, and location of valid data files. In legacy data lakes, separate query engines often maintained their own copy of table definitions, leading to synchronization errors, stale schema configurations, and data inconsistency.

### How Apache Iceberg Achieves SSOT

Apache Iceberg implements a Single Source of Truth at two key levels:

1.  **Catalog Level**: The catalog (such as Apache Polaris, Project Nessie, or AWS Glue Catalog) holds a single, atomic reference pointer to the current `.metadata.json` file for every table. Regardless of which engine queries the table, they must retrieve this pointer from the central catalog, ensuring that all engines see the exact same snapshot version of the data at any given moment.
2.  **Metadata File Level**: The table's state is recorded inside its metadata files. This includes schema definitions, partition specifications, and snapshots. By keeping the schema state explicitly linked to the snapshot history in the metadata file, Iceberg prevents engines from misinterpreting column layouts or scanning old files.

### Architectural Benefits

Establishing a central source of truth resolves several operational challenges:

- **Consistency Across Engines**: Prevents scenarios where a schema modification executed in Spark is not recognized by Trino.
- **Auditability**: Because all catalog updates write to a single version history, security teams can audit changes by reviewing the commit logs of the central catalog.
- **Security Integration**: Enforces column-level and row-level access controls at a single point (such as a REST Catalog) rather than requiring duplicate policies in each query engine.
