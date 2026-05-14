---
term: "Iceberg Rewrite Manifests"
description: "Rewriting Iceberg manifests is a maintenance operation that consolidates many small manifest files into fewer, larger ones, reducing query planning overhead caused by excessive manifest file count accumulated from high-frequency streaming writes or many small append transactions."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-manifest-file"
  - "iceberg-manifest-list"
  - "iceberg-compaction"
  - "iceberg-small-file-problem"
  - "iceberg-streaming"
keywords:
  - iceberg rewrite manifests
  - iceberg manifest consolidation
  - iceberg query planning overhead
  - iceberg manifest optimization
  - iceberg manifest file count
lastUpdated: 2026-05-14
---

## Iceberg Rewrite Manifests

**Rewriting manifests** is an Iceberg maintenance operation that consolidates many small manifest files into fewer, larger manifests — reducing the metadata overhead incurred during query planning. While [compaction](/iceberg/iceberg-compaction/) addresses data file count, manifest rewriting addresses the **metadata file count** problem.

## Why Manifests Need Rewriting

Every Iceberg append transaction creates a new manifest file (or adds entries to existing ones). In streaming scenarios with frequent commits:

- A Flink job committing every 60 seconds creates 60 new manifest files per hour.
- Over 24 hours: 1,440 manifest files per partition.
- A table with 30 partitions: 43,200 manifest files per day.

During query planning, the engine must:

1. Read the manifest list (lists all manifest files for the current snapshot).
2. Open and parse each relevant manifest file to find data file entries.
3. Apply column statistics filtering to eliminate irrelevant data files.

When there are 43,200 manifest files, even with manifest-level partition pruning (eliminating manifests for irrelevant partitions), the I/O overhead of parsing hundreds or thousands of relevant manifest files adds significant query planning latency.

## The rewrite_manifests Procedure

```sql
-- Spark: rewrite manifests for a table
CALL system.rewrite_manifests('db.orders');

-- With options
CALL system.rewrite_manifests(
  table => 'db.orders',
  use_caching => true  -- cache manifests in memory during rewrite
);
```

The procedure:

1. Reads all existing manifest files for the current snapshot.
2. Re-organizes entries into fewer, larger manifest files (targeting a configurable max entries per manifest).
3. Commits a new snapshot that references the new consolidated manifests.
4. Marks the old manifest files for cleanup.

No data files are touched — this is purely a metadata reorganization.

## Target Manifest Size

The default target manifest size is configured via the table property:

```sql
ALTER TABLE db.orders SET TBLPROPERTIES (
    'write.manifest.target-size-bytes' = '8388608'  -- 8MB per manifest (default)
);
```

A larger target manifest size means:

- Fewer manifest files → less I/O for query planning.
- Each manifest file is larger → more memory needed to parse.

For most workloads, the 8MB default is appropriate. Reduce it for very memory-constrained environments.

## Manifest Rewrite vs. Compaction

These are related but distinct operations:

| Operation                         | What It Rewrites      | Why                           |
| --------------------------------- | --------------------- | ----------------------------- |
| `rewrite_data_files` (compaction) | Data files (Parquet)  | Too many small data files     |
| `rewrite_manifests`               | Manifest files (Avro) | Too many small manifest files |

Run both for complete table health. Often, running compaction (which creates new data files and new manifests for them) naturally reduces manifest file count. `rewrite_manifests` is specifically for tables where data file count is acceptable but manifest organization is poor.

## When to Run rewrite_manifests

Run manifest rewriting when:

- The manifest list contains thousands of manifest files.
- Query planning is measurably slow but query execution (once files are identified) is fast.
- After a bulk data load that created many small transactions.
- After enabling a new sort order or partition spec (old manifests organized differently from new writes).

```sql
-- Check manifest count
SELECT COUNT(*) as manifest_count
FROM db.orders.manifests;

-- If manifest_count > 1000 for a single table, consider rewrite_manifests
```

## Scheduling in Maintenance Pipelines

```python
# Airflow: comprehensive maintenance task
from airflow.operators.python import PythonOperator

def run_full_maintenance():
    spark.sql("CALL system.rewrite_data_files('db.orders')")    # compact data files
    spark.sql("CALL system.rewrite_manifests('db.orders')")      # consolidate manifests
    spark.sql("""
        CALL system.expire_snapshots(
            table => 'db.orders',
            older_than => TIMESTAMP '2026-04-14 00:00:00'
        )
    """)
    spark.sql("""
        CALL system.remove_orphan_files(
            table => 'db.orders',
            older_than => TIMESTAMP '2026-04-14 00:00:00'
        )
    """)

maintenance = PythonOperator(
    task_id="full_table_maintenance",
    python_callable=run_full_maintenance
)
```

## Order of Operations

When running all maintenance tasks, the recommended order is:

1. `rewrite_data_files` → compact data files (creates new manifests for new files).
2. `rewrite_manifests` → consolidate all manifests (including newly created ones).
3. `expire_snapshots` → remove old snapshots and their exclusive data files.
4. `remove_orphan_files` → clean up any orphaned files not covered by expiration.

This order ensures that compaction's new manifests are consolidated, and that expired snapshot cleanup removes the maximum number of files.
