---
term: "Write-Audit-Publish (WAP) Pattern"
description: "The Write-Audit-Publish (WAP) pattern is a data pipeline quality assurance workflow using Apache Iceberg branches to write new data to an isolated staging branch, validate it with automated data quality checks, then publish it to the main branch only if validation passes."
category: "Patterns & Architecture"
relatedTerms:
  - "iceberg-branching-tagging"
  - "iceberg-snapshot"
  - "iceberg-acid-transactions"
  - "spark-apache-iceberg"
  - "project-nessie"
keywords:
  - write audit publish pattern
  - wap iceberg
  - iceberg staging branch
  - iceberg data quality pipeline
  - iceberg etl validation
lastUpdated: 2026-05-14
---

## Write-Audit-Publish (WAP) Pattern with Apache Iceberg

The **Write-Audit-Publish (WAP)** pattern is a data pipeline quality assurance workflow that uses Iceberg's branching capabilities to enforce a three-stage commit process:

1. **Write**: New data is written to an isolated Iceberg branch (the "staging" or "audit" branch): invisible to production consumers.
2. **Audit**: Automated data quality checks run against the staging branch to validate the new data.
3. **Publish**: If all checks pass, the staging branch is merged/fast-forwarded to `main`, making the data visible to production. If checks fail, the branch is discarded without affecting production.

WAP eliminates a fundamental risk in data pipelines: bad data reaching production consumers. Without WAP, a pipeline that writes corrupted data to the main branch immediately breaks dashboards, reports, and AI agents.

## The WAP Problem Without Iceberg

Traditional WAP implementations require:

- A staging database/table (completely separate from production).
- ETL to copy validated data from staging to production.
- A swap operation that involves downtime or reader inconsistency.

Iceberg's branching makes WAP **zero-copy and atomic**:

- The staging branch shares data files with `main`: no data duplication.
- The merge operation (fast-forward) is a metadata-only operation: instantaneous.
- Readers see a consistent snapshot at all times: no downtime, no partial states.

## WAP Implementation with Iceberg Branches

### Step 1: Create a Staging Branch

```sql
-- Create a staging branch from the current main snapshot
ALTER TABLE db.orders CREATE BRANCH wap_staging;
```

Or in Python:

```python
table.manage_snapshots().create_branch("wap_staging").commit()
```

### Step 2: Write to the Staging Branch

```python
# Spark: write only to the staging branch
spark.conf.set("spark.wap.branch", "wap_staging")

# All subsequent writes go to wap_staging, not main
spark.sql("""
    INSERT INTO db.orders
    SELECT * FROM staging.raw_orders WHERE batch_date = '2026-05-14'
""")
```

### Step 3: Audit (Data Quality Checks)

```python
# Read from staging branch for validation
spark.conf.set("spark.wap.branch", "wap_staging")

quality_checks = [
    # No nulls in required fields
    spark.sql("SELECT COUNT(*) FROM db.orders WHERE order_id IS NULL").collect()[0][0] == 0,
    # No future order dates
    spark.sql("SELECT COUNT(*) FROM db.orders WHERE order_date > CURRENT_DATE()").collect()[0][0] == 0,
    # Revenue is positive
    spark.sql("SELECT COUNT(*) FROM db.orders WHERE total < 0").collect()[0][0] == 0,
    # Row count increased from last snapshot
    spark.sql("SELECT COUNT(*) FROM db.orders").collect()[0][0] > 1000,
]

all_passed = all(quality_checks)
```

### Step 4: Publish or Discard

```python
if all_passed:
    # Publish: fast-forward main to the staging snapshot
    table.manage_snapshots() \
        .fast_forward("main", "wap_staging") \
        .commit()
    print("Data quality checks passed. Published to main.")
else:
    # Discard: drop the staging branch without affecting main
    table.manage_snapshots() \
        .remove_branch("wap_staging") \
        .commit()
    raise ValueError("Data quality checks failed. Staging branch discarded.")
```

## WAP in a Full Airflow Pipeline

```python
from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator

with DAG("orders_wap_pipeline", schedule="@daily") as dag:

    create_branch = PythonOperator(
        task_id="create_wap_branch",
        python_callable=lambda: table.manage_snapshots()
            .create_branch("wap_staging").commit()
    )

    load_data = PythonOperator(
        task_id="load_to_staging_branch",
        python_callable=run_etl_to_staging_branch
    )

    audit_data = BranchPythonOperator(
        task_id="audit_data",
        python_callable=run_quality_checks,  # returns 'publish' or 'discard'
    )

    publish = PythonOperator(
        task_id="publish",
        python_callable=fast_forward_to_main
    )

    discard = PythonOperator(
        task_id="discard",
        python_callable=drop_staging_branch
    )

    create_branch >> load_data >> audit_data >> [publish, discard]
```

## WAP Benefits

| Benefit                          | Description                                                             |
| -------------------------------- | ----------------------------------------------------------------------- |
| Zero-copy staging                | Staging branch shares files with main: no data duplication             |
| Atomic publish                   | Fast-forward is instantaneous metadata operation                        |
| Safe rollback                    | Discard branch without affecting production consumers                   |
| Full Iceberg features on staging | Time travel, schema inspection, row counts: all work on staging branch |
| Parallel pipeline testing        | Multiple branches can be validated simultaneously                       |

## WAP vs. Catalog-Level Branching (Nessie)

Iceberg WAP operates at the **table level**: each table has its own staging branch. Project Nessie provides **catalog-level WAP**: a single branch that spans all tables in the catalog, enabling cross-table atomic staging and publishing. For pipelines that update multiple tables in lockstep, Nessie's catalog-level branches provide stronger consistency guarantees.
