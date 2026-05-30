---
term: "Apache Airflow and Apache Iceberg"
description: "Apache Airflow is the most widely used workflow orchestration platform for Iceberg data pipelines, providing scheduling, dependency management, retry logic, and monitoring for Iceberg ETL, compaction, CDC, and maintenance jobs across distributed lakehouse architectures."
category: "Engines & Integrations"
relatedTerms:
  - "iceberg-maintenance-scheduling"
  - "iceberg-wap-pattern"
  - "iceberg-compaction"
  - "spark-apache-iceberg"
  - "iceberg-cdc"
keywords:
  - airflow iceberg
  - apache airflow iceberg
  - airflow iceberg pipeline
  - airflow iceberg dags
  - orchestrate iceberg jobs airflow
lastUpdated: 2026-05-14
---

## Apache Airflow and Apache Iceberg

**Apache Airflow** is the most widely used workflow orchestration platform: a Python-based framework for defining, scheduling, and monitoring data pipelines as Directed Acyclic Graphs (DAGs). In the Iceberg ecosystem, Airflow is the standard tool for orchestrating:

- ETL jobs that load data into Iceberg tables.
- Scheduled table maintenance (compaction, expiration, orphan cleanup).
- WAP (Write-Audit-Publish) quality pipelines.
- CDC pipeline coordination.
- Multi-step data transformation workflows (Bronze → Silver → Gold).

## How Airflow Works with Iceberg

Airflow itself doesn't interact with Iceberg directly: it orchestrates **compute jobs** (Spark, PyIceberg, EMR, Dremio API calls) that interact with Iceberg. Airflow handles scheduling, retry logic, dependency ordering, alerting, and monitoring.

## Iceberg ETL Pipeline DAG

```python
from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.utils.dates import days_ago
from datetime import timedelta

default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "email_on_failure": True,
    "email": ["data-alerts@company.com"],
}

with DAG(
    "iceberg_daily_etl",
    default_args=default_args,
    schedule_interval="@daily",
    start_date=days_ago(1),
    catchup=False,
    tags=["iceberg", "etl"],
) as dag:

    # Bronze: ingest raw data
    ingest_raw = SparkSubmitOperator(
        task_id="ingest_raw_orders",
        application="s3://jobs/ingest_raw.py",
        application_args=["--date", "{{ ds }}"],
        conf={
            "spark.sql.extensions": "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions",
            "spark.sql.catalog.polaris": "org.apache.iceberg.spark.SparkCatalog",
            "spark.sql.catalog.polaris.type": "rest",
            "spark.sql.catalog.polaris.uri": "https://my-polaris.example.com",
        }
    )

    # Silver: transform and clean
    transform_silver = SparkSubmitOperator(
        task_id="transform_silver_orders",
        application="s3://jobs/transform_silver.py",
        application_args=["--date", "{{ ds }}"]
    )

    # Gold: aggregate metrics
    aggregate_gold = SparkSubmitOperator(
        task_id="aggregate_gold_metrics",
        application="s3://jobs/aggregate_gold.py",
        application_args=["--date", "{{ ds }}"]
    )

    ingest_raw >> transform_silver >> aggregate_gold
```

## WAP Pipeline DAG

```python
from pyiceberg.catalog import load_catalog

def create_staging_branch(**context):
    catalog = load_catalog("polaris", **{"type": "rest", "uri": "..."})
    table = catalog.load_table("analytics.orders")
    table.manage_snapshots().create_branch("wap_{{ ds_nodash }}").commit()

def run_quality_checks(**context):
    catalog = load_catalog("polaris", **{"type": "rest", "uri": "..."})
    table = catalog.load_table("analytics.orders")

    issues = []
    # Run checks against the staging branch
    if has_nulls(table, branch="wap_{{ ds_nodash }}", column="order_id"):
        issues.append("Null order_ids found")
    if has_negatives(table, branch="wap_{{ ds_nodash }}", column="total"):
        issues.append("Negative totals found")

    if issues:
        context["ti"].xcom_push(key="quality_issues", value=issues)
        return "discard_branch"  # branch task id
    return "publish_to_main"

def publish_to_main(**context):
    catalog = load_catalog("polaris", **{"type": "rest", "uri": "..."})
    table = catalog.load_table("analytics.orders")
    table.manage_snapshots() \
        .fast_forward("main", "wap_{{ ds_nodash }}") \
        .commit()

def discard_branch(**context):
    issues = context["ti"].xcom_pull(key="quality_issues")
    raise ValueError(f"Data quality failed: {issues}")

with DAG("iceberg_wap_pipeline", schedule_interval="@daily", ...) as dag:

    create_branch = PythonOperator(task_id="create_staging_branch",
                                   python_callable=create_staging_branch)

    load_data = SparkSubmitOperator(task_id="load_to_staging", ...)

    check_quality = BranchPythonOperator(task_id="check_quality",
                                          python_callable=run_quality_checks)

    publish = PythonOperator(task_id="publish_to_main",
                             python_callable=publish_to_main)

    discard = PythonOperator(task_id="discard_branch",
                             python_callable=discard_branch)

    create_branch >> load_data >> check_quality >> [publish, discard]
```

## Maintenance Scheduling DAG

```python
with DAG(
    "iceberg_maintenance",
    schedule_interval="0 3 * * *",  # 3 AM daily
    start_date=days_ago(1),
    catchup=False,
) as dag:

    TABLES = ["analytics.orders", "analytics.events", "analytics.customers"]

    for table in TABLES:
        safe_name = table.replace(".", "_")

        compact = SparkSubmitOperator(
            task_id=f"compact_{safe_name}",
            application="s3://jobs/compact_table.py",
            application_args=["--table", table]
        )

        expire = SparkSubmitOperator(
            task_id=f"expire_{safe_name}",
            application="s3://jobs/expire_snapshots.py",
            application_args=["--table", table, "--retention-days", "7"]
        )

        compact >> expire
```

## Airflow Providers for Iceberg

**EMR Operator** (common for Iceberg on AWS):

```python
from airflow.providers.amazon.aws.operators.emr import EmrServerlessStartJobRunOperator

compact_emr = EmrServerlessStartJobRunOperator(
    task_id="compact_with_emr_serverless",
    application_id="{{ var.value.emr_serverless_app_id }}",
    execution_role_arn="{{ var.value.emr_role_arn }}",
    job_driver={
        "sparkSubmit": {
            "entryPoint": "s3://jobs/iceberg_compaction.py",
            "entryPointArguments": ["analytics.orders"],
        }
    }
)
```

**Dremio API Operator** (trigger Dremio SQL against Iceberg):

```python
from airflow.providers.http.operators.http import SimpleHttpOperator

trigger_dremio_refresh = SimpleHttpOperator(
    task_id="trigger_dremio_sql",
    http_conn_id="dremio_api",
    method="POST",
    endpoint="/api/v3/sql",
    data='{"sql": "REFRESH TABLE analytics.orders"}',
    headers={"Content-Type": "application/json"},
)
```

## Airflow + Iceberg Best Practices

1. **Use short-lived Spark sessions**: Submit one Spark job per task: don't share a SparkSession across tasks.
2. **Pass snapshot IDs via XCom**: Store the snapshot ID of each major load for downstream tasks to validate.
3. **Idempotent tasks**: Iceberg's ACID semantics make it possible to retry tasks without data duplication (when using `INSERT OVERWRITE` or `MERGE INTO`).
4. **SLA monitoring**: Set Airflow SLAs on critical Iceberg loads to alert when freshness SLAs are at risk.
5. **Sensor for dependencies**: Use Airflow Sensors to wait for upstream Iceberg table updates before triggering downstream transforms.
