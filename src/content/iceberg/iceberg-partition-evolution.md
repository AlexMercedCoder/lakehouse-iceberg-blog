---
term: "Partition Evolution in Apache Iceberg"
description: "Partition evolution in Apache Iceberg lets you change a table's partitioning scheme at any time without rewriting existing data, with old and new partitions coexisting transparently and queries spanning both automatically."
category: "Core Concepts"
relatedTerms:
  - "iceberg-hidden-partitioning"
  - "iceberg-snapshot"
  - "iceberg-table-format"
  - "iceberg-manifest-file"
  - "iceberg-schema-evolution"
keywords:
  - iceberg partition evolution
  - change iceberg partitioning
  - iceberg repartition without rewrite
  - partition spec evolution
lastUpdated: 2026-05-14
---

## Partition Evolution in Apache Iceberg

**Partition evolution** is the ability to change an Iceberg table's partitioning strategy: without rewriting any existing data and without breaking queries that span the old and new partition schemes. This is one of the most operationally important features of Iceberg for long-lived production tables.

In Hive, changing partitioning requires either creating a new table and migrating all data, or living with a suboptimal partition scheme forever. In Iceberg, changing partitioning is a metadata-only operation that takes effect immediately.

## How Partition Evolution Works

Each **partition spec** in Iceberg has a unique `spec-id`. The table metadata file maintains the full history of all partition specs the table has ever used. Each **manifest file** records the `spec-id` of the partition spec that was active when it was written.

When you evolve the partition spec, new data files are written using the new spec. Old data files continue to use their original spec. When a query runs:

1. Iceberg reads all manifest files.
2. For manifests written with the old spec, it applies the old partition pruning logic.
3. For manifests written with the new spec, it applies the new partition pruning logic.
4. Results are merged transparently.

Readers never need to know that a partition evolution occurred.

## Common Evolution Scenarios

### Scenario 1: Monthly → Daily Partitioning

A table that started with monthly partitions outgrows that granularity:

```sql
-- Original table: partitioned by month
CREATE TABLE events (event_id BIGINT, event_time TIMESTAMP, region STRING)
USING iceberg PARTITIONED BY (month(event_time));

-- After 2 years of monthly data, evolve to daily partitioning:
ALTER TABLE events REPLACE PARTITION FIELD month(event_time) WITH day(event_time);
```

All new writes use daily partitions. All old monthly partitions remain in place and are queried correctly. A query spanning both years uses both partition schemes transparently.

### Scenario 2: Adding a Second Partition Dimension

```sql
-- Add region as a second partition field for better data locality:
ALTER TABLE events ADD PARTITION FIELD identity(region);
```

Going forward, data is partitioned by both `day(event_time)` and `region`. Historical data has only the time partition: queries filter on `region` using column statistics from manifest files for old data, and partition pruning for new data.

### Scenario 3: Dropping a Partition Field

```sql
ALTER TABLE events DROP PARTITION FIELD identity(region);
```

Removes region partitioning going forward while leaving historical region-partitioned data intact.

## Partition Evolution vs. Schema Evolution

| Aspect                 | Schema Evolution                | Partition Evolution                  |
| ---------------------- | ------------------------------- | ------------------------------------ |
| What changes           | Column structure (names, types) | Physical file organization strategy  |
| Data rewrite required  | No                              | No                                   |
| Old data compatibility | Full (via column IDs)           | Full (via spec-id tracking)          |
| Applies to             | All future and past snapshots   | New writes only (old data unchanged) |

## When to Evolve Partitions

Common triggers for partition evolution:

- **Table growth**: A table that started with monthly partitions becomes too large: daily or hourly partitions reduce query scan size.
- **Query pattern changes**: Analytics that were region-agnostic now filter heavily by region: add region as a partition field.
- **Bucket count adjustment**: A bucketed table's distribution becomes skewed: increase bucket count.
- **Reducing over-partitioning**: A table with hourly partitions generates too many small files: consolidate to daily.

## Partition Evolution and Maintenance

When partition evolution leaves old and new partition schemes coexisting, maintenance operations (compaction, file expiration) need to handle both. Production Iceberg platforms like Dremio handle this automatically as part of their table optimization services, ensuring that mixed-spec tables remain performant without manual intervention.

## Partition Evolution Without Downtime

The entire partition evolution operation is a **metadata-only commit**: it takes milliseconds and requires no table lock. Readers and writers continue operating on the table uninterrupted throughout the evolution.

This zero-downtime capability is what makes partition evolution viable for production tables with continuous ingestion pipelines: you can reshape your partition scheme without scheduling a maintenance window.
