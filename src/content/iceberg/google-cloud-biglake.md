---
term: "Google Cloud BigLake"
description: "A storage virtualization and governance engine in Google Cloud that unifies data lakes and warehouses, supporting managed Apache Iceberg tables."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "iceberg-rest-catalog-api"
  - "decoupled-compute-and-storage"
keywords:
  - biglake
  - google cloud biglake
  - biglake metastore
  - google cloud iceberg
  - bigquery iceberg
lastUpdated: 2026-05-29
---

## Google Cloud BigLake

**Google Cloud BigLake** (integrated into Google Cloud's Lakehouse architecture) is a storage virtualization and governance engine. It unifies data warehouses and object storage lakes by permitting cloud engines to query external data files with fine-grained access control. BigLake supports open table formats, with first-class support for Apache Iceberg tables stored in Google Cloud Storage (GCS).

### Iceberg Integration Scope

The integration of Apache Iceberg within the Google Cloud ecosystem covers several areas:

- **BigLake Metastore**: BigLake Metastore serves as a serverless, scalable metadata repository. It supports the Iceberg REST Catalog API, allowing query engines (such as BigQuery, Google Cloud Managed Service for Apache Spark, Trino, and Flink) to discover and query tables using a single source of truth.
- **Iceberg Managed Tables**: Users can create managed Iceberg tables in BigQuery. The actual data is stored in the customer's own GCS bucket as Parquet files, but Google Cloud manages the table lifecycle, executing automated optimizations like file compaction, metadata pruning, and transaction commits.
- **Fine-Grained Governance**: Through integration with Dataplex and Google Cloud IAM, BigLake enforces row-level, column-level, and cell-level access policies dynamically, regardless of whether the user is querying the table via BigQuery or Apache Spark.
- **Engine Interoperability**: Since data is stored in open Iceberg format, external engines can query the tables directly from GCS without data migration or lock-in.
