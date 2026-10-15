---
term: "Iceberg Branching and Tagging"
metaTitle: "Iceberg Branches and Tags: Spark SQL and WAP Examples"
description: "Iceberg branches and tags are named snapshot references in table metadata. See the Spark SQL and PyIceberg syntax to create them and run write-audit-publish."
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
lastUpdated: 2026-10-15
---

## Iceberg Table Branching and Tagging

Iceberg branches and tags are named references to snapshots, stored in the `refs` map of the table metadata file. A tag pins one snapshot; a branch is a movable pointer that can take new commits. Spark SQL creates them with `ALTER TABLE ... CREATE TAG` and `CREATE BRANCH`.

Snapshot references are part of the Iceberg table spec and work on format v1, v2, and v3 tables. They enable Git-like workflows at the table level. These capabilities bring software engineering practices (feature branches, release tags, isolated testing) to data pipeline development.

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

-- Tag with explicit retention (keep this tag for 365 days)
ALTER TABLE db.orders CREATE TAG audit_2025 AS OF VERSION 8027658604211071520
RETAIN 365 DAYS;
```

### Querying a Tagged Snapshot

```sql
-- Spark: query as of a named tag
SELECT * FROM db.orders VERSION AS OF 'eoy_2025';

# PyIceberg: read the table at a tag
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

-- Write to a branch by name
INSERT INTO db.orders.branch_dev_etl_v2 VALUES (1, 'test', 100.00, '2026-05-14');
-- This write only affects the dev_etl_v2 branch

-- Or, with write.wap.enabled=true, route a session's writes to a branch
SET spark.wap.branch = dev_etl_v2;

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

# Create staging branch from the current main snapshot
main_id = table.current_snapshot().snapshot_id
table.manage_snapshots().create_branch(
    snapshot_id=main_id, branch_name="staging"
).commit()

# Write to staging (PyIceberg, or Spark with a branch target)
table.append(new_rows, branch="staging")

# Run data quality checks
staging_snap = table.snapshot_by_name("staging")
staging_data = table.scan(snapshot_id=staging_snap.snapshot_id).to_arrow()
assert staging_data.num_rows > 0, "No data written!"

# Publish: fast-forward main to staging, then drop the branch
with table.manage_snapshots() as ms:
    ms.fast_forward_branch("main", "staging")
    ms.remove_branch("staging")
```

## Branches vs. Catalog-Level Branching (Nessie)

Iceberg table branches operate at the **single-table level**: each table has its own independent branches.

[Project Nessie](/iceberg/project-nessie/) provides **catalog-level branching**: branches that span all tables in the catalog simultaneously. A Nessie branch captures the state of every table in the catalog, enabling cross-table atomic workflows.

| Scope          | Tool             | Use Case                                    |
| -------------- | ---------------- | ------------------------------------------- |
| Single table   | Iceberg branches | Table-level ETL testing, WAP                |
| Entire catalog | Project Nessie   | Cross-table pipeline testing, catalog CI/CD |
