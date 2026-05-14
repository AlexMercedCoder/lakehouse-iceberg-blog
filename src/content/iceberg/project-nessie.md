---
term: "Project Nessie"
description: "Project Nessie is an open-source transactional metadata catalog for Apache Iceberg with Git-like branching and merging semantics, enabling isolated ETL development, zero-copy experiments, and multi-table atomic commits across an entire catalog."
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
lastUpdated: 2026-05-14
---

## Project Nessie

**Project Nessie** is an open-source Apache Iceberg catalog that extends the Iceberg REST Catalog specification with **Git-like branching and merging semantics** at the catalog level. Originally developed and open-sourced by Dremio, Nessie enables data engineering teams to work with Iceberg tables the same way software engineers work with code: on isolated branches, with the ability to test changes safely before merging to the main catalog state.

## What Makes Nessie Unique

Standard Iceberg catalogs (Hive Metastore, AWS Glue, Apache Polaris) track the current state of each table — a single "main" version of the catalog. Nessie adds a **versioning layer above the catalog** that tracks the state of the entire catalog (all tables, all namespaces) as a sequence of commits, each with a unique hash.

This enables:

- **Branches**: Create a named copy of the catalog state, make changes (add tables, run ETL, modify schemas), and those changes are isolated from the main catalog until you merge.
- **Tags**: Create a named, immutable pointer to a specific catalog state — perfect for end-of-period snapshots or release markers.
- **Cross-table atomic commits**: Changes to multiple tables can be committed atomically on a branch, then merged to main — a capability that even standard Iceberg single-table commits don't provide.
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

ETL developers can run their jobs against real production data (copied via branch fork — zero data copy) on a `dev` branch without any risk of corrupting the production catalog.

### CI/CD for Data Pipelines

Data pipelines can be tested against a branch of the catalog in CI/CD:

1. CI creates a `ci-build-123` branch from main.
2. Pipeline runs against the branch and commits results.
3. Tests validate the output.
4. On success, branch merges to main; on failure, branch is discarded.

### Zero-Copy Experiments

"Zero-copy" branching means the branch does NOT duplicate data files — it only duplicates the catalog metadata pointers. Creating a branch with 100TB of Iceberg data takes milliseconds and costs nothing in storage.

## Nessie API

Nessie exposes both the standard Iceberg REST Catalog API AND a custom Nessie API for branch/tag management:

### Iceberg REST Catalog Compatibility

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "nessie",
    **{
        "type": "rest",
        "uri": "http://localhost:19120/iceberg",
        "ref": "main",  # which branch to use
    }
)
```

### Nessie-Specific Branch Operations (via Nessie API)

```bash
# Create a branch
curl -X POST http://localhost:19120/api/v2/trees \
  -d '{"name": "dev-etl", "type": "BRANCH", "reference": {"type": "BRANCH", "name": "main"}}'

# List branches
curl http://localhost:19120/api/v2/trees

# Merge a branch to main
curl -X POST http://localhost:19120/api/v2/trees/BRANCH/main/merge
```

## Nessie vs. Apache Polaris

| Feature                 | Project Nessie             | Apache Polaris        |
| ----------------------- | -------------------------- | --------------------- |
| Open source             | Yes (Apache)               | Yes (Apache)          |
| REST Catalog API        | Yes                        | Yes (reference impl.) |
| Catalog-level branching | Yes (key differentiator)   | No                    |
| Credential vending      | No                         | Yes                   |
| Fine-grained RBAC       | Limited                    | Yes                   |
| Multi-catalog           | No                         | Yes                   |
| Best for                | Branch-based ETL workflows | Enterprise governance |

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

It is also available as a managed service component in some lakehouse platforms. Dremio (where Nessie originated) supports Nessie-backed Iceberg tables in both development and production environments.

The Nessie project is hosted at [projectnessie.org](https://projectnessie.org) and governed as a community open-source project.
