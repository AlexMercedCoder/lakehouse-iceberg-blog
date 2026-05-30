---
term: "Iceberg JDBC Catalog"
description: "The Iceberg JDBC Catalog uses any JDBC-compatible relational database (PostgreSQL, MySQL, SQLite) as a persistent metadata store for Iceberg table catalog information, making it a popular choice for self-hosted, development, and single-writer production deployments."
category: "Catalogs"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-rest-catalog"
  - "project-nessie"
  - "iceberg-hive-metastore"
  - "iceberg-concurrent-writes"
keywords:
  - iceberg jdbc catalog
  - iceberg postgresql catalog
  - iceberg mysql catalog
  - iceberg self-hosted catalog
  - iceberg relational catalog
lastUpdated: 2026-05-14
---

## Iceberg JDBC Catalog

The **Iceberg JDBC Catalog** is a catalog backend that stores Iceberg table metadata in any JDBC-compatible relational database: PostgreSQL, MySQL, MariaDB, SQLite, and others. It provides a simple, persistent, self-hosted alternative to the Hive Metastore (no Thrift server required) and is particularly popular for:

- Local development and testing (SQLite-backed JDBC catalog).
- Self-hosted production deployments where teams want full control over catalog storage.
- Environments where a cloud-managed catalog (Glue, Polaris) is not available or desired.

## How the JDBC Catalog Works

The JDBC Catalog creates and maintains three tables in the backing database:

| Table                          | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `iceberg_tables`               | Maps table identifiers to current metadata file location |
| `iceberg_namespace_properties` | Stores namespace-level properties                        |
| `iceberg_table_properties`     | Stores table-level catalog properties                    |

These tables are created automatically when the JDBC Catalog is initialized. Catalog operations (create table, rename table, drop table, update metadata pointer) are all JDBC transactions against these tables.

The backing database provides the **atomicity guarantee** for concurrent writes: all catalog updates are wrapped in database transactions, ensuring that concurrent writers see consistent metadata.

## Configuration (Apache Spark)

### PostgreSQL-backed JDBC Catalog

```python
spark = SparkSession.builder \
    .config("spark.sql.catalog.my_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.my_catalog.catalog-impl", "org.apache.iceberg.jdbc.JdbcCatalog") \
    .config("spark.sql.catalog.my_catalog.uri",
            "jdbc:postgresql://postgres-host:5432/iceberg_catalog") \
    .config("spark.sql.catalog.my_catalog.jdbc.user", "iceberg_user") \
    .config("spark.sql.catalog.my_catalog.jdbc.password", "secret") \
    .config("spark.sql.catalog.my_catalog.warehouse", "s3://my-bucket/warehouse") \
    .getOrCreate()
```

### SQLite-backed JDBC Catalog (Development)

```python
spark = SparkSession.builder \
    .config("spark.sql.catalog.local", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.local.catalog-impl", "org.apache.iceberg.jdbc.JdbcCatalog") \
    .config("spark.sql.catalog.local.uri", "jdbc:sqlite:/tmp/iceberg-catalog.db") \
    .config("spark.sql.catalog.local.warehouse", "file:///tmp/iceberg-warehouse") \
    .getOrCreate()

# Create tables and work with Iceberg locally: no external services needed
spark.sql("CREATE TABLE local.db.test_table (id BIGINT, value STRING) USING iceberg")
spark.sql("INSERT INTO local.db.test_table VALUES (1, 'hello')")
spark.sql("SELECT * FROM local.db.test_table").show()
```

## Configuration (PyIceberg)

```python
from pyiceberg.catalog.sql import SqlCatalog

# PostgreSQL
catalog = SqlCatalog(
    "my_catalog",
    **{
        "uri": "postgresql+psycopg2://user:password@postgres-host/iceberg_db",
        "warehouse": "s3://my-bucket/warehouse",
    }
)

# SQLite (development)
catalog = SqlCatalog(
    "local",
    **{
        "uri": "sqlite:////tmp/iceberg_catalog.db",
        "warehouse": "file:////tmp/iceberg-warehouse",
    }
)

# Create namespace and table
catalog.create_namespace("analytics")
catalog.create_table(
    identifier="analytics.orders",
    schema=Schema(
        NestedField(1, "order_id", LongType()),
        NestedField(2, "total", DoubleType()),
    )
)
```

## JDBC Catalog vs. Other Catalogs

| Aspect                  | JDBC                  | Hive Metastore        | REST (Polaris)       | AWS Glue        |
| ----------------------- | --------------------- | --------------------- | -------------------- | --------------- |
| External service needed | Database only         | Thrift server + DB    | REST server          | AWS managed     |
| Multi-engine support    | Limited               | Yes (Thrift protocol) | Excellent (REST API) | Yes (AWS only)  |
| Credential vending      | No                    | No                    | Yes                  | Partial         |
| RBAC                    | Database-level only   | Limited               | Full                 | Via IAM/LF      |
| Best for                | Dev, self-hosted prod | Legacy Hive migration | Multi-engine prod    | AWS-native prod |

## Concurrency Considerations

The JDBC Catalog relies on database-level optimistic locking:

- Concurrent commits are serialized via database transactions.
- High concurrency (many simultaneous writers) can cause lock contention.
- PostgreSQL and MySQL handle this well up to moderate concurrency (dozens of simultaneous writers).
- SQLite is **single-writer only** and should only be used for development.

For high-concurrency production workloads, the Iceberg REST Catalog (Apache Polaris) or Project Nessie provide better concurrency characteristics.

## Use Case: Local Development with Docker

A common development setup uses Docker Compose:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: iceberg_catalog
      POSTGRES_USER: iceberg
      POSTGRES_PASSWORD: iceberg_password
    ports: ["5432:5432"]

  spark:
    image: apache/spark:3.5.0
    environment:
      SPARK_CATALOG_URI: jdbc:postgresql://postgres:5432/iceberg_catalog
      SPARK_CATALOG_USER: iceberg
      SPARK_CATALOG_PASSWORD: iceberg_password
    depends_on: [postgres]
```

This gives developers a fully local Iceberg environment with a real, persistent JDBC catalog: no AWS credentials, no cloud services, no Hive Metastore.
