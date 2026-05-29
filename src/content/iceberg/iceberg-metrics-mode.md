---
term: "Iceberg Metrics Mode"
description: "A configuration property in Apache Iceberg that controls the depth of column-level statistics stored in manifest files to optimize query planning and manage metadata size."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-manifest-entry-schema"
  - "iceberg-data-skipping"
keywords:
  - iceberg metrics mode
  - write metadata metrics
  - column level statistics
lastUpdated: 2026-05-29
---

## Iceberg Metrics Mode

The **Iceberg Metrics Mode** is a setting that determines what level of statistical metadata is collected for columns when writing data files. These statistics (such as value counts, null counts, and minimum/maximum bounds) are stored in manifest entries and used by query engines for data skipping. Tuning the metrics mode allows administrators to strike a balance between query pruning efficiency and metadata storage size.

### Supported Metrics Modes

Iceberg supports four metrics modes:

- **`none`**: No metrics or bounds are collected for the column. Only basic file-level metadata is kept. This is useful for columns that are never filtered on (e.g. raw text descriptions or long remarks).
- **`counts`**: Only value counts, null counts, and NaN counts are collected. Minimum and maximum bounds are omitted.
- **`truncate(length)`**: Collects counts and upper/lower bounds. However, string or binary bounds are truncated to the specified character or byte length (e.g. `truncate(16)`). Truncation prevents very long string values from bloating the size of manifest files.
- **`full`**: Collects counts and the full, untruncated minimum and maximum values.

### Configuring Metrics Modes

Metrics modes are configured using table properties. You can define a default mode for the entire table or override the mode for specific columns:

```sql
/* Create a table with custom metrics configurations */
CREATE TABLE logs.web_events (
    event_id string,
    event_payload string,
    response_code int
)
USING iceberg
TBLPROPERTIES (
    /* Set the default mode for all columns to collect counts and truncated bounds */
    'write.metadata.metrics.default' = 'truncate(16)',
    /* Disable all metrics collection for the large payload text column */
    'write.metadata.metrics.column.event_payload' = 'none',
    /* Collect full bounds for response codes to ensure exact filtering */
    'write.metadata.metrics.column.response_code' = 'full'
);
```

### Balancing Metadata Size

For tables with hundreds of columns, collecting full metrics for every field can lead to severe manifest file bloat, increasing query planning time. By setting high-entropy fields (like UUIDs) or large text columns to `none` or `counts`, administrators keep manifest files small while retaining bounds on partition and join keys.
