---
term: "Iceberg Data Files"
description: "Iceberg data files are the immutable columnar files (Parquet, ORC, or Avro) that store the actual table data in object storage, tracked by manifest files with column-level statistics enabling efficient query planning and data skipping."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-manifest-file"
  - "iceberg-delete-files"
  - "iceberg-parquet"
  - "iceberg-table-format"
  - "iceberg-compaction"
  - "iceberg-small-file-problem"
keywords:
  - iceberg data files
  - iceberg parquet files
  - iceberg immutable files
  - iceberg file formats
lastUpdated: 2026-05-14
---

## Iceberg Data Files

**Data files** are the leaf layer of the Apache Iceberg metadata hierarchy — the actual columnar files stored in object storage that contain your table's data rows. Every fact, every metric, every event record lives in a data file. Understanding how Iceberg manages data files is fundamental to understanding both its performance characteristics and its operational requirements.

## Supported File Formats

Iceberg supports three columnar file formats for data storage:

### Apache Parquet (Default and Recommended)

Parquet is the dominant format in the Iceberg ecosystem. It provides:

- **Columnar storage**: Only the queried columns are read from disk.
- **Encoding and compression**: Run-length encoding, dictionary encoding, Snappy/Zstd/Gzip compression.
- **Column statistics**: Min/max values, null counts, and value counts per column chunk, enabling data skipping both at the manifest level (Iceberg) and at the row-group level (Parquet reader).
- **Row group structure**: Data is split into row groups (typically 128MB), each with its own statistics, enabling fine-grained file skipping.

### Apache ORC

ORC (Optimized Row Columnar) is primarily used in Hive-origin ecosystems. It provides similar columnar benefits to Parquet with slightly different encoding strategies. Iceberg supports ORC for workloads migrating from Hive.

### Apache Avro

Avro is a row-oriented format used in a few Iceberg use cases, primarily for change data and write-ahead applications where row-by-row access patterns dominate. Not recommended for analytical workloads.

For almost all use cases, **Parquet is the correct choice** due to its superior analytical read performance and broad ecosystem support.

## Immutability: The Core Principle

Iceberg data files are **immutable** — they are written once and never modified. This is the foundational design decision that enables all of Iceberg's other properties:

- **ACID without distributed locks**: Since files are never modified in place, there are no write-write conflicts at the file level. Conflicts are resolved at the metadata commit level.
- **Time travel**: Historical snapshots reference their original data files, which remain unchanged.
- **Safe concurrent reads during writes**: Readers see a consistent snapshot; writers create new files without disrupting readers.

When `UPDATE` or `DELETE` operations are performed, Iceberg never modifies existing data files. Instead, it either rewrites affected files (Copy-on-Write) or creates delete files that mark rows as deleted (Merge-on-Read).

## How Data Files Are Tracked

Data files are not discovered by listing object storage directories. They are **tracked by manifest files**, which record:

- The file's full URI (e.g., `s3://bucket/warehouse/db/orders/data/00000-0-abc123.parquet`)
- The file's partition values
- Record count and file size
- Column-level min/max statistics (used for data skipping)

This means adding a file to an Iceberg table requires both writing the file AND committing a manifest entry — which happens atomically via the snapshot commit protocol.

## File Naming

Iceberg data files use a standardized naming convention:

```
{partition-path}/{task-id}-{attempt-id}-{file-id}.{format}
```

For example:

```
event_date=2026-05-14/0-0-00000-0-abc12345-1234-5678-abcd-ef0123456789.parquet
```

## The Small File Problem

Because Iceberg generates new files for each write transaction, high-frequency streaming writes or micro-batch jobs create many small files. Small files harm query performance because:

- More file opens are required per query
- Each file has fixed overhead (open, read footer, close)
- Column statistics are less effective with tiny files

The solution is regular **compaction** — merging small files into optimally sized files (typically 128MB–512MB). See [Iceberg Compaction](/iceberg/iceberg-compaction/) for details.

## Data File Lifecycle

1. **Created**: During a write operation (INSERT, INSERT OVERWRITE, MERGE, compaction).
2. **Tracked**: Referenced by a manifest file, which is referenced by a snapshot's manifest list.
3. **Active**: Part of the current snapshot or any unexpired historical snapshot.
4. **Orphaned**: Created during a failed write (no manifest commit). Cleaned up by orphan file removal.
5. **Deleted from snapshots**: After snapshot expiration removes the last snapshot referencing a file.
6. **Physically deleted**: After orphan file cleanup or post-expiration GC.
