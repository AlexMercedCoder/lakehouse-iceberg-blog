---
term: "Iceberg Partition-Level Compaction"
description: "A targeted maintenance strategy that runs file compaction only on specific partitions, optimizing high-churn data subsets without rewriting the entire table."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-compaction"
  - "iceberg-bin-packing-compaction"
  - "iceberg-sort-based-compaction"
keywords:
  - partition compaction
  - selective compaction
  - iceberg partition maintenance
lastUpdated: 2026-05-29
---

## Iceberg Partition-Level Compaction

**Iceberg Partition-Level Compaction** is a selective maintenance practice where file optimization is restricted to specific partitions. By executing compaction at the partition level rather than running a global operation, data teams can target high-churn partitions while leaving static or historical partitions untouched. This strategy reduces the write amplification and compute resources associated with table-wide rewrites.

### Mechanism and Implementation

In Apache Iceberg, partition-level compaction is typically achieved by applying filters to the compaction API or SQL procedure. This ensures that the engine only selects files belonging to the specified partitions for bin-packing or sorting.

For example, when using the Spark SQL interface, the `rewrite_data_files` procedure accepts a `where` option. This option filters the candidate data files based on their partition values:

```sql
/* Compact data files only in the partition for December 2025 */
CALL prod.system.rewrite_data_files(
    table => 'db.events',
    where => 'event_month = "2025-12"'
);
```

The coordinator analyzes the query filter, locates the manifest entries that match the partition criteria, and launches compaction tasks exclusively for those files.

### Key Benefits

Restricting compaction to specific partitions provides several operational advantages:

- **Reduced Resource Usage**: Computes are not wasted on historical partitions that already contain large, optimized files.
- **Lower Write Amplification**: Only the target partitions generate new data files and metadata snapshots, preventing unnecessary object storage fees.
- **Faster Execution**: Jobs complete quickly since they process smaller amounts of data. This allows scheduling frequent partition-level compactions during small ingestion windows.
