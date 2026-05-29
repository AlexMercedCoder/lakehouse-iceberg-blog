---
term: "Iceberg Spark Procedure remove_orphan_files"
description: "A Spark SQL procedure in Apache Iceberg used to identify and delete files in table storage that are not referenced in any metadata snapshot."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-orphan-files"
  - "iceberg-spark-procedure-expire-snapshots"
keywords:
  - remove_orphan_files spark
  - clean orphan files iceberg
  - spark sql call remove_orphan_files
lastUpdated: 2026-05-29
---

## Iceberg Spark Procedure remove_orphan_files

The **Iceberg Spark Procedure remove_orphan_files** is a storage maintenance function executed via Spark SQL. Failed transactions, aborted compaction jobs, or client crashes can write data or metadata files to the table's directory without successfully committing them to the catalog. These untracked files are called orphan files. This procedure scans the physical storage directory, compares it against the active files logged in table metadata, and deletes any unreferenced files.

### Syntax and Parameters

The procedure is run using Spark SQL `CALL` syntax. It includes a safety age filter (`older_than`) to prevent deleting files from active, in-progress write transactions:

```sql
/* Remove orphan files that were created more than 3 days ago */
CALL prod.system.remove_orphan_files(
    table => 'db.web_logs',
    older_than => TIMESTAMP '2026-05-26 14:00:00.000'
);
```

### Safety and Configuration

- **Safety Window**: By default, the procedure only deletes files older than 24 hours. This safety margin prevents deleting active data files written by running Spark streams that have not yet committed.
- **Metadata Cleanups**: The procedure also identifies unreferenced metadata JSON and manifest files, ensuring the entire table directory is cleaned.
