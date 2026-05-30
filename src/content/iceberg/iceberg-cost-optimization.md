---
term: "Iceberg Cost Optimization"
description: "Cost optimization for Apache Iceberg lakehouses targets storage costs (snapshot expiration, compression, tiering), compute costs (compaction efficiency, query pruning), and catalog costs (managed service selection) to minimize total cost of ownership while maintaining performance."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-compaction"
  - "iceberg-expire-snapshots"
  - "iceberg-orphan-files"
  - "iceberg-parquet"
  - "iceberg-maintenance-scheduling"
keywords:
  - iceberg cost optimization
  - iceberg storage cost
  - iceberg compute cost
  - reduce iceberg costs
  - iceberg lakehouse cost
lastUpdated: 2026-05-14
---

## Iceberg Cost Optimization

A well-designed Apache Iceberg lakehouse can be dramatically more cost-efficient than traditional data warehouses: but poorly maintained Iceberg tables can accumulate significant unnecessary storage and compute costs. This guide covers the key cost optimization strategies across storage, compute, and catalog.

## Storage Cost Optimization

### 1. Snapshot Expiration (Most Impactful)

Old snapshots retain references to data files that are no longer in the current table state but cannot be garbage collected until the snapshot is expired. Long retention windows are the #1 source of runaway Iceberg storage costs.

```sql
-- Expire snapshots older than 7 days, keep at least 10
CALL system.expire_snapshots(
    table => 'analytics.orders',
    older_than => TIMESTAMP '{{ macros.ds_add(ds, -7) }} 00:00:00',
    retain_last => 10
);
```

**Sizing retention windows appropriately**:

- Time travel window: How far back do queries need to look? (Usually 7–30 days)
- Rollback safety window: How long before you'd detect a bad write and need to rollback? (Usually 24–72 hours)
- ML reproducibility: Use **named tags** for specific training snapshots instead of retaining all snapshots indefinitely.

```sql
-- Tag a snapshot for long-term ML reproducibility BEFORE expiring old snapshots
ALTER TABLE analytics.user_features CREATE TAG `ml_training_2026_q1`
AS OF VERSION 8027658604211071520;

-- Now expire aggressively; the tag protects this snapshot
CALL system.expire_snapshots(
    table => 'analytics.user_features',
    older_than => TIMESTAMP '2026-04-01 00:00:00',
    retain_last => 5
);
```

### 2. Orphan File Cleanup

Orphan files (data files not referenced by any active snapshot) accumulate from failed writes, aborted commits, and table schema changes. They add pure storage cost with zero query benefit.

```sql
-- Run periodically (weekly) with a 72-hour safety buffer
CALL system.remove_orphan_files(
    table => 'analytics.orders',
    older_than => TIMESTAMP '{{ macros.ds_add(ds, -3) }} 00:00:00'
);
```

### 3. Compression Optimization

Choosing the right compression codec reduces storage costs significantly:

| Codec            | Compression Ratio | Read Speed | Write Speed |
| ---------------- | ----------------- | ---------- | ----------- |
| `zstd` (level 3) | Excellent         | Fast       | Good        |
| `gzip`           | Best              | Slow       | Slow        |
| `snappy`         | Good              | Very fast  | Very fast   |
| `none`           | None (baseline)   | Fastest    | Fastest     |

For cold/archival Iceberg tables, `gzip` compression maximizes storage savings:

```sql
ALTER TABLE archive.historical_orders SET TBLPROPERTIES (
    'write.parquet.compression-codec' = 'gzip'
);
-- Next compaction will rewrite files with gzip, reducing size 20-40%
```

### 4. Storage Tiering

Move old Iceberg data files to cheaper storage tiers:

**AWS S3 Intelligent-Tiering**: Automatically moves objects to lower-cost tiers based on access patterns. Iceberg data files older than 30 days with no reads are automatically moved to cheaper storage.

**S3 Lifecycle rules** for Iceberg data:

```json
{
  "Rules": [
    {
      "Filter": { "Prefix": "warehouse/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 90, "StorageClass": "GLACIER_IR" }
      ],
      "Status": "Enabled"
    }
  ]
}
```

> Note: Apply lifecycle rules only to data files (`.parquet`, `.orc`), not to metadata files: metadata must remain accessible for query planning.

### 5. Column Selection (Projection Pushdown)

Ensure applications only request needed columns. Reading wide tables when only a few columns are needed wastes I/O and increases query costs:

```python
# ✅ Good: select only needed columns
table.scan(selected_fields=("order_id", "total", "order_date")).to_arrow()

# ❌ Bad: full table scan when only 3 columns needed
table.scan().to_arrow()
```

## Compute Cost Optimization

### 1. Effective Partition Pruning

If queries consistently scan the full table despite filters, partitioning is wrong or missing. Each full scan wastes compute proportional to table size.

```sql
-- Verify pruning is working (check query plan)
EXPLAIN SELECT * FROM analytics.orders WHERE order_date = '2026-05-14';
-- Look for: "FileScanTask: 3/5000 files" (good) vs "5000/5000" (bad)
```

### 2. Compaction ROI

Compaction itself costs compute: but it pays back in reduced scan costs:

```
Without compaction: 10,000 small files → query reads 500 files × 5MB = 2.5TB scanned
With compaction:      50 large files  → query reads   5 files × 250MB = 1.25GB scanned

Savings: 2,000× less I/O per query
```

Run compaction when the scan savings across expected query volume exceeds compaction cost.

### 3. Reflections (Dremio)

Dremio **Reflections** pre-materialize frequently-queried Iceberg aggregations:

```
Without reflection: Every dashboard query scans 5TB Iceberg table → $$$
With reflection:    Dashboard queries hit pre-computed 500MB materialization → $
```

Reflections eliminate the compute cost of repeated heavy scans for static dashboards.

### 4. Right-Size Compute Clusters

For batch ETL on Iceberg (Spark on EMR/Dataproc):

- Use **spot/preemptible instances** for compaction jobs (idempotent: safe to retry).
- Size clusters to complete within the maintenance window, then terminate.
- Use **EMR Serverless** or **Dataproc Serverless** for event-driven compaction: no idle cluster costs.

## Catalog Cost Optimization

| Catalog                      | Cost Model                        | Optimization                                               |
| ---------------------------- | --------------------------------- | ---------------------------------------------------------- |
| AWS Glue                     | Per API call ($0.01/10K requests) | Cache catalog operations, reduce ListTables frequency      |
| S3 Tables                    | Per operation + storage           | Batch operations, use auto-compaction to reduce file count |
| Apache Polaris (self-hosted) | Infrastructure cost               | Right-size Polaris server; scale horizontally for load     |
| Nessie                       | Infrastructure cost               | Single small instance for moderate workloads               |

## Cost Monitoring

```sql
-- Monitor storage growth (run weekly, alert on unexpected growth)
SELECT
    DATE(committed_at) as commit_date,
    SUM(CAST(summary['added-files-size'] AS BIGINT)) / 1024 / 1024 / 1024.0 as gb_added,
    SUM(CAST(summary['removed-files-size'] AS BIGINT)) / 1024 / 1024 / 1024.0 as gb_removed
FROM analytics.orders.snapshots
WHERE committed_at >= TIMESTAMP '2026-05-01 00:00:00'
GROUP BY 1
ORDER BY 1;
```

Alert if `gb_added` consistently exceeds `gb_removed` without corresponding business growth: it indicates orphan accumulation or insufficient snapshot expiration.
