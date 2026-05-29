---
term: "Iceberg Metadata Table Files"
description: "A virtual system table in Apache Iceberg that lists all active data and delete files, exposing their file paths, sizes, record counts, and column statistics."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-manifest-entry-schema"
  - "iceberg-metadata-table-snapshots"
keywords:
  - iceberg files table
  - system metadata files
  - file stats query
lastUpdated: 2026-05-29
---

## Iceberg Metadata Table Files

The **Iceberg Metadata Table Files** is a virtual system table exposed by query engines to describe the physical layout of a table. It lists all active data and delete files for the current table snapshot, exposing details like file paths, file sizes, column metrics, and min/max statistics. Querying this table allows data engineers to inspect file size distributions, identify small file issues, and verify metrics.

### Querying the Files Table

To inspect the physical file metadata, append the `.files` suffix to the table name:

```sql
/* Query the virtual files metadata table in Spark SQL */
SELECT file_path, file_format, record_count, file_size_in_bytes
FROM prod.db.sales_table.files;
```

### Table Schema and Fields

The files table returns the following schema:

- **`content`**: An integer indicating whether the file contains `0` (DATA), `1` (POSITION_DELETES), or `2` (EQUALITY_DELETES).
- **`file_path`**: The absolute storage location URI.
- **`file_format`**: The file format (e.g. `PARQUET`, `AVRO`, or `ORC`).
- **`record_count`**: The number of records stored in the file.
- **`file_size_in_bytes`**: The physical file size on disk.
- **`column_sizes`**: A map showing the storage footprint of each column.
- **`null_value_counts`**: A map tracking the number of null values per column.
- **`lower_bounds` / `upper_bounds`**: Maps of serialized minimum and maximum values per column.

Data teams use this metadata to calculate file size averages, identify partition distribution skews, and verify column-level statistics.
