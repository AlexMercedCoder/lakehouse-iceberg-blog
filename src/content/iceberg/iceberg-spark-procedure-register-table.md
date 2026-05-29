---
term: "Iceberg Spark Procedure register_table"
description: "A Spark SQL procedure in Apache Iceberg used to register an existing metadata JSON file as a table within the active catalog."
category: "Table Format Maintenance & Operations"
relatedTerms:
  - "iceberg-spark-procedure-add-files"
  - "iceberg-metadata-file"
keywords:
  - register_table spark
  - register metadata json iceberg
  - spark sql call register_table
lastUpdated: 2026-05-29
---

## Iceberg Spark Procedure register_table

The **Iceberg Spark Procedure register_table** is a administrative utility executed via Spark SQL. It allows data engineers to register an existing Iceberg metadata JSON file (located in cloud or object storage) as a managed table in a different catalog. This procedure is commonly used for migrating tables between catalogs, disaster recovery, or cloning table states to test environments.

### Syntax and Implementation

The procedure requires the destination table identifier and the absolute storage path pointing to the target `.metadata.json` file:

```sql
/* Register an existing table using its metadata JSON file path */
CALL prod.system.register_table(
    table => 'db.cloned_logs',
    metadata_file => 's3://my-bucket/db/web_logs/metadata/v12.metadata.json'
);
```

### Architectural Benefits

- **Catalog Interoperability**: Since Iceberg's state is defined entirely within its metadata files, registering a table is a simple metadata swap that is catalog-independent.
- **Cloning Snapshot States**: Data teams can clone a table at a specific historical state by registering the metadata JSON corresponding to a past snapshot version.
- **Disaster Recovery**: If a catalog database is corrupted, the table state can be reconstructed by searching storage for the latest metadata JSON file and running `register_table`.
