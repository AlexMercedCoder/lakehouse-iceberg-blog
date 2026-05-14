---
term: "Iceberg Table Compaction"
description: "Iceberg compaction is the maintenance process of merging small data files into optimally sized files, applying pending delete files, and rewriting manifests to maintain query performance and reduce metadata overhead over time."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-small-file-problem"
  - "iceberg-delete-files"
  - "iceberg-data-files"
  - "iceberg-snapshot"
  - "iceberg-clustering"
  - "iceberg-expire-snapshots"
keywords:
  - iceberg compaction
  - iceberg table optimization
  - iceberg small file compaction
  - iceberg rewrite data files
  - iceberg maintenance
lastUpdated: 2026-05-14
---

## Iceberg Table Compaction

**Compaction** is the most critical ongoing maintenance operation for Apache Iceberg tables. Over time, high-frequency streaming writes and micro-batch jobs create many small data files, while `UPDATE` and `DELETE` operations accumulate delete files. Without compaction, query performance degrades and storage costs increase.

Compaction is the process of:

1. **Rewriting small data files** into optimally sized files (typically 128MB–512MB).
2. **Applying accumulated delete files** into the rewritten data files, producing clean files with no pending deletes.
3. **Rewriting manifests** to reduce manifest file count and metadata overhead.

After compaction, the same data exists in fewer, larger, cleaner files — dramatically improving both query performance and metadata efficiency.

## Why Compaction is Necessary

### The Small File Problem

Every Iceberg write transaction produces at least one new data file. Streaming pipelines writing micro-batches every 30 seconds produce 2,880 files per day per partition. Even a moderately partitioned table accumulates tens of thousands of small files quickly.

Small files harm performance because:

- Each file requires an open/read-footer/close cycle
- Column statistics in small files are less selective for data skipping
- More manifest entries must be evaluated during query planning
- Object storage costs increase (per-request fees, per-object storage minimums)

### Delete File Accumulation

`UPDATE` and `DELETE` operations (in Merge-on-Read mode) write small delete files that are applied at read time. As delete files accumulate, every read must apply more and more deletes — a join-like operation on top of every scan. Without compaction, reads degrade proportionally with delete file count.

## Compaction Operations

### Data File Rewriting

The core compaction operation combines multiple small files into larger ones:

```sql
-- Spark: rewrite small data files
CALL system.rewrite_data_files(
  table => 'db.orders',
  strategy => 'sort',
  sort_order => 'zorder(customer_id, order_date)',
  options => map(
    'min-file-size-bytes', '67108864',   -- 64MB
    'max-file-size-bytes', '536870912',  -- 512MB
    'target-file-size-bytes', '268435456' -- 256MB target
  )
);
```

Options include:

- **`binpack` strategy**: Pack small files into target-sized files without sorting.
- **`sort` strategy**: Sort data during compaction (linear sort or Z-order) to improve column statistics selectivity.
- Partial rewrites: Only rewrite files below a minimum size threshold, leaving already-optimal files untouched.

### Manifest Rewriting

Compaction also includes rewriting manifests to reduce manifest count and update partition statistics:

```sql
-- Spark: rewrite manifests for reduced metadata overhead
CALL system.rewrite_manifests(
  table => 'db.orders',
  use_caching => true
);
```

### Delete File Application (Positional Delete Removal)

When compacting with the `sort` strategy, Iceberg applies all pending positional and equality delete files to the new data files, producing clean output with no pending deletes.

## Compaction in Dremio

Dremio provides automatic table optimization as part of its Agentic Lakehouse platform. Dremio's **OPTIMIZE TABLE** command handles compaction intelligently:

```sql
-- Dremio: optimize an Iceberg table
OPTIMIZE TABLE db.orders;

-- With options
OPTIMIZE TABLE db.orders
REWRITE DATA USING BIN_PACK
(TARGET_FILE_SIZE_MB = 256, MIN_FILE_SIZE_MB = 64, MAX_FILE_SIZE_MB = 512);
```

Dremio can also be configured for **automatic background optimization**, eliminating the need for manual maintenance schedules.

## Compaction Strategies

| Strategy | Description                      | When to Use                                    |
| -------- | -------------------------------- | ---------------------------------------------- |
| Bin-pack | Combine files to hit target size | General purpose, fastest                       |
| Sort     | Sort by columns + combine        | When query patterns filter on sortable columns |
| Z-Order  | Multi-column sort (Z-curve)      | Multi-column filter predicates                 |

## Scheduling Compaction

For production tables, compaction should run on a regular schedule. Common approaches:

- **Airflow DAG**: Schedule a Spark job that calls `rewrite_data_files` nightly.
- **Dremio auto-optimization**: Enable automatic background compaction in Dremio Cloud/Enterprise.
- **Flink pipeline**: Run continuous compaction as a Flink streaming job alongside the ingestion pipeline.

The right compaction frequency depends on write volume and query SLAs. Tables with very high write frequency may need hourly compaction; batch-loaded tables may only need daily or weekly compaction.
