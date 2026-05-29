---
term: "Iceberg Spark Procedure add_files"
description: "A Spark SQL procedure in Apache Iceberg used to register existing Parquet or ORC data files directly into an Iceberg table without copying data."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-spark-procedure-register-table"
  - "iceberg-file-path-spec"
keywords:
  - add_files spark
  - register parquet files iceberg
  - spark sql call add_files
lastUpdated: 2026-05-29
---

## Iceberg Spark Procedure add_files

The **Iceberg Spark Procedure add_files** is a utility executed via Spark SQL to import existing data files into an Apache Iceberg table. If a data team has large volumes of historical data stored in Parquet or ORC format, copying that data to create a new Iceberg table can be expensive. The `add_files` procedure references the storage paths of these files and registers them directly in the Iceberg table's metadata without copying or modifying the data.

### Syntax and Parameters

The procedure takes the target Iceberg table, the source directory location, and the format of the files. It can optionally parse partition values from Hive-style directory structures:

```sql
/* Add existing Parquet files from an external path into the Iceberg table */
CALL prod.system.add_files(
    table => 'db.web_logs',
    source_table => '`parquet`.`s3://my-bucket/historical_logs/`',
    partition_filter => map('year', '2026')
);
```

### Key Considerations

- **Zero-Copy Ingestion**: Since data files are only registered in the metadata, the operation is fast and does not incur compute or storage costs.
- **Schema Matching**: The source Parquet/ORC file schemas must match the target Iceberg table's schema.
- **File Layout Validation**: During execution, the procedure validates file structures and writes manifest entries mapping the imported files.
