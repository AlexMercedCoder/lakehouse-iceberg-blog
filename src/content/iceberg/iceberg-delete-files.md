---
term: "Iceberg Delete Files"
description: "Iceberg delete files record row-level deletions without rewriting data files, enabling efficient UPDATE, DELETE, and MERGE operations through two mechanisms: positional deletes (by file and row position) and equality deletes (by column value matching)."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-positional-deletes"
  - "iceberg-equality-deletes"
  - "iceberg-merge-on-read"
  - "iceberg-copy-on-write"
  - "iceberg-row-level-deletes"
  - "iceberg-data-files"
  - "iceberg-manifest-file"
keywords:
  - iceberg delete files
  - iceberg row level deletes
  - iceberg v2 deletes
  - iceberg positional delete
  - iceberg equality delete
lastUpdated: 2026-05-14
---

## Iceberg Delete Files

**Delete files** are a key feature of Apache Iceberg Spec v2, enabling row-level `DELETE`, `UPDATE`, and `MERGE` operations without rewriting entire data files. Instead of modifying existing (immutable) data files, Iceberg writes separate **delete files** that record which rows should be excluded during reads.

Delete files are the "Merge-on-Read" half of Iceberg's DML strategy — the alternative to Copy-on-Write, which rewrites affected data files entirely.

## Why Delete Files Exist

Object storage (S3, ADLS, GCS) does not support in-place updates to individual bytes within a file. Iceberg's data files are immutable. So how do you delete a row?

Before Spec v2, the only option was to rewrite the entire data file, omitting the deleted rows (**Copy-on-Write**). This is expensive for workloads with frequent targeted deletes (CDC, GDPR, corrections) because a single row deletion requires rewriting a 512MB Parquet file.

Iceberg Spec v2's answer: write a small **delete file** that records which rows to exclude, and merge the deletes at read time. This makes writes very fast at the cost of slightly more work during reads (accumulating deletes must be applied).

## Two Types of Delete Files

### Positional Delete Files

A **positional delete file** records specific `(file_path, position)` pairs — the exact file and row index of deleted rows.

```
file_path                              pos
s3://bucket/data/0001.parquet          42
s3://bucket/data/0001.parquet          10019
s3://bucket/data/0002.parquet          7
```

During reads, the engine checks whether the current row's `(file_path, position)` pair appears in the applicable positional delete files. If it does, the row is skipped.

**Best for**: Updates that affect specific, known rows (e.g., CDC deletes by primary key where you know the affected row's position).

**Performance**: Positional deletes require knowing the position within a file, so they are typically written by engines that process the data file during the write (e.g., Flink, Spark with streaming deletes).

### Equality Delete Files

An **equality delete file** records column values that identify deleted rows — essentially a set of filter conditions.

```
id      event_date
12345   2026-01-15
99876   2026-03-22
```

During reads, the engine applies the equality delete conditions and excludes matching rows.

**Best for**: Business-logic deletes based on identifier values (e.g., "delete all rows for customer_id = 12345") — typical for GDPR erasure requests, corrections, and CDC based on primary keys.

**Performance**: Equality deletes can be expensive because they must be applied across all relevant data files (a join-like operation). The engine must check every row against every applicable equality delete file.

## Delete File Lifecycle

Delete files accumulate over time. Each new `DELETE` or `UPDATE` transaction adds more delete files. As delete files grow:

1. Read performance degrades because more delete files must be applied during scans.
2. The overhead of apply-delete-at-read-time increases.

The solution is **compaction** — specifically, data file rewriting that incorporates accumulated deletes and produces clean data files. After compaction, the delete files are removed from the table's manifest (they are no longer needed because their deletes are baked into the new data files).

## Copy-on-Write vs. Merge-on-Read

Delete files are the mechanism of the **Merge-on-Read** write strategy:

| Strategy      | Delete Handling              | Write Cost               | Read Cost                           |
| ------------- | ---------------------------- | ------------------------ | ----------------------------------- |
| Copy-on-Write | Rewrites affected data files | High (full file rewrite) | Low (no delete merging)             |
| Merge-on-Read | Writes delete files          | Low (small delete file)  | Higher (apply deletes at read time) |

The right choice depends on read/write ratio and latency requirements. For high-frequency streaming deletes, Merge-on-Read is almost always the right choice. For infrequent batch corrections on a read-heavy table, Copy-on-Write may be preferable.

See [Copy-on-Write](/iceberg/iceberg-copy-on-write/) and [Merge-on-Read](/iceberg/iceberg-merge-on-read/) for detailed comparisons.

## Delete File Applicability

Delete files are scoped to specific data files using a **lower_bound/upper_bound filter on `file_path`** stored in their manifest entries. This allows query planning to skip delete files that don't apply to the data files being scanned — preventing a global delete scan on every read.
