---
term: "Write Amplification"
description: "A performance metric measuring the ratio of physical data bytes written to storage compared to the logical data bytes updated by a write transaction."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "read-amplification"
  - "space-amplification"
  - "iceberg-copy-on-write"
keywords:
  - write amplification
  - copy on write amplification
  - write performance
  - data compaction write
lastUpdated: 2026-05-29
---

## Write Amplification

**Write Amplification** is a metric that measures the amount of physical data written to storage relative to the size of the logical changes committed by a user or ETL job. In data lakehouse architectures, write amplification affects write throughput, ingestion latencies, and object storage costs.

### Ingestion Strategies and Amplification

In Apache Iceberg, write amplification is heavily influenced by the chosen write strategy:

#### 1. Copy-on-Write (CoW)

Under CoW, updating a single row requires rewriting the entire data file containing that row:

```
  Update 1 Row ──> [Rewrite 128 MB Data File] (High Write Amplification)
```

If a table has a target file size of 128 MB, updating a single record yields a write amplification factor of 128,000,000.

#### 2. Merge-on-Read (MoR)

MoR minimizes write amplification by writing updates or deletes to separate, small delete files:

```
  Update 1 Row ──> [Write 1 KB Position Delete File] (Low Write Amplification)
```

This keeps ingestion fast but shifts the read overhead to query time.

### Other Sources of Write Amplification

- **Compaction**: Consolidating files combines small files into larger ones, rewriting existing data. While essential to reduce read amplification, it increases write amplification.
- **Metadata Overhead**: Highly partitioned tables with numerous columns generate large manifest files and manifest lists during every commit.
- **Frequent Commits**: Running streaming ingestion pipelines that commit every few seconds creates a high volume of small metadata files, contributing to overall write amplification.
