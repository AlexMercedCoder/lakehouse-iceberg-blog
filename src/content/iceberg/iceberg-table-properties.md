---
term: "Iceberg Table Properties"
metaTitle: "Iceberg Table Properties: Defaults and Recipes (1.12)"
description: "Iceberg table properties are key-value settings in metadata.json that control file format, compression, file size, and DML mode. See 1.12 defaults and recipes."
category: "Core Concepts"
relatedTerms:
  - "iceberg-metadata-file"
  - "iceberg-compaction"
  - "iceberg-expire-snapshots"
  - "iceberg-copy-on-write"
  - "iceberg-merge-on-read"
  - "iceberg-parquet"
keywords:
  - iceberg table properties
  - iceberg tblproperties
  - iceberg configuration
  - iceberg table settings
  - iceberg write properties
lastUpdated: 2026-10-15
---

## Iceberg Table Properties

Iceberg table properties are key-value settings saved in the table's metadata file. You set them with `TBLPROPERTIES` or `ALTER TABLE ... SET TBLPROPERTIES`, and they control file format, compression, file size, DML write mode, and snapshot retention defaults. Defaults below are from the Iceberg 1.12.0 configuration docs.

**Table properties** in Apache Iceberg are key-value configuration settings stored in the table's metadata file (`metadata.json`) under the `properties` map. They control a wide range of table behaviors: from write format and compression to snapshot retention policy and DML write modes, without requiring changes to the underlying data files.

Table properties are set at table creation or modified at any time using `ALTER TABLE ... SET TBLPROPERTIES`.

## Setting Table Properties

```sql
-- At creation
CREATE TABLE db.orders (order_id BIGINT, total DOUBLE)
USING iceberg
TBLPROPERTIES (
  'write.format.default' = 'parquet',
  'write.parquet.compression-codec' = 'zstd',
  'write.target-file-size-bytes' = '268435456'
);

-- After creation
ALTER TABLE db.orders SET TBLPROPERTIES (
  'write.delete.mode' = 'merge-on-read',
  'history.expire.max-snapshot-age-ms' = '604800000'
);

-- Unset a property
ALTER TABLE db.orders UNSET TBLPROPERTIES ('write.delete.mode');
```

## Key Table Property Categories

### Write Format Properties

| Property                             | Values                                                    | Description                                  |
| ------------------------------------ | --------------------------------------------------------- | -------------------------------------------- |
| `write.format.default`               | `parquet`, `orc`, `avro`                                  | Default data file format (default `parquet`) |
| `write.parquet.compression-codec`    | `zstd`, `brotli`, `lz4`, `gzip`, `snappy`, `uncompressed` | Parquet compression (default `zstd`)         |
| `write.parquet.row-group-size-bytes` | bytes                                                     | Parquet row group size (default 128 MB)      |
| `write.parquet.page-size-bytes`      | bytes                                                     | Parquet page size (default 1 MB)             |
| `write.target-file-size-bytes`       | bytes                                                     | Target data file size (default 512 MB)       |

### DML Write Mode Properties

| Property            | Values                           | Description                                          |
| ------------------- | -------------------------------- | ---------------------------------------------------- |
| `write.delete.mode` | `copy-on-write`, `merge-on-read` | Mode for DELETE operations (default `copy-on-write`) |
| `write.update.mode` | `copy-on-write`, `merge-on-read` | Mode for UPDATE operations (default `copy-on-write`) |
| `write.merge.mode`  | `copy-on-write`, `merge-on-read` | Mode for MERGE operations (default `copy-on-write`)  |

### Snapshot Retention Properties

| Property                               | Values       | Description                                                                  |
| -------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| `history.expire.max-snapshot-age-ms`   | milliseconds | Default max snapshot age used when snapshot expiration runs (default 5 days) |
| `history.expire.min-snapshots-to-keep` | integer      | Min snapshots to retain regardless of age (default 1)                        |
| `history.expire.max-ref-age-ms`        | milliseconds | Max age of branch and tag references (default: never expire)                 |

These properties do not delete anything on their own. They supply the defaults that `expire_snapshots` (Spark procedure, Athena `VACUUM`, or a managed service) uses when it runs.

### Distribution and WAP Properties

| Property                  | Values                  | Description                                                     |
| ------------------------- | ----------------------- | --------------------------------------------------------------- |
| `write.distribution-mode` | `none`, `hash`, `range` | How to distribute data across writers (engine default if unset) |
| `write.wap.enabled`       | `true`, `false`         | Enable Write-Audit-Publish mode (default `false`)               |

### Metadata Properties

| Property                                     | Values          | Description                                              |
| -------------------------------------------- | --------------- | -------------------------------------------------------- |
| `write.metadata.delete-after-commit.enabled` | `true`, `false` | Delete old metadata files after commit (default `false`) |
| `write.metadata.previous-versions-max`       | integer         | Max old metadata versions to track (default 100)         |
| `commit.retry.num-retries`                   | integer         | Number of commit retries on conflict (default 4)         |
| `commit.retry.min-wait-ms`                   | milliseconds    | Min wait between retries (default 100)                   |

### Format Version and Delete Properties

| Property                         | Values                  | Description                                                                                                                |
| -------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `format-version`                 | `1`, `2`, `3`           | Iceberg spec version for the table (default 2 since Iceberg 1.4.0; set 3 for deletion vectors, row lineage, and new types) |
| `write.delete.distribution-mode` | `none`, `hash`, `range` | Delete file distribution                                                                                                   |

## Common Configuration Recipes

### High-Throughput Streaming Table (MoR)

```sql
TBLPROPERTIES (
  'write.format.default' = 'parquet',
  'write.parquet.compression-codec' = 'zstd',
  'write.delete.mode' = 'merge-on-read',
  'write.update.mode' = 'merge-on-read',
  'write.merge.mode' = 'merge-on-read',
  'write.target-file-size-bytes' = '134217728',  -- 128MB (smaller for streaming)
  'history.expire.max-snapshot-age-ms' = '86400000'  -- 1 day
)
```

### BI-Serving Aggregation Table (CoW)

```sql
TBLPROPERTIES (
  'write.format.default' = 'parquet',
  'write.parquet.compression-codec' = 'zstd',
  'write.delete.mode' = 'copy-on-write',
  'write.update.mode' = 'copy-on-write',
  'write.merge.mode' = 'copy-on-write',
  'write.target-file-size-bytes' = '268435456',  -- 256MB
  'history.expire.max-snapshot-age-ms' = '604800000'  -- 7 days
)
```

### Compliance Table (Long Retention)

```sql
TBLPROPERTIES (
  'history.expire.max-snapshot-age-ms' = '7776000000',   -- 90 days (applied when expiration runs)
  'history.expire.min-snapshots-to-keep' = '30',
  'write.delete.mode' = 'merge-on-read'
)
```

## Viewing Current Table Properties

```sql
-- Spark
SHOW TBLPROPERTIES db.orders;

-- PyIceberg
table = catalog.load_table("db.orders")
print(table.properties)

-- Output: dict of all current property key-value pairs
```

## Engine-Specific vs. Standard Properties

Some table properties are standard Iceberg spec properties (respected by all engines). Others are engine-specific hints:

- **Core**: `write.format.default`, `write.delete.mode`, `history.expire.*` (defined in the Iceberg configuration docs, though engines vary in what they honor; Athena, for example, always uses merge-on-read)
- **Spark-specific**: `write.spark.*` hints
- **Flink-specific**: `flink.*` configurations

Core properties should be preferred for maximum portability across engines.
