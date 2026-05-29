---
term: "Iceberg Bin-Packing Compaction"
description: "A fast, non-sorting compaction strategy in Apache Iceberg that combines small data files into larger files to reduce read amplification."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-compaction"
  - "iceberg-sort-based-compaction"
  - "iceberg-z-order-compaction"
keywords:
  - binpack compaction
  - iceberg binpacking
  - rewrite data files binpack
lastUpdated: 2026-05-29
---

## Iceberg Bin-Packing Compaction

**Iceberg Bin-Packing Compaction** is the default optimization strategy used in Apache Iceberg to consolidate small data files. When tables are written to by streaming pipelines or small write batches, they accumulate many small files on disk. The bin-packing algorithm combines these small files into larger ones (matching target sizes like 512 MB) without sorting the rows or changing their physical order.

### Algorithm and Efficiency

The bin-packing algorithm groups files using a greedy approach:

1.  **Sizing Boundaries**: The system defines a minimum and maximum size threshold for files (e.g. min 100 MB, max 800 MB).
2.  **Identifying Candidates**: The optimizer scans manifests to find active files that fall below the minimum size.
3.  **Greedy Packing**: It packs these small candidate files into "bins" (representing target files) until the target size is reached.
4.  **Consolidated Writes**: The engine rewrites the contents of each bin into a single large file.

### When to Use Bin-Packing

Bin-packing is the fastest compaction strategy because it avoids the overhead of sorting rows:

- **Speed**: Since it does not sort the data, it uses less CPU and memory, making it inexpensive to run.
- **No Sort Order Requirements**: It is ideal for workloads where queries do not benefit from a specific sort key.
- **Frequent Execution**: Data teams can run bin-packing compactions frequently (e.g. hourly or daily) to keep the file count low, reserving sort-based compactions for off-peak hours.
