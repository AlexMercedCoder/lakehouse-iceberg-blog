---
term: "Apache Polaris Catalog"
description: "Apache Polaris is an open-source implementation of the Apache Iceberg REST Catalog specification, co-created by Dremio and Snowflake and donated to the Apache Software Foundation, providing a vendor-neutral reference catalog for the Iceberg lakehouse ecosystem."
category: "Catalogs"
relatedTerms:
  - "iceberg-rest-catalog"
  - "iceberg-catalog"
  - "dremio-apache-iceberg"
  - "snowflake-open-catalog"
  - "project-nessie"
  - "aws-glue-catalog"
keywords:
  - apache polaris
  - polaris iceberg catalog
  - apache polaris catalog
  - dremio snowflake polaris
  - iceberg open source catalog
  - polaris REST catalog
lastUpdated: 2026-05-14
---

## Apache Polaris Catalog

**Apache Polaris** is an open-source, Apache Software Foundation-governed implementation of the Apache Iceberg REST Catalog specification. It serves as the neutral, vendor-agnostic reference catalog for the Apache Iceberg ecosystem — providing a production-grade catalog server that any Iceberg-compatible engine can connect to without vendor lock-in.

## Origins: Co-Created by Dremio and Snowflake

Apache Polaris was co-created by **Dremio** and **Snowflake** — two of the most prominent companies in the data lakehouse space — and jointly donated to the Apache Software Foundation. This cross-vendor collaboration was significant: it demonstrated that Dremio and Snowflake, despite being competitors in the data platform market, shared a strategic interest in establishing a neutral, open standard for Iceberg catalog infrastructure.

By placing Polaris under the Apache Foundation's governance (rather than under either company's control), both contributors ensured that Polaris would be a community asset — free for anyone to use, improve, and build upon.

> **Note**: Dremio's commercial Open Catalog capability is powered by Apache Polaris, deeply integrated into the Dremio platform as part of its Agentic Lakehouse architecture.

## What Apache Polaris Implements

Polaris is a full implementation of the **Iceberg REST Catalog specification** — a standardized HTTP API for catalog operations. This means any engine or client that supports the Iceberg REST Catalog (Spark, Flink, Trino, Dremio, PyIceberg, DuckDB, and more) can connect to a Polaris server and immediately read and write Iceberg tables.

### Core Capabilities

**Namespace Management**: Create and manage hierarchical namespaces (databases/schemas) within a catalog.

**Table Lifecycle**: Create, load, update (commit), and drop Iceberg tables with full atomic commit semantics.

**View Support**: Manage Iceberg views — stored SQL queries that appear as tables to downstream consumers.

**Multi-Catalog Architecture**: Polaris supports running multiple named catalogs in a single Polaris server instance, enabling multi-tenant deployments.

**Credential Vending**: Polaris issues short-lived, scoped object storage credentials to clients, so engines never hold long-lived cloud credentials. The client requests access, Polaris authenticates and authorizes, and returns temporary credentials scoped to the specific tables requested.

**Fine-Grained Access Control**: Role-based access control at the catalog, namespace, and table level. Polaris manages principals (users and service accounts) and their privileges.

## Architecture Overview

```
Query Engine (Spark / Flink / Dremio / Trino / PyIceberg)
        │ Iceberg REST Catalog API (HTTP)
        ▼
Apache Polaris Server
  ├── Catalog management (namespaces, tables, views)
  ├── Authentication & authorization (OAuth2 / RBAC)
  ├── Credential vending (scoped object storage tokens)
  └── Metadata storage (internal persistence layer)
        │
        ▼
Object Storage (S3 / ADLS / GCS)
  └── Iceberg metadata files, manifest files, data files
```

## The Iceberg REST Catalog Standard

Apache Polaris is the reference implementation of the **Iceberg REST Catalog specification** — a vendor-neutral HTTP API that standardizes how engines interact with catalogs. This standardization is transformative because:

1. **Any engine can connect to any compliant catalog**: Write once with the Iceberg REST Catalog API, connect to Polaris, Nessie, AWS Glue, or any other compliant implementation.
2. **Eliminates catalog vendor lock-in**: Switching from one catalog to another requires only configuration changes, not code changes.
3. **Enables credential vending as a standard pattern**: Security teams can enforce credential isolation without each engine implementing its own access control logic.

## Polaris in the Dremio Ecosystem

Dremio describes itself as "The Agentic Lakehouse for AI and Analytics" and positions its **Open Catalog** capability — powered by Apache Polaris — as the interoperability backbone of the modern lakehouse. In Dremio Cloud and Dremio Enterprise:

- The Open Catalog exposes Iceberg tables to any Iceberg-compatible engine via the REST Catalog API.
- Dremio's AI Semantic Layer, Intelligent Query Engine, and AI Agent capabilities all operate against the same catalog layer.
- Credential vending ensures that third-party engines (Spark, Flink, PyIceberg) access only the tables they are authorized to read — enforced at the catalog level, not just the query engine level.

## Polaris vs. Other Catalogs

| Feature            | Apache Polaris         | Project Nessie | AWS Glue  | Hive Metastore   |
| ------------------ | ---------------------- | -------------- | --------- | ---------------- |
| Open source        | Yes (Apache)           | Yes (Apache)   | No        | Yes              |
| REST Catalog API   | Yes (reference impl.)  | Yes            | Yes       | Via HMS endpoint |
| Credential vending | Yes                    | No             | Partial   | No               |
| Branching/tagging  | No (handled by Nessie) | Yes (Git-like) | No        | No               |
| Governance (RBAC)  | Yes                    | Limited        | Yes (IAM) | Limited          |
| Multi-catalog      | Yes                    | No             | No        | No               |

## Getting Started with Apache Polaris

Apache Polaris is available as:

- Open-source code at [github.com/apache/polaris](https://github.com/apache/polaris)
- Docker images for local development
- Managed service via Dremio Cloud (the Open Catalog)
- Managed service via Snowflake Open Catalog

For most teams, starting with Dremio Cloud's free tier provides the fastest path to a production-grade Polaris-backed catalog without infrastructure management overhead.
