---
term: "Iceberg Incremental Reads"
description: "Iceberg incremental reads enable processing only the new or changed data between two snapshots by using the snapshot diff API to identify added and deleted files, making efficient change-data-capture and incremental ETL pipelines without full table scans."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-cdc"
  - "iceberg-streaming"
  - "flink-apache-iceberg"
  - "spark-apache-iceberg"
keywords:
  - iceberg incremental reads
  - iceberg snapshot diff
  - iceberg incremental etl
  - iceberg new data since snapshot
  - iceberg change detection
lastUpdated: 2026-05-14
---

## Iceberg Incremental Reads

**Incremental reads** in Apache Iceberg enable processing only the data that has changed between two snapshots: rather than scanning the entire table every time. This is the foundation for efficient micro-batch ETL, change-data-capture pipelines, and lakehouse-to-lakehouse replication patterns where repeated full-table scans are prohibitively expensive.

## The Snapshot Diff API

Iceberg's snapshot model makes incremental reads straightforward. Because every write creates a new snapshot that records which files were added and which were deleted, the "diff" between two snapshots is precisely the list of changed files.

For an incremental read from snapshot A to snapshot B:

- **Added files**: New data files added in snapshots between A and B (rows that appeared).
- **Deleted files**: Files deleted between A and B (rows that disappeared: applies to Copy-on-Write overwrites).

Note: For Merge-on-Read tables, incremental reads based on file diffs are more complex because deletes are recorded as delete files rather than file removals.

## Incremental Reads with Apache Spark

### Using the Snapshot Incremental API

```python
# Spark: read only new rows appended since a specific snapshot
from_snapshot_id = 8027658604211071520
to_snapshot_id   = 9135729705312082631

incremental_df = spark.read \
    .format("iceberg") \
    .option("start-snapshot-id", from_snapshot_id) \
    .option("end-snapshot-id", to_snapshot_id) \
    .load("db.orders")

# Process only the new/changed rows
incremental_df.show()
```

### Streaming Incremental Read

```python
# Spark Streaming: continuously read new Iceberg snapshots
incremental_stream = spark.readStream \
    .format("iceberg") \
    .option("stream-from-timestamp", "1715700000000") \
    .load("db.events")

incremental_stream \
    .writeStream \
    .format("delta") \
    .outputMode("append") \
    .start("s3://downstream-bucket/events")
```

## Incremental Reads with PyIceberg

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog("my_catalog", **{...})
table = catalog.load_table("db.orders")

# Get the snapshot diff between two points
from_snapshot_id = 8027658604211071520
to_snapshot_id = table.current_snapshot().snapshot_id

# Find added files since from_snapshot
added_files = []
for snap_id in get_snapshots_between(table, from_snapshot_id, to_snapshot_id):
    snapshot = table.snapshot_by_id(snap_id)
    for manifest in snapshot.manifests(table.io()):
        for entry in manifest.entries():
            if entry.status == ManifestEntryStatus.ADDED:
                added_files.append(entry.data_file)

# Scan only the added files
scan = table.scan(snapshot_id=to_snapshot_id)
# Apply file filter to added_files only for true incremental read
```

## Incremental Read Patterns

### Pattern 1: Snapshot ID Watermark

Track the last processed snapshot ID and read new snapshots since that point:

```python
# Store last processed snapshot in a state store
last_processed_snapshot = state_store.get("orders_last_snapshot")

table = catalog.load_table("db.orders")
current_snapshot = table.current_snapshot().snapshot_id

if current_snapshot != last_processed_snapshot:
    # Process new data
    df = spark.read.format("iceberg") \
        .option("start-snapshot-id", last_processed_snapshot) \
        .option("end-snapshot-id", current_snapshot) \
        .load("db.orders")

    process_incremental(df)

    # Update watermark
    state_store.set("orders_last_snapshot", current_snapshot)
```

### Pattern 2: Timestamp Watermark

Use snapshot timestamps for time-based incrementals:

```python
from datetime import datetime, timedelta

one_hour_ago_ms = int((datetime.now() - timedelta(hours=1)).timestamp() * 1000)

# Find snapshot at or just before one_hour_ago_ms
from_snapshot = table.snapshot_as_of_timestamp(one_hour_ago_ms)
to_snapshot = table.current_snapshot()

incremental_df = spark.read.format("iceberg") \
    .option("start-snapshot-id", from_snapshot.snapshot_id) \
    .option("end-snapshot-id", to_snapshot.snapshot_id) \
    .load("db.orders")
```

## Incremental Read Limitations

- **Append-only**: Iceberg's snapshot diff API works cleanly for append-only tables. For tables with MoR updates and deletes, incremental reads based on file diffs may include both old and new row versions.
- **Copy-on-Write deletes**: File-level diffs capture which files were removed, but not which specific rows within those files were deleted.
- **Snapshot expiration**: Once a snapshot is expired, you cannot use it as the start point for an incremental read. Always keep a retention window that covers your incremental read latency.

For true row-level CDC over MoR tables, use [Iceberg CDC](/iceberg/iceberg-cdc/) patterns with Flink for precise row-level change tracking rather than file-level snapshot diffs.

## Use Cases

| Use Case                    | Incremental Read Approach                            |
| --------------------------- | ---------------------------------------------------- |
| Downstream ETL refresh      | Snapshot ID watermark → Spark incremental batch      |
| Lakehouse-to-lakehouse sync | Timestamp watermark → Spark Streaming                |
| ML feature freshness update | Snapshot diff → PyIceberg + Arrow                    |
| Audit log export            | All snapshots since last export → ordered processing |
| DWH loading                 | Nightly incremental from last-loaded snapshot        |
