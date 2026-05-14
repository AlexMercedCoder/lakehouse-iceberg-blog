---
term: "Iceberg Table Migration from Hive"
description: "Migrating from Apache Hive tables to Apache Iceberg converts existing Parquet files into Iceberg-managed tables with full ACID, time travel, and schema evolution capabilities, achievable in-place without copying data using Spark's migrate procedure or Iceberg's add_files procedure."
category: "Patterns & Architecture"
relatedTerms:
  - "iceberg-hive-metastore"
  - "iceberg-table-format"
  - "iceberg-schema-evolution"
  - "spark-apache-iceberg"
  - "what-is-apache-iceberg"
keywords:
  - iceberg migration from hive
  - migrate hive to iceberg
  - iceberg in-place migration
  - hive table to iceberg
  - iceberg upgrade
lastUpdated: 2026-05-14
---

## Iceberg Table Migration from Hive

**Migrating from Apache Hive to Apache Iceberg** is one of the most common operations for organizations modernizing their data lakehouse infrastructure. Because Iceberg supports Parquet (the same format Hive typically uses), migrations can often be done **in-place** — converting the table's metadata to Iceberg format without copying or rewriting any data files.

This makes migrations low-risk, fast, and reversible.

## Why Migrate from Hive to Iceberg?

Hive tables on object storage suffer from fundamental limitations that Iceberg resolves:

| Limitation                   | Hive               | Apache Iceberg      |
| ---------------------------- | ------------------ | ------------------- |
| ACID transactions            | Partial (ORC only) | Full (all formats)  |
| Schema evolution             | Limited            | Full (column IDs)   |
| Time travel                  | No                 | Yes                 |
| Row-level updates/deletes    | Limited            | Yes (Spec v2)       |
| Partition evolution          | No (full rewrite)  | Yes (metadata-only) |
| Hidden partitioning          | No                 | Yes                 |
| Performance (file discovery) | Directory listing  | Manifest-based      |
| Engine neutrality            | Hive-centric       | Broad ecosystem     |

## Migration Method 1: In-Place Migration (CALL system.migrate)

The most common migration approach uses Spark's `migrate` stored procedure, which converts a Hive table to an Iceberg table in place — no data is copied.

```sql
-- Prerequisites:
-- 1. Iceberg SparkCatalog configured as spark_catalog
-- 2. Table uses Parquet, ORC, or Avro format

-- Migrate a Hive table to Iceberg in place
CALL spark_catalog.system.migrate('db.orders');

-- Migrate with custom Iceberg properties
CALL spark_catalog.system.migrate(
  'db.orders',
  map('write.format.default', 'parquet',
      'write.parquet.compression-codec', 'zstd')
);
```

What `migrate` does:

1. Reads the Hive table's Metastore entry (location, schema, partitions).
2. Scans the table's partition directories and creates Iceberg manifest files for all existing Parquet files.
3. Creates an Iceberg metadata file that references these manifests.
4. Updates the Hive Metastore entry to mark the table as an Iceberg table.

Result: The table is now an Iceberg table. All existing Parquet files are tracked as Iceberg data files. Zero data was copied or rewritten.

## Migration Method 2: Snapshot Migration (Shadow Table)

For tables where in-place migration is too risky, create a new Iceberg table and register the existing files:

```sql
-- Create a new Iceberg table with the desired schema
CREATE TABLE iceberg_catalog.db.orders_iceberg (
    order_id BIGINT, customer_id BIGINT, total DOUBLE, order_date DATE
) USING iceberg
PARTITIONED BY (months(order_date))
LOCATION 'new-s3-location/orders_iceberg';

-- Use add_files to register existing Parquet files (no copy)
CALL iceberg_catalog.system.add_files(
  table => 'db.orders_iceberg',
  source_table => 'hive_catalog.db.orders'
);
```

This creates a parallel Iceberg version for validation while leaving the original Hive table intact.

## Migration Method 3: Full Rewrite (for Schema Cleanup)

If the Hive table has schema issues (inconsistent types, improper nullability) or you want a clean start with new partitioning:

```sql
-- Full rewrite: read Hive, write clean Iceberg
CREATE TABLE iceberg_catalog.db.orders_v2
USING iceberg
PARTITIONED BY (days(order_date))
AS SELECT * FROM hive_catalog.db.orders_hive;
```

This copies all data — suitable for large schema changes or when storage is cheap relative to the migration risk.

## Post-Migration Steps

After migration:

1. **Validate**: Run count queries, spot-check samples against the original.
2. **Update pipelines**: Point ingestion and consumption jobs to the Iceberg table.
3. **Configure properties**: Set retention, write modes, compression for the new table.
4. **Compact**: Run `rewrite_data_files` to optimize file sizes (Hive tables often have uneven file sizes).
5. **Update catalog**: If switching from Hive Metastore to a REST Catalog (Apache Polaris), register the migrated table.

## Migrating Partitioning During Migration

Hive partition columns (e.g., `year`, `month`, `day`) are often redundant in Iceberg since hidden partitioning eliminates them. Post-migration, you can evolve the partition spec to use hidden partitioning and drop the synthetic partition columns from the schema:

```sql
-- After migration, evolve partitioning to use hidden partitioning
ALTER TABLE db.orders REPLACE PARTITION FIELD identity(year) WITH year(order_date);
ALTER TABLE db.orders REPLACE PARTITION FIELD identity(month) WITH month(order_date);
ALTER TABLE db.orders DROP COLUMN year;
ALTER TABLE db.orders DROP COLUMN month;
```
