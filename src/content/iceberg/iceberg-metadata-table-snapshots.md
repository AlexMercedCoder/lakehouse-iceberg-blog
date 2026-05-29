---
term: "Iceberg Metadata Table Snapshots"
description: "A virtual system table in Apache Iceberg that lists all active snapshots, exposing their creation times, parent IDs, operation types, and summaries."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-snapshot-summary"
  - "iceberg-metadata-table-history"
keywords:
  - iceberg snapshots table
  - system metadata snapshots
  - snapshot operation audit
lastUpdated: 2026-05-29
---

## Iceberg Metadata Table Snapshots

The **Iceberg Metadata Table Snapshots** is a virtual system metadata table exposed by query engines. It lists every active snapshot currently tracked in the table's metadata log. Unlike the history table, which tracks the chronological path of current states, the snapshots table includes all active snapshots (including branch tips and unmerged writes) along with detailed operation summaries and links to their manifest lists.

### Querying the Snapshots Table

To query the snapshots metadata, append the `.snapshots` suffix to the table name:

```sql
/* Query the virtual snapshots metadata table to audit write operations */
SELECT committed_at, snapshot_id, operation, summary
FROM prod.db.sales_table.snapshots;
```

### Table Schema and Fields

The snapshots table returns the following schema:

- **`committed_at`**: A timestamp indicating when the commit occurred.
- **`snapshot_id`**: The long identifier matching the snapshot.
- **`parent_id`**: The ID of the preceding snapshot.
- - **`operation`**: The type of operation that created the snapshot (e.g. `append`, `overwrite`, `delete`).
- **`manifest_list`**: The URI path pointing to the snapshot's Avro manifest list file.
- **`summary`**: A map of key-value properties detailing write metrics (e.g. added files count, record counts, and engine application IDs).

Data teams use this metadata to inspect table changes, calculate data growth rates, and audit modifications made by various ingestion pipelines.
