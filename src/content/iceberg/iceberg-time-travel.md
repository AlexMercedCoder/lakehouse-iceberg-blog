---
term: "Time Travel in Apache Iceberg"
description: "Time travel in Apache Iceberg lets you query a table as it existed at any past snapshot or timestamp, enabling reproducible analytics, auditing, rollback, and incremental processing across the full snapshot history."
category: "Core Concepts"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-acid-transactions"
  - "iceberg-expire-snapshots"
  - "iceberg-branching-tagging"
  - "what-is-apache-iceberg"
keywords:
  - iceberg time travel
  - apache iceberg query historical data
  - iceberg as of snapshot
  - iceberg rollback
  - iceberg audit
lastUpdated: 2026-05-14
---

## Time Travel in Apache Iceberg

**Time travel** is one of Apache Iceberg's most powerful and distinguishing features. It allows you to query an Iceberg table as it existed at any point in its history: by timestamp or by snapshot ID, without any special setup, data duplication, or separate audit tables.

Every write to an Iceberg table produces a new, immutable **snapshot**. Because Iceberg never modifies data files in place and never deletes snapshots until explicitly told to, the complete history of the table is always accessible through these snapshots.

## How Time Travel Works

Iceberg's time travel is a natural consequence of its architecture. Each snapshot is a complete, self-consistent view of the table at a point in time:

- Each snapshot has a unique `snapshot-id` (a long integer).
- Each snapshot records the timestamp when it was committed.
- Each snapshot references a **manifest list** that lists all data files that make up the table at that point.
- Snapshots form a chain: each snapshot records the ID of its parent snapshot, creating a complete lineage graph.

To time-travel query, an engine simply reads an older snapshot instead of the current one: no special storage or infrastructure is required.

## SQL Syntax

The exact syntax varies by query engine, but all major Iceberg-compatible engines support time travel:

### By Timestamp

```sql
-- Spark
SELECT * FROM orders TIMESTAMP AS OF '2026-01-01 00:00:00';

-- Dremio / Trino
SELECT * FROM orders AT TIMESTAMP '2026-01-01 00:00:00';
```

### By Snapshot ID

```sql
-- Spark
SELECT * FROM orders VERSION AS OF 8027658604211071520;

-- Dremio / Trino
SELECT * FROM orders AT SNAPSHOT '8027658604211071520';
```

### Using PyIceberg (Python)

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog("my_catalog")
table = catalog.load_table("db.orders")

# Load a specific snapshot
snapshot = table.snapshot_by_id(8027658604211071520)
scan = table.scan(snapshot_id=snapshot.snapshot_id)
df = scan.to_arrow().to_pandas()
```

## Key Use Cases

### 1. Reproducible Analytics and ML

ML models trained on a specific dataset snapshot can be reproduced exactly, even after the table has evolved. Reference the snapshot ID used during training and the exact same data is accessible indefinitely (until the snapshot is expired).

### 2. Auditing and Compliance

Regulatory requirements often mandate the ability to show what data existed at a specific point. Iceberg time travel provides this without separate audit tables.

### 3. Debugging and Root Cause Analysis

When an anomaly is detected in a dashboard, analysts can query the table as of yesterday to isolate when the change occurred.

### 4. Rollback

If a bad write corrupts a table, you can roll the table back to a known-good snapshot:

```sql
-- Spark: call the rollback procedure
CALL system.rollback_to_snapshot('db.orders', 8027658604211071520);
```

The rollback simply updates the current snapshot pointer in the catalog: no data files are modified.

### 5. Incremental Processing

Streaming frameworks use time travel to process only new data since the last checkpoint:

```python
# Get the diff between two snapshots
current_snapshot_id = table.current_snapshot().snapshot_id
added_files = table.inspect.files_added_between(prev_snapshot_id, current_snapshot_id)
```

## Managing Snapshot History

Snapshots accumulate indefinitely unless explicitly removed. The **expire snapshots** operation removes snapshot metadata (and orphaned data files) older than a retention threshold:

```sql
CALL system.expire_snapshots('db.orders', TIMESTAMP '2026-04-01 00:00:00');
```

Once a snapshot is expired, time travel to that snapshot is no longer possible. This is why configuring a retention policy is a critical operational decision: balance storage costs against time travel requirements.

## Branching and Tagging (Advanced)

For advanced use cases, Iceberg Spec v2 introduced **table branches and tags**:

- **Tags** are named, permanent pointers to a specific snapshot. Perfect for marking release versions or audit checkpoints.
- **Branches** are named, mutable snapshot chains, enabling isolated development, ETL testing, or CI pipelines without affecting the main table.

```sql
-- Create a tag for end-of-quarter audit
ALTER TABLE orders CREATE TAG eoy_2025 AS OF VERSION 8027658604211071520;

-- Query the tagged snapshot
SELECT * FROM orders FOR VERSION AS OF 'eoy_2025';
```

See [Table Branching and Tagging](/iceberg/iceberg-branching-tagging/) for a deep dive.
