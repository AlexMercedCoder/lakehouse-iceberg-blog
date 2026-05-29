---
term: "Iceberg Spark Procedure rewrite_position_deletes"
description: "A Spark SQL maintenance procedure in Apache Iceberg used to consolidate small position delete files to improve query read times."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-delete-files"
  - "iceberg-positional-deletes"
  - "iceberg-spark-procedure-rewrite-data-files"
keywords:
  - rewrite_position_deletes spark
  - compact position deletes
  - spark sql call rewrite_position_deletes
lastUpdated: 2026-05-29
---

## Iceberg Spark Procedure rewrite_position_deletes

The **Iceberg Spark Procedure rewrite_position_deletes** is a Spark SQL maintenance function designed to consolidate small, fragmented position delete files. In tables configured with the Merge-on-Read (MoR) strategy, row-level updates and deletes write small position delete files. Reading many small delete files at query time causes read amplification and slows down queries. This procedure merges them into larger files to optimize read-time merging.

### Syntax and Implementation

The procedure is executed through the Spark SQL `CALL` syntax. It reads the small position delete files and rewrites them into larger, optimized files:

```sql
/* Consolidate position delete files for the target table */
CALL prod.system.rewrite_position_deletes(
    table => 'db.web_logs'
);
```

### Performance Benefits

- **Reducing File Handles**: Merging many small delete logs into larger blocks reduces the number of file open requests the executor engines must perform.
- **Optimizing Merge-on-Read Queries**: When query engines join data files with position deletes, reading consolidated delete files minimizes memory overhead and decreases execution latency.
