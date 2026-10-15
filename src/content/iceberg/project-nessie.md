---
term: "Project Nessie"
metaTitle: "Project Nessie | Git-Like Iceberg Catalog vs Polaris"
description: "Project Nessie is an open source Iceberg catalog with Git-like branches, tags, and multi-table commits. See how it works and how it compares to Apache Polaris."
category: "Catalogs"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-rest-catalog"
  - "apache-polaris-catalog"
  - "iceberg-branching-tagging"
  - "dremio-apache-iceberg"
keywords:
  - project nessie
  - nessie iceberg catalog
  - nessie git like catalog
  - iceberg branching catalog
  - nessie transactional catalog
lastUpdated: 2026-10-14
---

## Project Nessie

**Project Nessie** is an open source transactional catalog for Apache Iceberg that adds **Git-like branching and merging** at the catalog level. It serves the Iceberg REST Catalog API alongside its own API for branches and tags. Originally developed and open-sourced by Dremio, Nessie enables data engineering teams to work with Iceberg tables the same way software engineers work with code: on isolated branches, with the ability to test changes safely before merging to the main catalog state.

## What Makes Nessie Unique

Nessie does not store data files or Iceberg manifests. For each table on each branch, it stores a pointer to the table's current metadata file. Standard Iceberg catalogs (Hive Metastore, AWS Glue, Apache Polaris) track one current state per table. Nessie adds a **versioning layer above the catalog** that tracks the state of the entire catalog (all tables, all namespaces) as a sequence of commits, each with a unique hash.

This enables:

- **Branches**: Create a named copy of the catalog state, make changes (add tables, run ETL, modify schemas), and those changes are isolated from the main catalog until you merge.
- **Tags**: Create a named, immutable pointer to a specific catalog state: perfect for end-of-period snapshots or release markers.
- **Cross-table atomic commits**: Changes to several tables made on a branch are published to main in one atomic merge. If main has conflicting changes to the same tables, the merge fails and main is left unchanged.
- **Rollback**: Rollback the entire catalog to a prior state, not just a single table.

## Git-Like Workflow for Data Engineering

Nessie's branching model translates directly to common data engineering patterns:

### Development Isolation

```
main branch           dev-etl-v2 branch
───────────────       ────────────────────
current_state    →    fork
                      run new ETL logic
                      validate results
                      ← merge to main (or discard)
```

ETL developers can run their jobs against real production data (copied via branch fork: zero data copy) on a `dev` branch without any risk of corrupting the production catalog.

### Write-Audit-Publish and CI/CD for Data Pipelines

Data pipelines can be tested against a branch of the catalog in CI/CD:

1. CI creates a `ci-build-123` branch from main.
2. Pipeline runs against the branch and commits results.
3. Tests validate the output.
4. On success, branch merges to main; on failure, branch is discarded.

This is the [Write-Audit-Publish](https://iceberglakehouse.com/posts/write-audit-publish-iceberg-branches/) pattern. Iceberg also supports [branches and tags on a single table](/iceberg/iceberg-branching-tagging/), which can drive WAP without Nessie. Nessie's difference is that its branches cover the whole catalog.

### Zero-Copy Experiments

"Zero-copy" branching means the branch does NOT duplicate data files: it only duplicates the catalog metadata pointers. Creating a branch with 100TB of Iceberg data takes milliseconds and costs nothing in storage.

## Nessie API

Nessie exposes both the standard Iceberg REST Catalog API and its own API for branch and tag management:

### Iceberg REST Catalog Compatibility

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "nessie",
    **{
        "type": "rest",
        # The branch is the last path segment of the REST URI
        "uri": "http://localhost:19120/iceberg/main",
    }
)
```

### Branch Operations with the Nessie CLI

The Nessie CLI wraps the native API (served under `/api/v2`) with SQL-like commands:

```sql
CONNECT TO http://localhost:19120/api/v2
CREATE BRANCH dev_etl FROM main
LIST REFERENCES
MERGE BRANCH dev_etl INTO main
```

## Nessie vs. Apache Polaris

| Feature                    | Project Nessie                                 | Apache Polaris                                    |
| -------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| Governance                 | Open source project (Apache 2.0 license)       | Apache Software Foundation project                |
| Iceberg REST API           | Yes                                            | Yes                                               |
| Catalog-level branching    | Yes (key differentiator)                       | No; uses Iceberg table-level branches             |
| Multi-table atomic commits | Yes, through branch merges                     | Yes, through the REST multi-table commit endpoint |
| Credential vending         | S3 assume-role credentials and request signing | Yes                                               |
| Access control             | Authorization rules                            | Role-based access control                         |
| Best for                   | Branch-based ETL workflows                     | Governance and broad engine support               |

For help choosing a catalog, read [Choosing the Right Iceberg Control Plane](https://iceberglakehouse.com/posts/2026-05-24-choosing-iceberg-control-plane/), and see the [Apache Polaris catalog](/iceberg/apache-polaris-catalog/) entry.

## Nessie in the Broader Ecosystem

Nessie is commonly used in local and self-hosted development environments via Docker:

```yaml
# docker-compose.yml
services:
  nessie:
    image: ghcr.io/projectnessie/nessie:latest
    ports:
      - "19120:19120"
```

Dremio, where Nessie originated, can connect to Nessie as a source and query branches with `AT BRANCH` SQL. Dremio's earlier managed catalog, Arctic, was built on Nessie. In 2024 Dremio announced it would fold Nessie's capabilities into Apache Polaris, and its current catalog, Dremio Catalog, is built on Polaris. Nessie remains available as its own open source project.

The Nessie project is hosted at [projectnessie.org](https://projectnessie.org) and governed as a community open-source project.
