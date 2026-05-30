---
term: "Iceberg Table Properties"
description: "Iceberg table properties are key-value configuration settings stored in the table metadata that control write behavior, file format, partitioning defaults, snapshot retention, delete strategies, and performance tuning parameters for Apache Iceberg tables."
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
lastUpdated: 2026-05-14
---

## Iceberg Table Properties

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

| Property                             | Values                           | Description                           |
| ------------------------------------ | -------------------------------- | ------------------------------------- |
| `write.format.default`               | `parquet`, `orc`, `avro`         | Default data file format              |
| `write.parquet.compression-codec`    | `snappy`, `zstd`, `gzip`, `none` | Parquet compression                   |
| `write.parquet.row-group-size-bytes` | bytes                            | Parquet row group size                |
| `write.parquet.page-size-bytes`      | bytes                            | Parquet page size                     |
| `write.target-file-size-bytes`       | bytes                            | Target data file size (default 512MB) |

### DML Write Mode Properties

| Property            | Values                           | Description                |
| ------------------- | -------------------------------- | -------------------------- |
| `write.delete.mode` | `copy-on-write`, `merge-on-read` | Mode for DELETE operations |
| `write.update.mode` | `copy-on-write`, `merge-on-read` | Mode for UPDATE operations |
| `write.merge.mode`  | `copy-on-write`, `merge-on-read` | Mode for MERGE operations  |

### Snapshot Retention Properties

| Property                               | Values       | Description                               |
| -------------------------------------- | ------------ | ----------------------------------------- |
| `history.expire.max-snapshot-age-ms`   | milliseconds | Auto-expire snapshots older than this     |
| `history.expire.min-snapshots-to-keep` | integer      | Min snapshots to retain regardless of age |

### Sort Order Properties

| Property                  | Values                  | Description                           |
| ------------------------- | ----------------------- | ------------------------------------- |
| `write.distribution-mode` | `none`, `hash`, `range` | How to distribute data across writers |
| `write.wap.enabled`       | `true`, `false`         | Enable Write-Audit-Publish mode       |

### Metadata Properties

| Property                                     | Values          | Description                            |
| -------------------------------------------- | --------------- | -------------------------------------- |
| `write.metadata.delete-after-commit.enabled` | `true`, `false` | Delete old metadata files after commit |
| `write.metadata.previous-versions-max`       | integer         | Max old metadata versions to keep      |
| `commit.retry.num-retries`                   | integer         | Number of commit retries on conflict   |
| `commit.retry.min-wait-ms`                   | milliseconds    | Min wait between retries               |

### Spec v2 / Delete-specific Properties

| Property                         | Values                  | Description                        |
| -------------------------------- | ----------------------- | ---------------------------------- |
| `format-version`                 | `1`, `2`                | Iceberg spec version for the table |
| `write.delete.distribution-mode` | `none`, `hash`, `range` | Delete file distribution           |

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
  'history.expire.max-snapshot-age-ms' = '7776000000',   -- 90 days
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

- **Standard**: `write.format.default`, `write.delete.mode`, `history.expire.*`
- **Spark-specific**: `write.spark.*` hints
- **Flink-specific**: `flink.*` configurations

Standard properties should be preferred for maximum portability across engines.
