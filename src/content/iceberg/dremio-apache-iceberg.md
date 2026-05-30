---
term: "Dremio and Apache Iceberg"
description: "Dremio is an Agentic Lakehouse platform that provides a fully integrated Iceberg experience through its Intelligent Query Engine, AI Semantic Layer, and Open Catalog powered by Apache Polaris, available as Dremio Cloud (fully managed) and Dremio Enterprise (self-managed)."
category: "Engines & Integrations"
relatedTerms:
  - "apache-polaris-catalog"
  - "iceberg-rest-catalog"
  - "what-is-apache-iceberg"
  - "data-lakehouse"
  - "iceberg-agentic-lakehouse"
  - "iceberg-compaction"
keywords:
  - dremio apache iceberg
  - dremio iceberg lakehouse
  - dremio cloud iceberg
  - dremio query engine iceberg
  - dremio open catalog
  - dremio agentic lakehouse
lastUpdated: 2026-05-14
---

## Dremio and Apache Iceberg

**Dremio** is an **Agentic Lakehouse platform for AI and Analytics** that is purpose-built around Apache Iceberg as its foundational table format. Dremio describes itself as "The Agentic Lakehouse": a platform designed for the AI era, providing the context, access, and speed that both AI agents and human analysts need to work with data.

Dremio's relationship with Apache Iceberg goes beyond simple support: Dremio was one of the co-creators of Apache Polaris (alongside Snowflake), the Apache-governed reference implementation of the Iceberg REST Catalog specification. Apache Iceberg and the open lakehouse ecosystem are central to Dremio's product strategy and technical identity.

## Dremio Products

Dremio offers three product tiers:

### Dremio Cloud

The fully managed lakehouse platform for Agentic AI. Runs in AWS and Azure (North America and European regions). Dremio Cloud includes:

- Full Iceberg read/write support with the Intelligent Query Engine
- Open Catalog powered by Apache Polaris (Iceberg REST Catalog)
- AI Semantic Layer for AI agents and analysts
- AI Agent capability for autonomous analytics
- Auto-scaling compute with sub-second query performance
- Free tier available with no infrastructure management required

### Dremio Enterprise

Self-managed software that runs on Kubernetes, on-premise, or in any cloud. Provides the same core capabilities as Dremio Cloud for organizations with strict data residency or regulatory requirements.

### Dremio Community Edition

A free query engine for local machines or servers. Ideal for development, learning, and evaluation of Iceberg workloads without cloud infrastructure.

## Core Capabilities for Apache Iceberg

### Intelligent Query Engine

Dremio's query engine is built for Iceberg performance. It natively understands Iceberg's metadata hierarchy: manifest lists, manifest files, column statistics, and uses this information for aggressive partition pruning and data skipping. Dremio's **Reflections** feature (pre-computed materializations) can accelerate Iceberg queries by orders of magnitude for frequently run workloads.

### Open Catalog (Powered by Apache Polaris)

Dremio's Open Catalog capability implements the Iceberg REST Catalog specification, built on Apache Polaris. This means:

- Any Iceberg-compatible engine (Spark, Flink, Trino, PyIceberg) can connect to Dremio's catalog via the standard REST API.
- Tables created in Dremio are immediately accessible from any other engine and vice versa.
- Credential vending ensures that connected engines get only the access they need.
- Fine-grained access control (table-level, namespace-level) governs what each engine and user can access.

### AI Semantic Layer

Dremio's AI Semantic Layer translates Iceberg table data into AI-readable context:

- **Virtual datasets**: Business-logic views that expose clean, semantically meaningful data to AI agents.
- **Wikis and labels**: Documentation and metadata that LLMs use to understand what each dataset means.
- **Business-friendly metrics**: Pre-defined KPIs and aggregations accessible via natural language.

This semantic layer is what enables AI agents and LLMs to generate correct, trustworthy SQL against Iceberg tables without human curation of every prompt.

### AI Agent

Dremio's built-in AI Agent uses the AI Semantic Layer to answer data questions autonomously: converting natural language queries into SQL, executing them against Iceberg tables, and returning results. The AI Agent is the first-class user of the semantic layer.

### Table Optimization (Compaction)

Dremio provides the `OPTIMIZE TABLE` command for Iceberg compaction:

```sql
-- Basic optimization
OPTIMIZE TABLE db.orders;

-- With explicit settings
OPTIMIZE TABLE db.orders
REWRITE DATA USING BIN_PACK
(TARGET_FILE_SIZE_MB = 256, MIN_FILE_SIZE_MB = 64);
```

Dremio Cloud supports automatic background optimization, keeping Iceberg tables performant without manual maintenance schedules.

## Dremio's Role in the Iceberg Ecosystem

Beyond its product capabilities, Dremio is a leading contributor to the Apache Iceberg ecosystem:

- Co-created and co-donated **Apache Polaris** to the Apache Software Foundation.
- **Project Nessie** (the Git-like catalog with branching semantics) originated at Dremio.
- Dremio engineers are active contributors to the Apache Iceberg specification and tooling.
- Alex Merced (Dremio's Head of Developer Relations) co-authored _Apache Iceberg: The Definitive Guide_ (O'Reilly).

## Getting Started

The fastest path to working with Apache Iceberg via Dremio:

1. Sign up for [Dremio Cloud](https://www.dremio.com/get-started) (free tier, no credit card required).
2. Add your object storage as a data source (S3, ADLS, GCS).
3. Use the Open Catalog to create Iceberg namespaces and tables.
4. Query immediately with the Intelligent Query Engine.
5. Connect other engines (Spark, PyIceberg) via the REST Catalog API.
