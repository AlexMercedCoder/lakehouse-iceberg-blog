---
term: "Iceberg Maintenance Scheduling"
description: "Production Apache Iceberg maintenance requires scheduling compaction, snapshot expiration, orphan file cleanup, and manifest rewriting on regular intervals, orchestrated via tools like Apache Airflow, Prefect, or cloud-native schedulers to keep tables performant and storage efficient."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-compaction"
  - "iceberg-expire-snapshots"
  - "iceberg-orphan-files"
  - "iceberg-rewrite-manifests"
  - "iceberg-small-file-problem"
keywords:
  - iceberg maintenance scheduling
  - iceberg production maintenance
  - iceberg airflow compaction
  - iceberg automated maintenance
  - iceberg operations schedule
lastUpdated: 2026-05-14
---

## Iceberg Maintenance Scheduling

Running Apache Iceberg in production requires a proactive **maintenance schedule**: a set of regularly-run operations that keep tables performant, storage costs controlled, and metadata lean. Unlike traditional databases with built-in autovacuum, most Iceberg deployments require operators to explicitly schedule maintenance tasks.

The four core maintenance operations are:

1. **Compaction** (`rewrite_data_files`): Merge small files into optimal-size files.
2. **Manifest rewrite** (`rewrite_manifests`): Consolidate many small manifests.
3. **Snapshot expiration** (`expire_snapshots`): Remove old snapshots beyond retention.
4. **Orphan file cleanup** (`remove_orphan_files`): Delete files not referenced by any snapshot.

> **Exception**: Dremio Cloud provides automatic background optimization that handles compaction without manual scheduling.

## Maintenance Frequencies by Workload Type

| Table Type                     | Compaction       | Manifest Rewrite | Expire Snapshots | Orphan Files |
| ------------------------------ | ---------------- | ---------------- | ---------------- | ------------ |
| Streaming (60s commits)        | Hourly           | Daily            | Daily            | Weekly       |
| Micro-batch (5min)             | Every 4 hours    | Daily            | Daily            | Weekly       |
| Hourly batch                   | Every 6 hours    | Weekly           | Weekly           | Weekly       |
| Daily batch                    | After each load  | Weekly           | Weekly           | Monthly      |
| Read-heavy (infrequent writes) | After each write | Monthly          | Weekly           | Monthly      |

## Airflow DAG: Complete Maintenance Pipeline

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago
from datetime import timedelta
from pyspark.sql import SparkSession

TABLES = ["db.orders", "db.events", "db.customers"]

def get_spark():
    return SparkSession.builder \
        .config("spark.sql.extensions",
                "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
        .getOrCreate()

def compact_table(table: str, **context):
    spark = get_spark()
    spark.sql(f"""
        CALL system.rewrite_data_files(
            table => '{table}',
            options => map(
                'min-file-size-bytes', '67108864',
                'target-file-size-bytes', '268435456',
                'max-concurrent-file-group-rewrites', '5'
            )
        )
    """)

def rewrite_manifests(table: str, **context):
    spark = get_spark()
    spark.sql(f"CALL system.rewrite_manifests('{table}')")

def expire_snapshots(table: str, **context):
    spark = get_spark()
    retention_ts = "{{ macros.ds_add(ds, -7) }} 00:00:00"  # 7 days ago
    spark.sql(f"""
        CALL system.expire_snapshots(
            table => '{table}',
            older_than => TIMESTAMP '{retention_ts}',
            retain_last => 10
        )
    """)

def remove_orphans(table: str, **context):
    spark = get_spark()
    cutoff_ts = "{{ macros.ds_add(ds, -3) }} 00:00:00"  # 72 hour safety buffer
    spark.sql(f"""
        CALL system.remove_orphan_files(
            table => '{table}',
            older_than => TIMESTAMP '{cutoff_ts}'
        )
    """)

with DAG(
    "iceberg_maintenance",
    schedule_interval="0 2 * * *",  # Daily at 2 AM
    start_date=days_ago(1),
    catchup=False,
    tags=["iceberg", "maintenance"],
) as dag:

    for table in TABLES:
        safe_name = table.replace(".", "_")

        compact = PythonOperator(
            task_id=f"compact_{safe_name}",
            python_callable=compact_table,
            op_kwargs={"table": table}
        )

        rewrite = PythonOperator(
            task_id=f"rewrite_manifests_{safe_name}",
            python_callable=rewrite_manifests,
            op_kwargs={"table": table}
        )

        expire = PythonOperator(
            task_id=f"expire_snapshots_{safe_name}",
            python_callable=expire_snapshots,
            op_kwargs={"table": table}
        )

        orphans = PythonOperator(
            task_id=f"remove_orphans_{safe_name}",
            python_callable=remove_orphans,
            op_kwargs={"table": table}
        )

        # Sequential: compact → rewrite → expire → orphans
        compact >> rewrite >> expire >> orphans
```

## Spark Structured Streaming: Auto-Compaction

For streaming tables managed by Spark Structured Streaming, Iceberg supports in-stream compaction via the `rewriteAfterMerge` option:

```python
# Spark Streaming: automatically compact after each microbatch
query = df.writeStream \
    .format("iceberg") \
    .outputMode("append") \
    .option("path", "db.events") \
    .option("fanout-enabled", "true") \
    .option("merge-schema", "true") \
    .start()
```

For full post-commit compaction in streaming, configure a separate maintenance process that runs alongside the streaming job.

## Monitoring Maintenance Health

Set up alerts for maintenance failure indicators:

```sql
-- Average file size below threshold (compaction needed)
SELECT AVG(file_size_in_bytes) / 1024 / 1024 as avg_mb
FROM db.orders.files
WHERE status = 'EXISTING';
-- Alert if avg_mb < 64

-- Manifest file count (manifest rewrite needed)
SELECT COUNT(*) as manifest_count FROM db.orders.manifests;
-- Alert if manifest_count > 1000

-- Snapshot age (expiration needed)
SELECT MAX(DATEDIFF(NOW(), FROM_UNIXTIME(committed_at/1000))) as oldest_snapshot_days
FROM db.orders.snapshots;
-- Alert if oldest_snapshot_days > 30
```

## Dremio Auto-Optimization

Dremio Cloud and Enterprise include **automatic background table optimization**:

- Continuously monitors file sizes for all Iceberg tables managed via Dremio Open Catalog.
- Automatically triggers compaction when file sizes fall below threshold.
- No Airflow DAG needed for tables managed through Dremio.
- Snapshot expiration can be configured via table properties.

For teams using Dremio as their primary lakehouse platform, automatic optimization eliminates the operational burden of manual maintenance scheduling.
