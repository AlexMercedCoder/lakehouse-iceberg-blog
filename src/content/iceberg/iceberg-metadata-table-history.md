---
term: "Iceberg Metadata Table History"
description: "A virtual system table in Apache Iceberg that exposes the historical timeline of committed snapshots, timestamps, and lineage paths."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-parent-snapshot-id"
  - "iceberg-metadata-table-snapshots"
keywords:
  - iceberg history table
  - system metadata history
  - table snapshot lineage
lastUpdated: 2026-05-29
---

## Iceberg Metadata Table History

The **Iceberg Metadata Table History** is a virtual system table exposed by Apache Iceberg query engines. It provides a read-only view of the chronological evolution of the table's state, tracking when snapshots were committed, their unique identifiers, and their relationship to preceding table states. Data engineers query this table to audit modifications and retrieve target snapshot IDs for time travel analyses.

### Querying the History Table

To inspect the history of an Iceberg table, query engines append the `.history` suffix to the table name:

```sql
/* Query the virtual history metadata table in Spark SQL */
SELECT made_current_at, snapshot_id, parent_id, is_current_ancestor
FROM prod.db.sales_table.history;
```

### Table Schema and Fields

The history table returns the following schema:

- **`made_current_at`**: A timestamp indicating when the snapshot was set as the current table state.
- **`snapshot_id`**: The long identifier matching the committed snapshot.
- **`parent_id`**: The ID of the preceding snapshot. A value of `null` indicates the initial commit.
- **`is_current_ancestor`**: A boolean flag indicating if the snapshot is an ancestor of the current active snapshot. This distinguishes active production commits from unmerged experimental branches.

Querying this history enables engineers to inspect the exact progression of data loads, identify when corrupt writes occurred, and locate snapshot points for rollback procedures.
