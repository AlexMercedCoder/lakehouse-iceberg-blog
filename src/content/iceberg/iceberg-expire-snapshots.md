---
term: "Expire Snapshots in Apache Iceberg"
description: "Expiring snapshots in Apache Iceberg is the maintenance operation that removes old snapshot metadata (and optionally their orphaned data files) beyond a retention threshold, controlling storage costs while preserving a configurable window of time travel capability."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-time-travel"
  - "iceberg-compaction"
  - "iceberg-orphan-files"
  - "iceberg-data-files"
keywords:
  - iceberg expire snapshots
  - iceberg snapshot retention
  - iceberg cleanup snapshots
  - iceberg maintenance
  - iceberg storage cost
lastUpdated: 2026-05-14
---

## Expire Snapshots in Apache Iceberg

**Expiring snapshots** is a critical Iceberg maintenance operation that removes old snapshot entries from the table metadata and (optionally) physically deletes data files that are no longer referenced by any retained snapshot. Without regular snapshot expiration, Iceberg tables accumulate indefinitely growing metadata and orphaned data files, increasing both storage costs and metadata processing overhead.

## Why Snapshots Accumulate

Every write to an Iceberg table creates a new snapshot. A table with hourly batch loads creates 24 snapshots per day, 168 per week, 8,760 per year. The table metadata file embeds the summary of every retained snapshot — causing it to grow with each commit.

In addition, because Iceberg never modifies data files in place, old snapshots continue to reference data files that are no longer part of the current table state. These files are not physically deleted until snapshot expiration explicitly removes the last snapshot referencing them.

## The Expire Snapshots Operation

The expiration operation:

1. Removes snapshot entries from the table metadata that are older than the specified retention threshold.
2. Identifies data files that are no longer referenced by any remaining snapshot.
3. Physically deletes those orphaned data files from object storage.

After expiration:

- The table metadata file is smaller (fewer snapshot entries).
- Time travel to expired snapshots is no longer possible.
- Storage costs decrease (orphaned data files deleted).

## SQL Syntax

### Apache Spark

```sql
-- Expire snapshots older than a timestamp
CALL system.expire_snapshots(
  table => 'db.orders',
  older_than => TIMESTAMP '2026-04-01 00:00:00',
  retain_last => 5  -- always retain at least the last 5 snapshots
);

-- Expire with dry-run mode (see what would be deleted without deleting)
CALL system.expire_snapshots(
  table => 'db.orders',
  older_than => TIMESTAMP '2026-04-01 00:00:00',
  dry_run => true
);
```

### PyIceberg (Python)

```python
from pyiceberg.catalog import load_catalog
from datetime import datetime, timedelta

catalog = load_catalog("my_catalog", **{...})
table = catalog.load_table("db.orders")

# Calculate cutoff: retain last 7 days
cutoff_ms = int((datetime.now() - timedelta(days=7)).timestamp() * 1000)

# Expire snapshots (PyIceberg manages the metadata update)
table.expire_snapshots().expire_older_than(cutoff_ms).commit()
```

## Table Properties for Automatic Expiration

Iceberg table properties can configure automatic snapshot retention for platforms that support it:

```sql
ALTER TABLE db.orders SET TBLPROPERTIES (
  'history.expire.max-snapshot-age-ms' = '604800000',  -- 7 days in ms
  'history.expire.min-snapshots-to-keep' = '10'        -- always keep 10
);
```

## Retain Last vs. Older Than

The two expiration parameters work together:

- **`older_than`**: Expire snapshots committed before this timestamp.
- **`retain_last`**: Even if a snapshot is older than `older_than`, always keep at least this many of the most recent snapshots.

The `retain_last` parameter prevents the table from becoming unrestorable if all recent snapshots are within the retention window.

## Recommended Retention Windows

| Use Case                 | Recommended Retention         |
| ------------------------ | ----------------------------- |
| Development/Testing      | 1–3 days                      |
| Production analytics     | 7–30 days                     |
| Compliance (audit trail) | 90–365 days                   |
| ML reproducibility       | Match model version lifecycle |

## Expiration and Time Travel

Once a snapshot is expired, **time travel to that snapshot is no longer possible**. This is the key operational tradeoff:

- More retention → more time travel capability → higher storage costs
- Less retention → limited time travel → lower storage costs

Teams should set retention based on:

- Compliance requirements (audit windows)
- Operational rollback needs (how far back you might need to roll back)
- ML reproducibility requirements (how long you need to reproduce model training datasets)

## Orphan File Cleanup

Expiring snapshots removes snapshot metadata and the data files they exclusively reference. But there's a related but separate concern: **orphan files** — data files that were written during a failed transaction (no snapshot ever committed for them) and therefore are not referenced by any snapshot.

These orphan files are never removed by `expire_snapshots`. A separate `remove_orphan_files` operation handles them:

```sql
CALL system.remove_orphan_files(
  table => 'db.orders',
  older_than => TIMESTAMP '2026-04-14 00:00:00'
);
```

A safe practice: wait at least 24–48 hours before removing orphan files to avoid deleting files from in-progress write transactions.
