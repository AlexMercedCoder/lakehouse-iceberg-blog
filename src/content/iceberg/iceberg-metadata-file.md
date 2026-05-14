---
term: "Iceberg Metadata File"
description: "The Iceberg metadata file (metadata.json) is the top-level entry point for an Iceberg table, recording the full history of schemas, partition specs, snapshots, sort orders, and a pointer to the current table state."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-manifest-list"
  - "iceberg-manifest-file"
  - "iceberg-table-format"
  - "iceberg-catalog"
keywords:
  - iceberg metadata file
  - iceberg metadata.json
  - iceberg table metadata
  - iceberg metadata layer
lastUpdated: 2026-05-14
---

## Iceberg Metadata File

The **Iceberg metadata file** (commonly referred to as `metadata.json`) is the root entry point of every Iceberg table. It is a JSON file stored in object storage that contains the complete structural history of the table: all schemas, all partition specs, all sort orders, all past snapshots, and a pointer to the current snapshot.

The catalog's only job is to track the location of the **current** metadata file for each table. Everything else about the table's structure and history is encoded in this file and the metadata files it references.

## Structure of the Metadata File

A metadata file contains the following key sections:

```json
{
  "format-version": 2,
  "table-uuid": "3e1a56c7-...",
  "location": "s3://bucket/warehouse/db/orders",
  "last-sequence-number": 42,
  "last-updated-ms": 1715700000000,
  "last-column-id": 7,
  "current-schema-id": 2,
  "schemas": [ ... ],           // full history of all schemas
  "default-spec-id": 1,
  "partition-specs": [ ... ],   // full history of partition specs
  "default-sort-order-id": 1,
  "sort-orders": [ ... ],       // full history of sort orders
  "current-snapshot-id": 8027658604211071520,
  "snapshots": [ ... ],         // list of all retained snapshots
  "snapshot-log": [ ... ],      // chronological log of snapshot commits
  "metadata-log": [ ... ]       // history of prior metadata file locations
}
```

### Key Sections Explained

**`schemas`**: An array of all schema versions the table has ever had. Each schema has a `schema-id` and lists all columns with their permanent column IDs, names, and types. Schema evolution creates new entries here without removing old ones.

**`partition-specs`**: An array of all partition specifications — current and historical. Each spec maps source columns to partition transforms. Partition evolution adds new specs here without invalidating old data.

**`snapshots`**: The full list of retained (non-expired) snapshots. Each entry includes the snapshot ID, timestamp, operation type, summary statistics, and the path to the manifest list file. This list grows with every write and shrinks when `expire_snapshots` is run.

**`current-snapshot-id`**: Points to the most recently committed snapshot. This is the "current table state." Readers use this field to determine which snapshot to query.

**`metadata-log`**: A history of previous metadata file locations. This enables tools to traverse the table's metadata history even before the current `metadata.json`.

## The Metadata Commit Protocol

Every write to an Iceberg table produces a new metadata file:

1. Writer creates data files and a new snapshot.
2. Writer reads the current metadata file.
3. Writer creates a **new metadata file** that is identical to the old one, but with the new snapshot added and `current-snapshot-id` updated.
4. Writer atomically updates the catalog's pointer from the old metadata file path to the new one.

Metadata files are **versioned sequentially** (e.g., `metadata/v1.metadata.json`, `metadata/v2.metadata.json`, ...). Old metadata files are not deleted immediately — they become part of the `metadata-log` and are cleaned up by maintenance routines.

## Why the Metadata File Is Separate from the Catalog

This separation is intentional and powerful. It means:

- **Any storage-accessible engine can traverse a table's full history** from the metadata file alone, without needing catalog connectivity.
- **Catalog migrations** (e.g., moving from Hive Metastore to Apache Polaris) require only updating the catalog pointer — the table metadata in object storage is unchanged.
- **Cross-cloud table sharing** is possible by sharing the metadata file URL — a recipient with storage access can read the table without catalog credentials.

## Metadata File Size and Optimization

For very active tables (millions of snapshots over years), the metadata file can grow large because it embeds all snapshot summaries inline. The `metadata-previous-versions-max` table property limits how many old metadata files are retained in the `metadata-log`. Tables should be configured with appropriate `expire_snapshots` retention to prevent the snapshot list from growing unboundedly.

## Inspecting the Metadata File

Most Iceberg-compatible engines expose the metadata through inspection tables:

```sql
-- Spark: inspect all snapshots
SELECT * FROM db.orders.snapshots;

-- Spark: inspect all schemas
SELECT * FROM db.orders.history;

-- Dremio / Trino: similar metadata inspection
SELECT * FROM table(table_snapshot('db.orders'));
```
