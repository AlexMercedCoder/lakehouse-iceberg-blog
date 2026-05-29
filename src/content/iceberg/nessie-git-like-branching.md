---
term: "Nessie Git-like Branching"
description: "A version control model in Project Nessie that allows teams to manage database catalog tables using branches, tags, and commits, mirroring Git software workflows."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "project-nessie"
  - "iceberg-concurrent-writes"
keywords:
  - nessie branching
  - git-like branching
  - catalog branching
  - write audit publish nessie
lastUpdated: 2026-05-29
---

## Nessie Git-like Branching

**Nessie Git-like Branching** is a catalog-level version control feature provided by Project Nessie. Unlike standard table formats where versioning is restricted to single-table snapshot histories, Nessie manages the state of the entire catalog using a version-control tree structure. This allows data engineers to create isolated environments (branches) to write, transform, and test data across multiple tables before exposing changes to production.

### How Catalog Branching Works

Nessie maintains a commit log where each commit represents a consistent snapshot of all table pointers in the catalog.

- **Main Branch**: The active branch used by production dashboards and business users to read stable data.
- **Feature Branches**: Isolated branches (e.g. `etl_job_may`) created for specific data ingestion or transformation pipelines.
- **Cross-Table Commits**: When an ETL job updates three tables on a feature branch, the updates are grouped in a single Nessie commit on that branch. Query engines pointing to the production branch see no partial updates, maintaining transactional isolation across the catalog.

### Querying Branches in SQL

Many query engines that support Nessie (such as Dremio, Spark, or Trino) allow users to specify which catalog branch they want to access. This selection can be made globally or per query:

```sql
/* Query the main production branch */
SELECT * FROM nessie_catalog.db.customers AT BRANCH main;

/* Query a staging branch to verify updates before publishing */
SELECT * FROM nessie_catalog.db.customers AT BRANCH staging_etl;
```

### Implementing Write-Audit-Publish (WAP)

Nessie's branching makes WAP patterns straightforward:

1.  Create a branch named `audit_branch` off `main`.
2.  Run the ETL job to load and transform data on `audit_branch`.
3.  Execute validation queries and quality checks on `audit_branch`.
4.  If the checks pass, merge `audit_branch` back into `main`. If they fail, delete the branch to discard all modifications instantly without affecting production users.
