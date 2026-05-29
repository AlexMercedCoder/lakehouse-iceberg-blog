---
term: "Catalog Federation"
description: "The capability of a query engine to connect to multiple disjoint metadata catalogs simultaneously, presenting them as a single logical database hierarchy."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "iceberg-catalog"
  - "dremio-sabot-engine"
keywords:
  - catalog federation
  - federated queries
  - multi catalog query
  - data federation
lastUpdated: 2026-05-29
---

## Catalog Federation

**Catalog Federation** is the ability of an analytical query engine to query multiple independent catalogs simultaneously. In large enterprises, tables are rarely stored in a single catalog. A company might store active transaction records in AWS Glue, developmental data in Project Nessie, and partner share tables in Apache Polaris. Catalog federation allows users to query and join these disparate tables without migrating the metadata.

### How Catalog Federation Works

The query engine acts as the coordinator across the federated catalogs:

1.  **Multiple Connections**: The engine's coordinator establishes active client connections to each defined catalog provider (e.g. AWS Glue, JDBC, and REST).
2.  **Unified Namespace**: The engine represents these catalogs as top-level namespaces within its logical database structure (for example, `glue_prod`, `nessie_dev`, and `polaris_shared`).
3.  **Cross-Catalog Join Resolution**: When a user runs a cross-catalog query, the engine reads metadata from each catalog, plans parallel scans, and executes the joins in its own memory space:

```sql
/* Query joining an S3 table in Glue and a branch table in Nessie */
SELECT c.name, o.amount
FROM glue_prod.db.customers c
JOIN nessie_dev.db.orders AT BRANCH main o ON c.id = o.customer_id;
```

### Advantages of Federation

- **No Data Migration**: Enables cross-system reporting immediately without running ETL jobs to consolidate tables.
- **Decoupled Development**: Let teams use catalogs optimized for their work (such as Nessie for development branching) while maintaining read access to production tables.
- **Vendor Interoperability**: Query data across AWS, GCP, and Snowflake catalogs using a single engine.
