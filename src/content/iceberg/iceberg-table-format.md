---
term: "Apache Iceberg Table Format"
description: "The Apache Iceberg table format is a specification defining how data files, metadata files, manifests, and snapshots are structured on object storage to enable ACID transactions, schema evolution, and efficient query planning."
category: "Core Concepts"
relatedTerms:
  - "what-is-apache-iceberg"
  - "iceberg-metadata-file"
  - "iceberg-manifest-list"
  - "iceberg-manifest-file"
  - "iceberg-snapshot"
  - "iceberg-data-files"
  - "iceberg-hidden-partitioning"
keywords:
  - apache iceberg table format
  - iceberg format specification
  - iceberg metadata layer
  - iceberg file layout
lastUpdated: 2026-05-14
---

## The Apache Iceberg Table Format

The Apache Iceberg **table format** is the foundational specification that defines how an Iceberg table is physically laid out on storage. Understanding this format is essential for anyone building on or operating an Iceberg lakehouse: it explains why Iceberg delivers reliable ACID semantics, high query performance, and safe concurrent writes without requiring a centralized lock manager.

The table format is divided into three distinct layers: the **data layer**, the **metadata layer**, and the **catalog layer**.

## The Three Layers

### Layer 1: Data Layer (Data Files)

The actual table data is stored as immutable columnar data files: typically Apache Parquet, though ORC and Avro are also supported. These files live in object storage (S3, ADLS, GCS) organized into directories, but Iceberg does **not** rely on directory structure for correctness. File locations are tracked entirely through metadata.

Key properties:

- Files are **immutable**: Iceberg never modifies data in place
- Each file contains column statistics (min/max values, null counts) used for **data skipping**
- Files can include **delete files** (positional or equality) for row-level deletes without rewriting data

### Layer 2: Metadata Layer

Above the data layer sits Iceberg's rich metadata layer, which is the key innovation enabling all of Iceberg's reliability guarantees.

**Manifest Files**: Each manifest file tracks a subset of the table's data files. It records each file's location, partition values, record counts, and column-level statistics. Manifests are themselves immutable files.

**Manifest List (Snapshot file)**: Each snapshot of the table has a manifest list: a file that lists all the manifest files that make up the snapshot. This is the entry point for reading any historical version of the table.

**Table Metadata File**: The top-level metadata JSON file (`metadata.json`) tracks the complete history of the table: all past snapshots, all past schemas, all past partition specs, sort orders, and a pointer to the current snapshot.

### Layer 3: Catalog Layer

The catalog stores only one piece of information per table: the **current metadata file location**. When an engine opens an Iceberg table, it asks the catalog for the metadata file pointer, then traverses the metadata → manifest list → manifests → data files chain entirely from object storage.

The catalog can be implemented many ways: as entries in a relational database (Hive Metastore), as a REST API (Iceberg REST Catalog), or as a versioned commit store (Project Nessie).

## How a Read Works

1. Engine queries the catalog for the table's current metadata file location.
2. Engine reads the metadata JSON to find the current snapshot.
3. Engine reads the manifest list to find which manifest files are relevant (using partition pruning).
4. Engine reads relevant manifests to find which data files to scan (using column statistics for data skipping).
5. Engine reads only the necessary data files.

This multi-level metadata structure means Iceberg can skip irrelevant files **before even opening them**, enabling sub-second query planning on petabyte-scale tables.

## How a Write Works (Atomic Commit)

1. Writer creates new data files in object storage.
2. Writer creates a new manifest file listing the new data files.
3. Writer creates a new snapshot with a new manifest list.
4. Writer creates a new table metadata file pointing to the new snapshot.
5. Writer **atomically commits** the new metadata file pointer to the catalog using a compare-and-swap operation.

If two writers try to commit concurrently, only one succeeds: the other retries. This optimistic concurrency control provides ACID guarantees without distributed locks.

## Iceberg Spec Versions

The Iceberg format has two major specification versions:

- **Spec v1**: Original format, broadly supported by all engines.
- **Spec v2**: Added row-level deletes (delete files), required-field tracking, and improved partition evolution support. All modern engines support v2.

## Why the Format Matters for Performance

The Iceberg table format is what enables performance features that were impossible with Hive-style tables:

- **Partition pruning without directory listing**: Partition values are in manifest files, not inferred from directory names. No `LIST` API calls needed.
- **Data skipping**: Column min/max statistics in manifests allow engines to skip entire files without opening them.
- **Predicate pushdown**: Statistics enable filtering at the metadata level before data is read.
- **Incremental processing**: The snapshot diff API (`added_files`, `deleted_files` between snapshots) enables efficient streaming ingestion without full table scans.
