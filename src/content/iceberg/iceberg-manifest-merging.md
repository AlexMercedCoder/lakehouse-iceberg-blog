---
term: "Iceberg Manifest Merging"
description: "An automatic, write-path optimization in Apache Iceberg that merges small manifest files during commits to prevent metadata fragmentation."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-manifest-file"
  - "iceberg-spark-procedure-rewrite-manifests"
keywords:
  - manifest merging
  - commit manifest min count to merge
  - iceberg manifest optimization
lastUpdated: 2026-05-29
---

## Iceberg Manifest Merging

**Iceberg Manifest Merging** is an automatic, background optimization process that runs during write commits to merge small manifest files into larger ones. By consolidating manifest metadata inline, Iceberg prevents manifest file fragmentation at the source, keeping query planning latency low without requiring manual maintenance procedures for every write transaction.

### How Automatic Merging Works

When a query engine commits a write operation to an Iceberg table, it writes a new manifest file containing the added file entries. If every small commit generated a permanent manifest file, query planning would slow down as the coordinator node would have to read thousands of files.

Manifest merging prevents this:

1.  **Commit Triggers**: During the commit phase, Iceberg evaluates the number and size of existing manifest files.
2.  **Evaluating Properties**: It checks table configuration properties, primarily:
    - `commit.manifest.target-size-bytes`: The target size for manifest files (default is 8 MB).
    - `commit.manifest.min-count-to-merge`: The minimum number of manifests required to trigger an automatic merge (default is 100).
3.  **Merging Manifests**: If thresholds are met, Iceberg combines small manifests that track the same partition specs into a single manifest, updating the manifest list accordingly.

### Configuration Properties

Writers can customize merging thresholds using table properties:

```sql
/* Configure the table properties to trigger manifest merging sooner */
ALTER TABLE sales.orders SET TBLPROPERTIES (
    'commit.manifest.target-size-bytes' = '16777216', /* 16 MB */
    'commit.manifest.min-count-to-merge' = '50'
);
```

By tuning these parameters, administrators ensure that the table's metadata layer remains consolidated automatically, reducing the frequency at which manual `rewrite_manifests` procedures must be scheduled.
