---
term: "Dremio Raw Reflections"
description: "Dremio Raw Reflections are pre-computed data layouts that preserve raw, row-level columns from a dataset, optimized with custom sorting, partitioning, and distribution settings to accelerate raw scans, selective filters, and complex joins."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-reflections"
  - "dremio-aggregation-reflections"
  - "dremio-data-reflections-matching"
  - "dremio-virtual-datasets-vds"
keywords:
  - dremio raw reflections
  - raw reflections
  - query acceleration raw data
  - scan acceleration dremio
  - dremio partition reflection
lastUpdated: 2026-05-29
---

## Dremio Raw Reflections

**Dremio Raw Reflections** are pre-computed materializations that store row-level, granular data from a physical or virtual dataset. Unlike Aggregation Reflections, which group and summarize fields, Raw Reflections preserve the original structure of individual rows. They act as optimized, physical copies of the source data, reorganizing column layouts, sorting keys, and partitioning boundaries to minimize resource usage during query planning and execution.

When user queries request specific detailed records, perform lookups, run complex multi-table joins, or apply selective filter predicates, the Dremio query planner automatically redirects the scan phase to use the Raw Reflection files instead of reading the raw source tables.

## Configurations and Optimizations

To maximize the performance benefits of Raw Reflections, administrators can configure three database design parameters:

- **Display Columns**: The specific subset of columns from the original dataset to include in the reflection. Excluding unnecessary high-cardinality fields (such as long raw string fields or metadata logs) keeps the materialization compact.
- **Sort Columns**: The fields used to sort the data rows within the Parquet files. Sorting organizes identical values into contiguous blocks, enabling Dremio's Parquet reader to perform highly effective data skipping using column min/max block statistics.
- **Partition Columns**: The fields used to divide the data files into separate folders. Partitioning restricts the scan path, enabling Dremio to skip entire directories when queries filter on the partition key.

## Acceleration Use Cases

Raw Reflections are highly effective for specific query patterns:

1.  **Selective Filters**: Queries containing `WHERE` clauses filtering on sorted or partitioned columns (for example, looking up orders by a specific ID or date range).
2.  **Complex Joins**: Queries combining multiple large tables. By creating Raw Reflections on the tables with identical partition and distribution settings, Dremio can execute local co-segmented joins, eliminating expensive network shuffles.
3.  **BI Tool Dashboards**: Reports that allow users to drill down from high-level summaries into detailed transaction records.
4.  **Data Extraction**: Large-scale data exports and ETL pipelines that need to read massive record sets with minimal latency.

## Incremental vs. Full Refreshes

Because Raw Reflections store row-level records, keeping them synchronized with source changes is vital. Dremio supports two refresh methods:

- **Full Refresh**: Dremio drops the existing reflection files and recalculates the entire dataset from scratch. This is suitable for smaller tables or source systems without reliable change indicators.
- **Incremental Refresh**: Dremio appends only new or updated data rows to the reflection. For file-based sources like Apache Iceberg, Dremio utilizes Iceberg snapshots and sequence numbers to identify new files. For relational databases, a monotonic refresh key (such as an auto-incrementing ID or timestamp column) must be defined.
