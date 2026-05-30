---
term: "Hive Metastore Catalog for Iceberg"
description: "The Hive Metastore (HMS) is the original Iceberg catalog implementation, using a relational database to store Iceberg table metadata file pointers, providing broad compatibility with existing Hadoop ecosystem deployments."
category: "Catalogs"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-rest-catalog"
  - "apache-polaris-catalog"
  - "spark-apache-iceberg"
  - "what-is-apache-iceberg"
keywords:
  - hive metastore iceberg
  - hms iceberg catalog
  - iceberg hive catalog
  - hive metastore table format
  - iceberg migration from hive
lastUpdated: 2026-05-14
---

## Hive Metastore Catalog for Apache Iceberg

The **Hive Metastore (HMS)** is the original and most widely deployed metadata catalog in the Hadoop ecosystem, and it serves as one of the earliest (and still widely used) catalog implementations for Apache Iceberg. It provides a familiar entry point for teams migrating from Hive tables to Iceberg, since HMS is already deployed in most enterprise data platforms.

## What the Hive Metastore Does

At its core, the Hive Metastore is a **relational database** (backed by MySQL, PostgreSQL, Derby, or Oracle) that stores metadata about tables, databases, partitions, and column definitions. For traditional Hive tables, HMS stores the full schema, partition values, and storage location in its database.

For Iceberg tables, HMS is used more minimally: it stores the **table location** and a special `metadata_location` property that points to the current Iceberg metadata file in object storage. The Iceberg catalog implementation in HMS writes and updates this property on every table commit.

## HMS as an Iceberg Catalog: How It Works

When using HMS as an Iceberg catalog:

1. HMS stores the Iceberg table's metadata file location in its database as a table property.
2. On every Iceberg commit, the catalog implementation atomically updates `metadata_location` in HMS using a database transaction.
3. Readers query HMS for the table's `metadata_location`, then traverse the Iceberg metadata hierarchy in object storage.

The HMS provides the **atomic commit primitive** through database-level transactions: the same compare-and-swap semantics that Iceberg needs for ACID guarantees.

## Configuration: Spark with HMS Iceberg Catalog

```python
spark = SparkSession.builder \
    .config("spark.sql.catalog.hive_prod", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.hive_prod.type", "hive") \
    .config("spark.sql.catalog.hive_prod.uri", "thrift://metastore-host:9083") \
    .config("spark.sql.catalog.hive_prod.warehouse", "s3://bucket/warehouse/") \
    .getOrCreate()
```

## Migrating from Hive Tables to Iceberg via HMS

One of the most practical uses of HMS as an Iceberg catalog is **in-place migration** of existing Hive tables to Iceberg format:

```sql
-- Spark SQL: migrate a Hive table to Iceberg in place
CALL spark_catalog.system.migrate('db.orders');
```

This call converts the existing Hive table's metadata in HMS to Iceberg format **without copying data files**. The existing Parquet files are registered in Iceberg manifests, and the HMS table entry is updated to mark it as an Iceberg table. This enables zero-downtime migration paths.

## Limitations of HMS as an Iceberg Catalog

While HMS works for Iceberg, it has important limitations compared to modern catalog options:

1. **No REST Catalog API**: HMS uses the Thrift protocol, which is JVM-specific and not language-agnostic. Python clients (PyIceberg) and other non-JVM tools require workarounds.

2. **Performance**: HMS queries involve a roundtrip to a relational database for every table operation. Under high concurrency, the database can become a bottleneck.

3. **No credential vending**: HMS does not support the REST Catalog credential vending spec.

4. **Single point of failure**: Without careful HA configuration, HMS is a SPOF for all Iceberg operations.

5. **No branching/tagging**: HMS has no concept of catalog-level branching (unlike Nessie).

## Recommended Migration Path

For most teams, HMS is the right starting point if you already have HMS deployed and are migrating from Hive. Over time, migrating to a REST Catalog implementation (Apache Polaris, AWS Glue, or Project Nessie) provides:

- Broader engine compatibility via the standard REST API
- Better performance and scalability
- Credential vending for multi-engine security
- Language-agnostic client support (Python, Rust, Go)

Migrating between Iceberg catalogs is a **metadata-only operation**: the underlying data files don't move. You update the catalog registration, and all engines immediately use the new catalog.
