---
term: "Dremio Virtual Datasets (VDS)"
description: "Dremio Virtual Datasets (VDS) are logical views defined in the semantic layer that allow data teams to clean, join, and restructure data using standard SQL without copying the underlying source data."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-physical-datasets-pds"
  - "dremio-spaces"
  - "dremio-reflections"
keywords:
  - virtual datasets vds
  - dremio vds
  - virtual data views
  - semantic layer views dremio
  - zero copy logical view
lastUpdated: 2026-05-29
---

## Dremio Virtual Datasets (VDS)

**Dremio Virtual Datasets (VDS)** are logical, virtual tables defined within the Dremio semantic layer using standard SQL query syntax. A VDS behaves exactly like a physical database table or view: it has a defined schema (columns and data types) and can be queried, filtered, and joined with other datasets using standard SQL.

However, a VDS does not store any physical data. Instead, it stores only the SQL definition. When a client queries a VDS, Dremio compiles the query, pushes operations down to the underlying data sources, and processes the results in memory.

## The Building Blocks of the Semantic Layer

Virtual Datasets are the primary mechanism for constructing a decoupled semantic layer in Dremio:

- **Zero-Copy Design**: Since VDS definitions are stored as metadata rather than physical copies of data, creating them does not incur additional storage costs. Data teams can create thousands of custom datasets tailored to specific departments without duplicate cloud storage files.
- **Logical Nesting**: A VDS can query physical tables (PDS), other VDS, or a combination of both. This nesting capability allows data architects to build multi-tiered semantic models (for example, raw data $\rightarrow$ cleaned business datasets $\rightarrow$ department-specific report views).
- **Security and Access Control**: Fine-grained access privileges can be set on a VDS. Administrators can grant users permissions to query a virtual dataset without granting them access to the underlying physical tables or raw storage buckets. Row-level filtering and column masking can also be defined inside the VDS SQL query.

## VDS Acceleration via Reflections

While a VDS is purely logical, Dremio can accelerate queries against it using **Reflections**. If a Raw or Aggregation reflection is enabled on a VDS, Dremio pre-computes the query result and writes it to Parquet storage.

If a user queries the VDS, the query planner rewrites the operation to read from the pre-computed reflection files. This provides materialized-view performance without requiring the user to change their target query from the logical VDS to the physical materialized table.

## Data Lineage and Traceability

Dremio automatically tracks dependencies between datasets. When viewing a VDS in the Dremio web UI, data analysts can trace its lineage through a visual graph:

```
[S3 Bucket: CSV Files] ──> [Physical Dataset: orders_raw] ──> [Virtual Dataset: v_orders_clean] ──> [Virtual Dataset: v_marketing_dashboard]
```

This structural lineage ensures data governance teams can audit where calculations are derived, which tables are impacted by upstream schema changes, and how security policies inherit down the logical dataset stack.
