---
term: "Iceberg File Content Type"
description: "A field in the manifest entry schema that indicates the type of data stored in a file, distinguishing between data files and row-level delete files."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-manifest-entry-schema"
  - "iceberg-delete-files"
  - "iceberg-merge-on-read"
keywords:
  - iceberg file content type
  - data file delete file
  - position deletes equality deletes
lastUpdated: 2026-05-29
---

## Iceberg File Content Type

The **Iceberg File Content Type** refers to the metadata classification used in manifest files to identify the role of each registered file. Defined inside the manifest entry schema as the `content` field, this parameter informs the query planner whether a file contains base table data or records representing deleted rows that must be applied at runtime.

### File Content Classifications

The Apache Iceberg specification maps the file content type using three integer codes:

- **`0` (DATA)**: The file stores standard table rows. This is the default type for data files generated during write operations.
- **`1` (POSITION_DELETES)**: The file stores row deletion markers by position. Each record in a position delete file contains a file path and a row index, indicating exactly which row in a data file has been deleted.
- **`2` (EQUALITY_DELETES)**: The file stores row deletion markers by value. Each record contains value markers for one or more columns (e.g. `customer_id = 98765`), indicating that any rows matching these values across the table must be treated as deleted.

### Query Execution and Planning

By storing the file content type inside the manifest metadata, query engines can plan scans efficiently:

- **Scan Optimization**: During query planning, the engine reads the manifest list and identifies manifests containing delete files (where `content` is `1` or `2`).
- **Read-Time Merging**: For tables configured with the Merge-on-Read (MoR) strategy, the engine reads the DATA files and overlays the corresponding POSITION_DELETES or EQUALITY_DELETES files, filtering out deleted rows in memory before returning results to the client.
- **Compaction Filtering**: When running table compaction, the engine uses these content markers to locate delete files and physically merge them with data files, writing out clean DATA files and purging the old delete files.
