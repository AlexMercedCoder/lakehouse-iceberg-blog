---
term: "Hive and Apache Iceberg"
description: "Apache Hive 4.x has native Iceberg support, enabling Hive SQL to read and write Iceberg tables as first-class objects while the Hive Metastore continues to serve as the Iceberg catalog for organizations with existing HMS infrastructure."
category: "Engines & Integrations"
relatedTerms:
  - "iceberg-hive-metastore"
  - "iceberg-migration-hive"
  - "spark-apache-iceberg"
  - "what-is-apache-iceberg"
  - "iceberg-schema-evolution"
keywords:
  - hive iceberg
  - apache hive apache iceberg
  - hive 4 iceberg tables
  - hiveserver2 iceberg
  - hive metastore iceberg
lastUpdated: 2026-05-14
---

## Apache Hive and Apache Iceberg

**Apache Hive**: historically the dominant SQL query engine for Hadoop-based data lakes: has evolved to support Apache Iceberg as a first-class table format. Hive 4.x and later treat Iceberg tables as native objects, enabling full Hive SQL DML operations against Iceberg tables while maintaining backward compatibility with legacy Hive SerDe tables.

For organizations with large Hive investments (Hive warehouses, Hive SQL workflows, HiveServer2 infrastructure), native Iceberg support provides an upgrade path to modern lakehouse capabilities without immediately replacing all Hive infrastructure.

## Hive 4.x Iceberg Support

Hive 4.0 (released 2023) introduced comprehensive Iceberg support:

- Full DDL: CREATE TABLE, ALTER TABLE, DROP TABLE.
- Full DML: INSERT, INSERT OVERWRITE, UPDATE, DELETE, MERGE INTO.
- Time travel: SELECT with snapshot ID or timestamp.
- Metadata tables: access to `$snapshots`, `$history`, `$files`.
- Schema evolution: ADD COLUMN, RENAME COLUMN, DROP COLUMN.
- Partition evolution: ALTER TABLE SET PARTITION SPEC.

## Creating Iceberg Tables in Hive

```sql
-- Create an Iceberg table via Hive SQL
CREATE TABLE orders (
    order_id     BIGINT,
    customer_id  BIGINT,
    total        DOUBLE,
    order_date   DATE,
    status       STRING
)
STORED BY ICEBERG    -- Iceberg storage handler
STORED AS PARQUET
LOCATION 'hdfs:///warehouse/orders/'
TBLPROPERTIES (
    'format-version' = '2',    -- always use v2
    'partitioning' = 'months(order_date)'
);
```

## Full DML in Hive

```sql
-- INSERT
INSERT INTO orders VALUES (1001, 42, 150.00, '2026-05-14', 'pending');

-- UPDATE (row-level, MoR)
UPDATE orders SET status = 'shipped' WHERE order_id = 1001;

-- DELETE
DELETE FROM orders WHERE order_date < '2020-01-01';

-- MERGE INTO (upsert)
MERGE INTO orders AS target
USING updates AS source
ON target.order_id = source.order_id
WHEN MATCHED THEN UPDATE SET status = source.status, total = source.total
WHEN NOT MATCHED THEN INSERT VALUES (
    source.order_id, source.customer_id, source.total,
    source.order_date, source.status
);
```

## Time Travel in Hive

```sql
-- Query as of a specific snapshot ID
SELECT * FROM orders FOR SYSTEM_VERSION AS OF 8027658604211071520;

-- Query as of a timestamp
SELECT * FROM orders FOR SYSTEM_TIME AS OF '2026-05-14 10:00:00';

-- View snapshot history
SELECT * FROM orders$snapshots;
```

## Hive Metastore as Iceberg Catalog

The Hive Metastore (HMS) serves as the Iceberg catalog for Hive-managed Iceberg tables. HMS stores the mapping from table name to current Iceberg metadata file location, updated on each commit.

This is the same HMS used by Spark, Flink, and Trino for Iceberg tables when configured with the `hive` catalog type, enabling multi-engine access to Hive-registered Iceberg tables.

## Hive + Iceberg in the Migration Context

For Hive shop migrations to a modern lakehouse:

**Step 1**: Migrate existing Hive tables to Iceberg format (in-place, no data copy).
**Step 2**: Continue using Hive SQL for existing workflows: they now run against Iceberg.
**Step 3**: Gradually add Spark, Dremio, or Trino for workloads where Hive is slow.
**Step 4**: Optionally migrate the catalog from HMS to Apache Polaris when ready.

This incremental approach allows organizations to adopt Iceberg's benefits without a "rip and replace" migration.

## Hive vs. Modern Engines for Iceberg

| Aspect              | Hive 4.x                    | Spark              | Dremio                  |
| ------------------- | --------------------------- | ------------------ | ----------------------- |
| Iceberg support     | Full (v4.x+)                | Full               | Full                    |
| SQL compatibility   | HiveQL                      | Spark SQL          | ANSI SQL / DremioSQL    |
| Interactive queries | Slow (batch-oriented)       | Moderate           | Excellent (sub-second)  |
| AI integration      | No                          | No                 | Yes (AI Semantic Layer) |
| Best for            | Legacy migration, batch ETL | Large-scale ETL/ML | Analytics, AI, BI       |

Hive's role in the modern lakehouse is as a **migration bridge**, enabling organizations to adopt Iceberg incrementally without abandoning their Hive investments, while transitioning analytics workloads to faster, more capable engines over time.
