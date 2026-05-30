---
term: "Apache Parquet and Iceberg"
description: "Apache Parquet is the default and recommended data file format for Apache Iceberg tables, providing columnar storage, rich compression, and column-level statistics that complement Iceberg's manifest-level data skipping for maximum query performance."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-data-files"
  - "iceberg-manifest-file"
  - "iceberg-compaction"
  - "iceberg-table-format"
  - "what-is-apache-iceberg"
keywords:
  - apache parquet iceberg
  - iceberg parquet format
  - parquet columnar storage
  - iceberg default file format
  - parquet row groups
lastUpdated: 2026-05-14
---

## Apache Parquet and Iceberg

**Apache Parquet** is the default and overwhelmingly dominant data file format for Apache Iceberg tables. While Iceberg technically supports ORC and Avro as well, Parquet is the de-facto standard in the lakehouse ecosystem: and understanding how Parquet and Iceberg work together is essential for building high-performance lakehouse architectures.

Parquet provides columnar storage with rich compression and column-level statistics. Iceberg provides a metadata layer above Parquet with manifest-level statistics and snapshot management. Together, they deliver a two-level data skipping pipeline that can reduce query scan sizes by orders of magnitude.

## Apache Parquet: A Quick Overview

Apache Parquet is an open-source, column-oriented data file format designed for efficient analytical processing. Key properties:

- **Columnar storage**: Data is organized by column, not by row. Queries that access only a subset of columns read only those columns from disk: dramatically reducing I/O.
- **Row groups**: Each Parquet file is divided into **row groups** (typically 128MB). Each row group contains all columns for a subset of rows. Row groups have their own statistics (min/max, null counts per column).
- **Column chunks**: Within each row group, data for each column is stored in a **column chunk** with its own encoding and optional compression.
- **Page-level encoding**: Column chunks are divided into pages. Parquet supports dictionary encoding (efficient for low-cardinality columns), run-length encoding, bit-packing, and delta encoding.
- **Compression codecs**: Snappy (fast, moderate compression), Zstd (best ratio/speed tradeoff), Gzip (highest compression, slowest). Snappy and Zstd are most common in lakehouse workloads.

## How Parquet and Iceberg Complement Each Other

Iceberg and Parquet create a **two-level data skipping** pipeline:

### Level 1: Iceberg Manifest-Level Skipping

Iceberg stores column-level min/max statistics for each **entire Parquet file** in the manifest file. The query engine can skip entire files before opening them if the column statistics prove no matching rows can exist.

### Level 2: Parquet Row-Group-Level Skipping

Within a Parquet file that wasn't skipped at the manifest level, the Parquet reader applies **row group filtering** using the per-row-group statistics embedded in the Parquet file footer. This skips row groups within a file before reading their pages.

### Result: Two-Level Pruning

For a well-clustered table, a query like `WHERE event_date = '2026-05-14'` might:

1. Skip 99.9% of files via Iceberg manifest statistics.
2. Within the remaining files, skip most row groups via Parquet row group statistics.
3. Read only the matching pages within non-skipped row groups.

This two-level approach makes well-designed Iceberg/Parquet tables competitive with or superior to columnar data warehouses for analytical query performance.

## Optimal Parquet File Size

For Iceberg tables, the recommended Parquet file size is **128MB to 512MB** per file:

- **Too small** (< 10MB): Many files create high metadata overhead, slow listing, and poor row group statistics coverage.
- **Too large** (> 1GB): Reduces parallelism and makes file-level statistics less selective.

File size is controlled by compaction settings and write batch sizes.

## Parquet Compression

Recommended compression for Iceberg Parquet files:

| Codec        | Speed   | Ratio    | Use Case                            |
| ------------ | ------- | -------- | ----------------------------------- |
| Snappy       | Fast    | Moderate | General purpose, default            |
| Zstd         | Fast    | High     | Best balance of compression + speed |
| Gzip         | Slow    | Highest  | Archival, rarely written            |
| Uncompressed | Fastest | None     | Debugging only                      |

Zstd is increasingly the recommended default for production Iceberg tables.

## Parquet Column Statistics and Iceberg

When Iceberg writes a data file, it reads column statistics from the **Parquet file footer** and stores them in the manifest entry for that file. This is how Iceberg populates the `lower_bounds` and `upper_bounds` fields used for data skipping at the manifest level.

The quality of data skipping depends on **data clustering**: how well the data within each file is sorted or ordered. A file with `event_date` values randomly distributed between 2020 and 2026 has very wide min/max bounds and provides poor skipping. A file with all `event_date` values within a single day provides tight bounds and excellent skipping.

This is why **clustering and sorting** (see [Z-Order Clustering](/iceberg/iceberg-zorder/)) is so important for Iceberg query performance.

## Parquet and Iceberg in Practice

```python
# PyIceberg: writing Parquet with specific properties
from pyiceberg.catalog import load_catalog
import pyarrow as pa

catalog = load_catalog("my_catalog")
table = catalog.load_table("db.events")

# Write with Zstd compression
table.append(
    pa.table({"event_id": [...], "event_time": [...]}),
    write_options={"compression": "zstd"}
)
```
