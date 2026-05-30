---
term: "Iceberg Puffin Files"
description: "Puffin is the Apache Iceberg file format for storing advanced table statistics and indexes beyond the basic min/max bounds in manifest files, including NDV (number of distinct values) sketches, theta sketches, and bloom filters that enable more accurate query planning."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-manifest-file"
  - "iceberg-data-skipping"
  - "iceberg-bloom-filters"
  - "iceberg-statistics"
  - "iceberg-table-format"
keywords:
  - iceberg puffin files
  - iceberg puffin format
  - iceberg advanced statistics
  - iceberg ndv statistics
  - iceberg bloom filter puffin
lastUpdated: 2026-05-14
---

## Iceberg Puffin Files

**Puffin** is the Apache Iceberg file format for storing **advanced table-level statistics and indexes** that go beyond the column min/max bounds available in manifest files. Puffin files attach supplementary statistical metadata to Iceberg table snapshots, enabling query planners to make better cost-based optimization decisions: such as accurate join ordering, smarter partition elimination, and bloom-filter-based row skipping.

The name "Puffin" is deliberately playful: following Iceberg's arctic theme, and refers to the bird species that uses the same name.

## Why Puffin Exists

Manifest files store per-file column statistics: min/max values, null counts, value counts. These are powerful for data skipping but have limitations:

- **Min/max bounds are blunt**: A column with values `[1, 1000000]` min/max tells you almost nothing useful for selectivity estimation.
- **No cardinality information**: Query planners need to know "how many distinct values does `customer_id` have?" to correctly order joins and estimate output sizes.
- **No probabilistic indexes**: Bloom filters require per-file hash structures that can't fit in the manifest format.

Puffin adds a dedicated file format to attach these richer statistics to snapshots: separate from manifests, and extensible for future statistics types.

## Puffin File Structure

A Puffin file is a binary format with:

- A **file-level magic header** identifying it as a Puffin file.
- One or more **blobs**: named, typed data structures (statistics, indexes).
- A **footer** with blob metadata (byte offsets, lengths, compression, type, associated snapshot, associated columns).
- A **file-level footer magic** for validation.

Each blob in a Puffin file has:

- `type`: The statistics type (e.g., `apache-datasketches-theta-v1`, `apache-datasketches-hll-v1`)
- `fields`: Which column IDs the statistic covers
- `snapshot-id`: The snapshot this statistic was computed for
- `sequence-number`: The sequence number of the snapshot

## Supported Statistics Types

### Apache DataSketches Theta Sketch (NDV)

Estimates the **number of distinct values (NDV)** for a column using the Theta sketch algorithm from the Apache DataSketches library. NDV is critical for join cardinality estimation.

```
blob type: "apache-datasketches-theta-v1"
→ answers: "approximately how many distinct values does customer_id have?"
→ use: join ordering, GROUP BY cardinality estimation
```

### Apache DataSketches HLL Sketch

The HyperLogLog++ sketch: another NDV estimation algorithm with different accuracy/size tradeoffs.

```
blob type: "apache-datasketches-hll-v1"
```

### Bloom Filter Index (Future / In Progress)

File-level bloom filters stored in Puffin would allow the engine to determine "does this data file contain a row where `user_id = 12345`?" with a single hash lookup, eliminating files that can prove they don't contain a value.

## Puffin Files and the Snapshot

Puffin files are **associated with a snapshot** via the snapshot's `statistics-files` property in the table metadata:

```json
{
  "snapshot-id": 8027658604211071520,
  "statistics": [
    {
      "snapshot-id": 8027658604211071520,
      "statistics-path": "s3://bucket/warehouse/db/orders/metadata/snap-8027...puffin",
      "file-size-in-bytes": 16384,
      "file-footer-size-in-bytes": 512,
      "blob-metadata": [...]
    }
  ]
}
```

When a snapshot is expired, its associated Puffin files are also cleaned up.

## Generating Puffin Statistics

Puffin statistics must be explicitly computed: they are not generated during normal writes. In Spark:

```sql
-- Analyze a table to compute and store column statistics as Puffin
ANALYZE TABLE db.orders COMPUTE STATISTICS FOR ALL COLUMNS;

-- Verify statistics were written
SELECT * FROM db.orders.snapshots;
-- look for statistics-files in the snapshot metadata
```

In Dremio Cloud and Enterprise, statistics collection can be triggered via the UI or API and is used by the Intelligent Query Engine's cost-based optimizer.

## Puffin and Query Planning

Engines that support Puffin statistics use them in their query planners:

- **Join reordering**: Use NDV estimates to order joins by estimated output size (smallest first).
- **Aggregate estimation**: Estimate GROUP BY output cardinality for memory allocation.
- **Partition elimination improvements**: Use cardinality info to refine file pruning decisions beyond min/max bounds.

Puffin is an evolving area of the Iceberg spec: expect bloom filter support, histogram statistics, and multi-column statistics to emerge as the ecosystem matures.
