---
term: "Iceberg Sort-Based Compaction"
description: "A compaction strategy in Apache Iceberg that combines small data files and sorts the records globally by specified columns to improve query data skipping."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-compaction"
  - "iceberg-bin-packing-compaction"
  - "iceberg-z-order-compaction"
keywords:
  - sort based compaction
  - iceberg sort compaction
  - global sort order compaction
lastUpdated: 2026-05-29
---

## Iceberg Sort-Based Compaction

**Iceberg Sort-Based Compaction** is a table optimization strategy that combines small data files while sorting the records globally by specified columns. Unlike bin-packing, which only merges files without reorganizing their rows, sort-based compaction restructures the data layout, grouping similar column values together within the resulting files. This layout enhances the effectiveness of min/max statistics for data skipping, speeding up range queries.

### How Sort Compaction Optimizes Queries

When query engines scan an Iceberg table, they read the upper and lower bounds of each column stored in the manifest entries. If a column contains randomly distributed values, every file's min/max range will overlap, forcing the engine to read every file.

Sort-based compaction resolves this overlap:

- **Narrow Bounds**: By sorting data by a target column (e.g. `customer_id`), each compacted file will contain a narrow range of IDs.
- **Enhanced Pruning**: A query like `WHERE customer_id = 500` can skip almost all data files, reading only the file whose min/max range contains `500`.

### Resource Trade-Offs

Because sorting requires a global shuffle of data across executors, sort-based compaction is resource-intensive:

- **High Compute Cost**: It consumes significant CPU, memory, and network resources to perform the shuffle.
- **Scheduling**: It is usually scheduled as a batch job run during off-peak hours, rather than as a continuous or hourly task.
- **Workload Target**: It is best suited for tables with high-volume query workloads that target specific filter columns (e.g. timestamps, region codes, or customer identifiers).
