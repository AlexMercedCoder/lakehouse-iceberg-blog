---
term: "Apache Parquet and Iceberg"
metaTitle: "Iceberg Parquet Files: Defaults, Compression, and Tuning"
description: "Parquet is the default data file format for Iceberg tables, written with zstd compression and 128 MB row groups. See how the two layers skip data together."
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
lastUpdated: 2026-10-15
---

## Apache Parquet and Iceberg

Parquet is the default file format for Iceberg data files (`write.format.default = parquet`). As of Iceberg 1.12, Iceberg writes Parquet with zstd compression, 128 MB row groups, and a 512 MB target file size unless you change the table properties.

**Apache Parquet** is the default and overwhelmingly dominant data file format for Apache Iceberg tables. While Iceberg also supports ORC and Avro data files, Parquet is the de facto standard in the lakehouse ecosystem, and understanding how Parquet and Iceberg work together is essential for building high-performance lakehouse architectures.

Parquet provides columnar storage with rich compression and column-level statistics. Iceberg provides a metadata layer above Parquet with manifest-level statistics and snapshot management. Together, they deliver a two-level data skipping pipeline that can reduce query scan sizes by orders of magnitude.

## Apache Parquet: A Quick Overview

Apache Parquet is an open-source, column-oriented data file format designed for efficient analytical processing. Key properties:

- **Columnar storage**: Data is organized by column, not by row. Queries that access only a subset of columns read only those columns from disk: dramatically reducing I/O.
- **Row groups**: Each Parquet file is divided into **row groups** (Iceberg's default `write.parquet.row-group-size-bytes` is 128 MB). Each row group contains all columns for a subset of rows. Row groups have their own statistics (min/max, null counts per column).
- **Column chunks**: Within each row group, data for each column is stored in a **column chunk** with its own encoding and optional compression.
- **Page-level encoding**: Column chunks are divided into pages. Parquet supports dictionary encoding (efficient for low-cardinality columns), run-length encoding, bit-packing, and delta encoding.
- **Compression codecs**: Iceberg accepts zstd, brotli, lz4, gzip, snappy, or uncompressed through `write.parquet.compression-codec`. Zstd is the Iceberg default; snappy remains common in older tables and other writers.

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

Iceberg's default target file size (`write.target-file-size-bytes`) is **512 MB**, and most teams land between 128 MB and 512 MB per file:

- **Too small** (< 10MB): Many files create high metadata overhead, slow listing, and poor row group statistics coverage.
- **Too large** (> 1GB): Reduces parallelism and makes file-level statistics less selective.

File size is controlled by compaction settings and write batch sizes.

## Parquet Compression

Recommended compression for Iceberg Parquet files:

| Codec        | Speed   | Ratio    | Use Case                    |
| ------------ | ------- | -------- | --------------------------- |
| Zstd         | Fast    | High     | Iceberg default since 1.4.0 |
| Snappy       | Fast    | Moderate | Common in older tables      |
| Gzip         | Slow    | Highest  | Archival, rarely written    |
| Uncompressed | Fastest | None     | Debugging only              |

Zstd has been Iceberg's default `write.parquet.compression-codec` since Iceberg 1.4.0, so new tables get it without any configuration.

## Parquet Column Statistics and Iceberg

When Iceberg writes a data file, it collects column statistics for that file (by default `truncate(16)` bounds for the first 100 columns) and stores them in the manifest entry for that file. This is how Iceberg populates the `lower_bounds` and `upper_bounds` fields used for data skipping at the manifest level.

The quality of data skipping depends on **data clustering**: how well the data within each file is sorted or ordered. A file with `event_date` values randomly distributed between 2020 and 2026 has very wide min/max bounds and provides poor skipping. A file with all `event_date` values within a single day provides tight bounds and excellent skipping.

This is why **clustering and sorting** (see [Z-Order Clustering](/iceberg/iceberg-zorder/)) is so important for Iceberg query performance.

## Parquet and Iceberg in Practice

```python
# PyIceberg: Parquet settings come from table properties
from pyiceberg.catalog import load_catalog
import pyarrow as pa

catalog = load_catalog("my_catalog")
table = catalog.load_table("db.events")

# Set the codec explicitly (zstd is already the default)
with table.transaction() as tx:
    tx.set_properties(**{"write.parquet.compression-codec": "zstd"})

# Appends now write zstd-compressed Parquet files
table.append(pa.table({"event_id": [...], "event_time": [...]}))
```
