---
term: "Split Planning Loops"
description: "The execution phase where query engine coordinators analyze table partition statistics to group data files into parallel execution splits."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "iceberg-metadata-table-files"
  - "dremio-sabot-engine"
keywords:
  - split planning
  - query planning loops
  - iceberg split planning
  - file splitting
lastUpdated: 2026-05-29
---

## Split Planning Loops

**Split Planning Loops** are the coordinator-level execution steps in analytical query engines (such as Dremio, Spark, or Trino) that determine how to distribute table scanning tasks across executor nodes. Prior to launching compute tasks, the engine must divide the targeted data files into logical slices (splits) that can be read in parallel.

### Split Planning in Apache Iceberg

In legacy formats, split planning requires listing directories on object storage to find files, which is slow. Iceberg eliminates directory listing by resolving splits entirely using metadata:

1.  **Select Manifests**: The query planner evaluates SQL WHERE clauses against partition summaries in the manifest list to identify which manifest files contain matching rows.
2.  **Filter Manifest Entries**: The planner reads the selected manifest files, filtering out data files that do not match query criteria using column-level min/max statistics.
3.  **Calculate Splits**: The planner groups the remaining active data files into splits. By default, a split matches a target block size (e.g. 128 MB or 256 MB). If a data file is 500 MB, the split planner divides it into multiple logical splits (e.g. 128 MB byte ranges) so multiple executors can read the file concurrently.
4.  **Task Assignment**: The coordinator assigns these splits to executor nodes, balancing the workload to prevent compute bottlenecks.

### Optimization Settings

Split planning performance is controlled using Iceberg table properties:

- `read.split.target-size`: The target size in bytes for data splits (default is 128 MB).
- `read.split.planning-lookback`: The number of files to evaluate when grouping small files into combined splits to reduce task overhead.
