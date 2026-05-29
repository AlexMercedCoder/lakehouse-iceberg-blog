---
term: "Iceberg Spark Procedure rewrite_manifests"
description: "A Spark SQL maintenance procedure in Apache Iceberg used to reorganize and merge small manifest files to optimize query planning latency."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-manifest-file"
  - "iceberg-manifest-merging"
keywords:
  - rewrite_manifests spark
  - iceberg manifest compaction
  - spark sql call rewrite_manifests
lastUpdated: 2026-05-29
---

## Iceberg Spark Procedure rewrite_manifests

The **Iceberg Spark Procedure rewrite_manifests** is a table maintenance utility executed via Spark SQL. When tables experience frequent write commits, they accumulate many small manifest files. Each manifest file must be parsed by the query coordinator during the planning phase to determine which data files match a query. Consolidating small manifests into a smaller set of larger files reduces query planning latency.

### Syntax and Behavior

The procedure merges small manifests, matching the target configuration sizing (typically 8 MB or 16 MB per manifest), and aligns file boundaries with active partition specifications:

```sql
/* Consolidate small manifest files on the target table */
CALL prod.system.rewrite_manifests(
    table => 'db.web_logs'
);
```

### Manifest Alignment and Partition Pruning

When `rewrite_manifests` executes, it reorganizes manifest entry records:

- **Data Co-location**: Manifests are rewritten so that data files from the same partition are grouped together into the same manifest.
- **Enhanced Pruning**: By grouping files from the same partitions, query engines can skip entire manifests during partition pruning, avoiding scanning manifest entries for irrelevant partitions.

Running this procedure periodically is a best practice for tables subjected to continuous streaming data writes.
