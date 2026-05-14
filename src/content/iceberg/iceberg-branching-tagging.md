---
term: "Iceberg Branching and Tagging"
description: "Iceberg table branches and tags are named references to specific snapshots or independent snapshot chains, enabling Git-like workflows for data pipelines: isolated development on branches, permanent audit markers with tags, and safe ETL testing without affecting production."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-time-travel"
  - "project-nessie"
  - "iceberg-expire-snapshots"
  - "iceberg-metadata-file"
keywords:
  - iceberg branching
  - iceberg tagging
  - iceberg table branches
  - iceberg git like workflow
  - iceberg named references
lastUpdated: 2026-05-14
---

## Iceberg Table Branching and Tagging

Apache Iceberg Spec v2 introduced **branches and tags** — named references to snapshots that enable Git-like workflows at the table level. These capabilities bring software engineering practices (feature branches, release tags, isolated testing) to data pipeline development.

## Tags: Named Snapshot Markers

A **tag** is a named, immutable reference pointing to a specific snapshot. Tags serve as permanent bookmarks:

- **Audit compliance**: Tag snapshots at the end of each fiscal period for immutable audit trails.
- **ML model versioning**: Tag the dataset version used to train each model release.
- **Release markers**: Tag the table state at each data product release.

### Creating Tags

```sql
-- Tag the current snapshot as end-of-year 2025
ALTER TABLE db.orders CREATE TAG eoy_2025;

-- Tag a specific snapshot
ALTER TABLE db.orders CREATE TAG q1_2026 AS OF VERSION 8027658604211071520;

-- Tag with explicit retention (don't expire this tag)
ALTER TABLE db.orders CREATE TAG audit_2025 AS OF VERSION 8027658604211071520
RETAIN 365 DAYS;
```

### Querying a Tagged Snapshot

```sql
-- Spark: query as of a named tag
SELECT * FROM db.orders VERSION AS OF 'eoy_2025';

-- PyIceberg: load table at a tag
table = catalog.load_table("db.orders")
snap = table.snapshot_by_name("eoy_2025")
scan = table.scan(snapshot_id=snap.snapshot_id)
```

## Branches: Independent Snapshot Chains

A **branch** is a named, mutable snapshot chain that diverges from a parent snapshot. Like a Git branch, it accumulates its own commits independently from the main branch. Changes on a branch are invisible to readers of the main branch until explicitly merged.

### Key Use Cases

**ETL Development Isolation**: Develop and test new ETL logic on a `dev` branch against real production data. If the logic is wrong, discard the branch. If it's correct, merge to main.

**CI/CD Pipelines**: Create a fresh branch for each pipeline run. Validate results before merging to main, roll back by discarding the branch if validation fails.

**A/B Data Testing**: Run two versions of a data transformation on separate branches and compare results before choosing which to merge.

**Zero-Cost Experimentation**: Branches are metadata-only (no data copy). Creating a branch from a 100TB table is instantaneous and costs nothing in storage until new data is written to the branch.

### Creating and Using Branches

```sql
-- Create a branch from the current snapshot
ALTER TABLE db.orders CREATE BRANCH dev_etl_v2;

-- Create from a specific snapshot
ALTER TABLE db.orders CREATE BRANCH testing AS OF VERSION 8027658604211071520;

-- Write to a branch (Spark: set session branch)
SET spark.wap.branch = dev_etl_v2;
INSERT INTO db.orders VALUES (1, 'test', 100.00, '2026-05-14');
-- This write only affects the dev_etl_v2 branch

-- Merge a branch (via Spark stored procedure)
CALL system.fast_forward('db.orders', 'main', 'dev_etl_v2');

-- Drop a branch
ALTER TABLE db.orders DROP BRANCH dev_etl_v2;
```

### Write-Audit-Publish (WAP) Pattern

The most common branch pattern in production is **Write-Audit-Publish (WAP)**:

1. **Write**: ETL job writes new data to a staging branch (e.g., `staging`).
2. **Audit**: Data quality checks run against the staging branch.
3. **Publish**: If checks pass, the staging branch is merged/fast-forwarded to `main`. If checks fail, the branch is discarded.

```python
# PyIceberg: WAP pattern
from pyiceberg.catalog import load_catalog

catalog = load_catalog(...)
table = catalog.load_table("db.orders")

# Create staging branch
table.manage_snapshots().create_branch("staging").commit()

# Write to staging (via Spark with branch setting)
# ... ETL job writes to staging branch ...

# Run data quality checks
staging_snap = table.snapshot_by_name("staging")
staging_data = table.scan(snapshot_id=staging_snap.snapshot_id).to_arrow()
assert staging_data.num_rows > 0, "No data written!"

# Publish: fast-forward main to staging
table.manage_snapshots().fast_forward("main", "staging").commit()

# Drop staging branch
table.manage_snapshots().remove_branch("staging").commit()
```

## Branches vs. Catalog-Level Branching (Nessie)

Iceberg table branches operate at the **single-table level** — each table has its own independent branches.

[Project Nessie](/iceberg/project-nessie/) provides **catalog-level branching** — branches that span all tables in the catalog simultaneously. A Nessie branch captures the state of every table in the catalog, enabling cross-table atomic workflows.

| Scope          | Tool             | Use Case                                    |
| -------------- | ---------------- | ------------------------------------------- |
| Single table   | Iceberg branches | Table-level ETL testing, WAP                |
| Entire catalog | Project Nessie   | Cross-table pipeline testing, catalog CI/CD |
