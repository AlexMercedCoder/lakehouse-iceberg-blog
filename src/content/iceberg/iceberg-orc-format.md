---
term: "Apache Iceberg ORC Format"
description: "Apache ORC (Optimized Row Columnar) is an alternative columnar storage format supported by Apache Iceberg alongside Parquet, commonly used in Iceberg tables migrated from Hive ORC workloads and in environments where ORC's native ACID capabilities were previously relied upon."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-parquet"
  - "iceberg-data-files"
  - "iceberg-migration-hive"
  - "iceberg-table-format"
  - "iceberg-hive-metastore"
keywords:
  - iceberg orc format
  - apache orc iceberg
  - iceberg orc parquet comparison
  - orc iceberg tables
  - orc columnar format iceberg
lastUpdated: 2026-05-14
---

## Apache ORC in Apache Iceberg

**Apache ORC** (Optimized Row Columnar) is a columnar storage format developed by Hortonworks (now part of Cloudera) and now maintained as an Apache top-level project. Apache Iceberg supports ORC as one of its three natively supported data file formats (alongside Parquet and Avro), giving teams flexibility in their choice of storage format.

While **Parquet is the dominant format** for Iceberg tables in most modern deployments, ORC remains relevant for organizations migrating from Hive ORC workloads and certain specific use cases.

## ORC vs. Parquet in Iceberg

Both ORC and Parquet are columnar formats with similar goals. The differences matter primarily in legacy contexts:

| Feature           | ORC                                      | Parquet                               |
| ----------------- | ---------------------------------------- | ------------------------------------- |
| Origin            | Hortonworks (Hive ecosystem)             | Twitter + Cloudera (broad ecosystem)  |
| Compression       | Zlib, Snappy, LZ4, Zstd                  | Gzip, Snappy, LZ4, Zstd               |
| Column statistics | Min/max, null count, sum, distinct count | Min/max, null count                   |
| Native ACID       | Yes (Hive ACID relied on ORC)            | No (Iceberg handles ACID)             |
| Index structures  | Row index, bloom filters                 | Row group statistics, bloom filters   |
| Nested types      | Good                                     | Excellent (Parquet Dremel encoding)   |
| Ecosystem support | Strong in Hive/Hadoop                    | Broader (Spark, Dremio, Trino, Arrow) |
| Iceberg adoption  | Minority                                 | Dominant                              |

## When ORC Appears in Iceberg

### 1. Hive ORC Migration (Most Common)

Organizations migrating from Hive tables where ORC was the default (Hive 0.x–3.x defaulted to ORC for ACID tables) will produce Iceberg tables with ORC data files after an in-place migration:

```sql
-- After migrate, the table is Iceberg but data files are still ORC
CALL spark_catalog.system.migrate('db.hive_orc_table');
-- Table is now Iceberg with ORC data files (valid — Iceberg reads ORC natively)
```

Post-migration, you can leave the ORC files in place (Iceberg reads them) or convert to Parquet via compaction:

```sql
-- Convert ORC files to Parquet during compaction
ALTER TABLE db.orders SET TBLPROPERTIES ('write.format.default' = 'parquet');
CALL system.rewrite_data_files(
    table => 'db.orders',
    options => map('write-format', 'parquet')
);
-- Old ORC files are replaced with Parquet during compaction
```

### 2. Specific ORC Advantages

ORC's richer built-in statistics (sum, distinct count at the stripe level) can benefit some query planners that are optimized for ORC. In practice, Iceberg's manifest-level statistics supersede most of these advantages.

### 3. Hive Compatibility

If the same Iceberg table must remain readable by Apache Hive (which has excellent ORC native support), keeping ORC format ensures maximum Hive compatibility.

## Writing ORC Iceberg Tables

```sql
-- Create a new Iceberg table with ORC format
CREATE TABLE db.events (
    event_id BIGINT,
    user_id  BIGINT,
    event_ts TIMESTAMP,
    payload  STRING
) USING iceberg
TBLPROPERTIES ('write.format.default' = 'orc');

-- Per-write ORC override
INSERT INTO db.orders /*+ FORMAT('orc') */
SELECT * FROM staging.new_orders;
```

## ORC Compression in Iceberg

ORC supports multiple compression codecs:

```sql
ALTER TABLE db.events SET TBLPROPERTIES (
    'write.format.default' = 'orc',
    'write.orc.compression-codec' = 'zstd',  -- or: zlib, snappy, lz4, none
    'write.orc.compression-strategy' = 'speed'  -- or: compression
);
```

## Recommendation: ORC vs. Parquet for New Tables

For new Iceberg table creation:

- **Default to Parquet**: Better ecosystem support, broader tool compatibility, better nested type encoding, lower overhead for most analytics workloads.
- **Use ORC if**: You're migrating from Hive ORC (leave in place for initial migration, convert during compaction), or your query engine has documented superior performance with ORC.

For mixed-format tables (some ORC files, some Parquet after migration), Iceberg handles the format mix transparently — each data file entry in the manifest records its own format, and the reader handles format detection per file.
