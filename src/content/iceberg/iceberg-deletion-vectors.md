---
term: "Iceberg Deletion Vectors"
description: "Deletion vectors are a Spec v3 enhancement to Apache Iceberg's row-level delete mechanism, replacing positional delete files with compact Roaring Bitmap structures attached directly to data files, reducing read amplification and metadata overhead for tables with frequent updates."
category: "Core Concepts"
relatedTerms:
  - "iceberg-spec-v3"
  - "iceberg-positional-deletes"
  - "iceberg-delete-files"
  - "iceberg-merge-on-read"
  - "iceberg-row-level-deletes"
keywords:
  - iceberg deletion vectors
  - iceberg delete vectors
  - iceberg spec v3 deletion
  - iceberg row deletion compact
  - iceberg bitmap deletes
lastUpdated: 2026-05-14
---

## Iceberg Deletion Vectors

**Deletion vectors** (DVs) are a new row deletion mechanism introduced in Apache Iceberg Spec v3 that replaces the Spec v2 positional delete file approach with a more compact, file-local bitmap structure. Deletion vectors significantly reduce the read amplification and metadata overhead caused by positional delete files in tables with frequent row-level operations.

## The Problem with Spec v2 Positional Delete Files

In Spec v2, row-level deletes for Merge-on-Read (MoR) tables are stored as **positional delete files** — separate Avro/Parquet files that record `(file_path, row_position)` pairs for each deleted row.

Problems that accumulate over time:

1. **One delete file per data file (worst case)**: Each data file can have multiple corresponding positional delete files. With thousands of data files, the delete file count multiplies.
2. **Sort-merge join during reads**: Applying positional deletes requires sorting and merging the delete file against the data file scan — significant CPU overhead.
3. **Manifest bloat**: Delete files are tracked as manifest entries, increasing manifest size and query planning overhead.
4. **Compaction dependency**: Positional delete files must be regularly compacted (rewrite_data_files) to be applied and removed — costly.

For a table receiving 1,000 updates/hour for 24 hours without compaction: potentially 24,000 positional delete files accumulating alongside the data files.

## Deletion Vectors: The Spec v3 Approach

Instead of separate delete files, a **deletion vector** is a compact **Roaring Bitmap** that encodes the positions of deleted rows directly associated with a specific data file.

Key differences:

| Aspect             | Spec v2 Positional Deletes  | Spec v3 Deletion Vectors       |
| ------------------ | --------------------------- | ------------------------------ |
| Storage            | Separate Avro files         | Bitmap blob (Puffin or inline) |
| Association        | By file path string match   | By data file reference         |
| Read overhead      | Sort-merge join             | O(1) bitmap lookup per row     |
| File count         | Grows with delete frequency | One DV per data file           |
| Compaction urgency | High (delete files pile up) | Lower (bitmap is compact)      |
| Storage size       | Large (one row per delete)  | Tiny (Roaring Bitmap)          |

## Roaring Bitmap Efficiency

**Roaring Bitmaps** are the data structure chosen for DVs due to their excellent compression characteristics for sparse deletion patterns:

- A table with 10 million rows where 1,000 are deleted:
  - Spec v2 positional delete file: ~1,000 × (file_path length + 8 bytes) ≈ 100KB+
  - Spec v3 DV Roaring Bitmap: ~1,000 bits with run-length encoding ≈ ~1KB

For typical operational delete rates (0.01%–1% of rows deleted per day), DVs are 100x–1000x smaller than positional delete files.

## How Deletion Vectors Are Stored

DVs are stored as **Puffin blobs** attached to the data file they reference:

```
data-file-001.parquet
  → puffin-blob: deletion-vector (Roaring Bitmap, positions 145, 892, 10041 deleted)

data-file-002.parquet
  → puffin-blob: deletion-vector (empty — no deletes)

data-file-003.parquet
  → puffin-blob: deletion-vector (positions 5, 7, 9 deleted)
```

The manifest entry for each data file includes a reference to its DV blob. During a scan, the reader:

1. Reads the data file.
2. Fetches the DV blob (tiny — kilobytes).
3. Applies the Roaring Bitmap to filter deleted positions.
4. No separate delete file to join.

## Enabling Deletion Vectors (Spec v3 Tables)

```sql
-- Upgrade table to Spec v3
ALTER TABLE db.orders SET TBLPROPERTIES ('format-version' = '3');

-- Configure DV as the default delete mode
ALTER TABLE db.orders SET TBLPROPERTIES (
    'write.delete.mode' = 'merge-on-read',
    'write.update.mode' = 'merge-on-read'
);

-- DELETEs now use deletion vectors
DELETE FROM db.orders WHERE order_id IN (1001, 1002, 1003);
-- → Updates DV bitmap for affected data files

-- UPDATEs also use deletion vectors (delete old row, append new row)
UPDATE db.orders SET status = 'shipped' WHERE order_id = 2005;
-- → DV marks old position deleted; new row appended to new data file
```

## Read Path with Deletion Vectors

During a scan of an Iceberg table with DVs:

```python
# PyIceberg: transparent DV application during scan
table = catalog.load_table("db.orders")

# DV application is automatic — users see only live rows
df = table.scan(row_filter="order_date >= '2026-05-01'").to_arrow()
# Internally: reads data files, applies DVs, returns non-deleted rows
```

The DV application is O(1) per row (bitmap position check) vs. the sort-merge join required for Spec v2 positional deletes.

## Deletion Vectors vs. Copy-on-Write

DVs are a **Merge-on-Read** (MoR) mechanism — deletions are recorded lazily, reads do some work to apply them. The alternative is **Copy-on-Write** (CoW) — rewrite the data file on each delete, reads are clean.

For tables with:

- **High delete frequency, high read volume**: DVs reduce write cost significantly vs. CoW. Some read overhead but much less than positional deletes.
- **Low delete frequency, very high read volume**: CoW may be preferable — reads are always clean.
- **Mixed patterns**: DVs + periodic compaction is the most flexible approach.

## Engine Support Status

Deletion vectors are a Spec v3 feature. As of 2025, engine support is in active development:

- **Apache Spark**: DV read/write support in development.
- **Apache Flink**: Planned for Iceberg Flink connector.
- **PyIceberg**: In development.
- **Dremio**: On roadmap following Spec v3 stabilization.
- **Trino**: Read support planned.

Follow the [Apache Iceberg project tracker](https://github.com/apache/iceberg) for current engine adoption status.
