---
term: "Read Amplification"
description: "A storage performance metric representing the ratio of physical data read from storage compared to the logical data requested by a query."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "write-amplification"
  - "space-amplification"
  - "iceberg-delete-files"
keywords:
  - read amplification
  - query scan performance
  - small files read amplification
  - merge on read amplification
lastUpdated: 2026-05-29
---

## Read Amplification

**Read Amplification** is a performance metric that measures how much extra data an engine must read from disk or object storage compared to the amount of data returned by a query. In data lakehouses, high read amplification is a major cause of query slowdowns and high cloud infrastructure costs.

### Sources of Read Amplification

In Apache Iceberg tables, read amplification typically stems from three sources:

1.  **The Small File Problem**: If a query filters on a single column, but the data is split across thousands of tiny files (e.g. 1 MB each), the engine must open, authenticate, and scan each file. The metadata headers and connection overhead end up consuming more I/O resources than the actual data.
2.  **Merge-on-Read (MoR) Table Structures**: When querying MoR tables, the engine cannot just read the base data files. It must also read separate positional or equality delete files and reconcile them in memory.
3.  **Coarse Indexing**: If file statistics (min/max values) are not collected or are too broad, the engine may scan entire files only to discard all rows during query filtering.

### Minimizing Read Amplification

Data engineers use several optimization strategies to reduce read amplification:

- **Compaction**: Running bin-packing or sort-based compaction regularly merges small files into standard larger files (such as 128 MB or 256 MB layouts).
- **Copy-on-Write (CoW)**: For tables with high read volumes, using CoW merge strategies applies deletes directly to data files at write time. This increases write latency but eliminates delete file overhead during reads.
- **Z-Ordering**: Clustering tables by frequently queried columns narrows the set of candidate files, enabling the engine to skip non-relevant data.
