---
term: "Space Amplification"
description: "A storage metric representing the ratio of physical disk space occupied by a table compared to the size of its active logical snapshot."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "read-amplification"
  - "write-amplification"
  - "iceberg-snapshot-expiration-age"
keywords:
  - space amplification
  - storage consumption
  - snapshot retention space
  - orphan files space
lastUpdated: 2026-05-29
---

## Space Amplification

**Space Amplification** is a storage metric that measures how much extra physical disk space a table uses compared to the logical size of its active data. While time travel and historical snapshot queries are key features of Apache Iceberg, maintaining these historical versions consumes significant storage space over time.

### Causes of Space Amplification

Several factors contribute to space amplification in lakehouse environments:

1.  **Historical Snapshots**: Iceberg keeps all data and delete files referenced by previous commits. If a table undergoes frequent updates, files containing stale rows are preserved to support time-travel queries.
2.  **Orphan Files**: Physical files created by failed commits or interrupted compaction jobs may remain in storage. Since no active metadata paths reference them, they waste space until manually removed.
3.  **Merge-on-Read Delete Logs**: Keeping multiple versions of delete files increases the overall storage footprint.

### Managing Space Amplification

To prevent storage costs from growing out of control, data teams run routine maintenance procedures:

- **Snapshot Expiration**: Running the `expire_snapshots` procedure regularly deletes older, unused metadata references. Once expired, the physical data files associated only with those snapshots are permanently removed:

```sql
/* Expire snapshots older than 7 days */
CALL prod.system.expire_snapshots(
    table => 'db.orders',
    older_than => TIMESTAMP '2026-05-22 00:00:00.000'
);
```

- **Orphan File Removal**: The `remove_orphan_files` procedure scans the storage bucket and deletes files that are not referenced in any metadata log.
- **Metadata Pruning**: Restricting the maximum number of historical metadata files preserved on disk helps keep metadata directories small.
