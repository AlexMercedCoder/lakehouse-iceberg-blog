---
title: "Migrating to Apache Iceberg: Strategies for Every Source System"
pubDatetime: 2026-04-29T12:14:00Z
date: "2026-04-29"
description: "Migrate to Iceberg from Hive, data warehouses, or raw files using in-place migration, full rewrite, or the zero-downtime view swap pattern."
author: "Alex Merced"
category: "Data Engineering"
tags:
  - migrating to Apache Iceberg
  - Hive to Iceberg migration
  - Iceberg migration strategy
  - view swap migration
slug: 2026-04-29-iceberg-masterclass-15
draft: false
---

## Apache Iceberg Masterclass - Table of Contents

1. [What Are Table Formats and Why Were They Needed?](/posts/2026-04-29-iceberg-masterclass-01/)
2. [The Metadata Structure of Modern Table Formats](/posts/2026-04-29-iceberg-masterclass-02/)
3. [Performance and Apache Iceberg's Metadata](/posts/2026-04-29-iceberg-masterclass-03/)
4. [Partition Evolution: Change Your Partitioning Without Rewriting Data](/posts/2026-04-29-iceberg-masterclass-04/)
5. [Hidden Partitioning: How Iceberg Eliminates Accidental Full Table Scans](/posts/2026-04-29-iceberg-masterclass-05/)
6. [Writing to an Apache Iceberg Table: How Commits and ACID Actually Work](/posts/2026-04-29-iceberg-masterclass-06/)
7. [What Are Lakehouse Catalogs? The Role of Catalogs in Apache Iceberg](/posts/2026-04-29-iceberg-masterclass-07/)
8. [When Catalogs Are Embedded in Storage](/posts/2026-04-29-iceberg-masterclass-08/)
9. [How Data Lake Table Storage Degrades Over Time](/posts/2026-04-29-iceberg-masterclass-09/)
10. [Maintaining Apache Iceberg Tables: Compaction, Expiry, and Cleanup](/posts/2026-04-29-iceberg-masterclass-10/)
11. [Apache Iceberg Metadata Tables: Querying the Internals](/posts/2026-04-29-iceberg-masterclass-11/)
12. [Using Apache Iceberg with Python and MPP Query Engines](/posts/2026-04-29-iceberg-masterclass-12/)
13. [Approaches to Streaming Data into Apache Iceberg Tables](/posts/2026-04-29-iceberg-masterclass-13/)
14. [Hands-On with Apache Iceberg Using Dremio Cloud](/posts/2026-04-29-iceberg-masterclass-14/)
15. [Migrating to Apache Iceberg: Strategies for Every Source System](/posts/2026-04-29-iceberg-masterclass-15/)

This is Part 15, the final article of a 15-part [Apache Iceberg Masterclass](/posts/2026-04-29-iceberg-masterclass-01/). [Part 14](/posts/2026-04-29-iceberg-masterclass-14/) covered hands-on Dremio Cloud. This article covers the three migration strategies and how to execute a zero-downtime migration using the view swap pattern.

Most organizations do not start with Iceberg. They have years of data in Hive tables, data warehouses, CSV files, databases, and Parquet directories. Moving this data to Iceberg is not an all-or-nothing project. The best migrations happen incrementally, one dataset at a time, with no disruption to existing consumers.

## Three Migration Strategies

![Three paths to Iceberg: in-place migration, full rewrite, and shadow migration](/assets/images/2026/apache-iceberg-masterclass/migration-strategies.png)

### 1. In-Place Migration (Metadata Only)

In-place migration creates Iceberg metadata over existing Parquet or ORC files without copying or moving them. The data files stay exactly where they are; only new Iceberg metadata is created to track them.

**Spark example:**

```sql
CALL system.migrate('db.existing_hive_table')
```

This converts a Hive table to Iceberg by scanning its files and creating the Iceberg metadata tree (metadata.json, manifest list, manifest files) that references them. The Parquet files are untouched.

**Pros:** Fast. No data movement. The table becomes queryable as Iceberg immediately.

**Cons:** The existing file layout (sizes, partitioning, sort order) is inherited. If the original files are poorly organized, you inherit those problems. Requires the original files to be in Parquet or ORC format.

### 2. Full Rewrite (CTAS)

A full rewrite reads data from any source and writes it as a new Iceberg table with optimal partitioning and file sizes:

```sql
-- Spark
CREATE TABLE iceberg_catalog.analytics.orders
USING iceberg
PARTITIONED BY (day(order_date))
AS SELECT * FROM hive_catalog.legacy.orders

-- Dremio
CREATE TABLE analytics.orders
PARTITION BY (day(order_date))
AS SELECT * FROM legacy_source.public.orders
```

**Pros:** Best result. Optimal file sizes, correct sort order, proper partitioning. The table is perfectly organized from day one.

**Cons:** Requires reading and writing all data, which takes time and compute resources. The source system must be available during the migration.

### 3. Shadow Migration (Build and Swap)

Shadow migration builds the Iceberg table alongside the existing source, then swaps consumers from old to new when ready:

1. Create a new Iceberg table with the desired schema and partitioning
2. Backfill historical data from the legacy source
3. Set up incremental sync to keep the Iceberg table current
4. Validate data quality between old and new
5. Swap consumer views from legacy to Iceberg

**Pros:** Zero downtime. Consumers never see a disruption. You can validate the migration before committing to it.

**Cons:** Temporarily doubles storage costs. Requires maintaining two copies during the transition.

## Choosing the Right Strategy

![Decision tree for selecting the right migration strategy based on downtime tolerance and layout changes](/assets/images/2026/apache-iceberg-masterclass/migration-decision-tree.png)

| Source                               | Recommended Strategy                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Hive table (Parquet files)           | In-place migration, then compact                                                                                  |
| Data warehouse (Snowflake, Redshift) | Full rewrite via [Dremio federation](https://www.dremio.com/platform/federation/)                                 |
| CSV/JSON files in S3                 | Full rewrite with [COPY INTO](https://www.dremio.com/blog/ingesting-data-into-apache-iceberg-tables-with-dremio/) |
| PostgreSQL/MySQL                     | Full rewrite or shadow migration                                                                                  |
| Delta Lake tables                    | In-place conversion or rewrite                                                                                    |
| Production system (no downtime)      | Shadow migration with view swap                                                                                   |

## The View Swap Pattern

![The zero-downtime view swap pattern: views point to legacy first, then switch to Iceberg](/assets/images/2026/apache-iceberg-masterclass/view-swap-pattern.png)

The view swap pattern is the recommended approach for production migrations. It uses [Dremio's semantic layer](https://www.dremio.com/platform/semantic-layer/) to create an abstraction between consumers and the underlying data:

### Phase 1: Federation

Create views in Dremio that point to the legacy data source:

```sql
CREATE VIEW analytics.orders AS
SELECT order_id, customer_id, order_date, amount, status, region
FROM postgres_source.public.orders
```

All consumers (dashboards, reports, notebooks) query through these views. They do not know or care where the data physically lives.

### Phase 2: Build Iceberg

Create and populate the Iceberg table:

```sql
-- Create the Iceberg table
CREATE TABLE iceberg_data.analytics.orders (
    order_id BIGINT, customer_id BIGINT,
    order_date DATE, amount DECIMAL(10,2),
    status VARCHAR, region VARCHAR
) PARTITION BY (day(order_date))

-- Backfill from the legacy source
INSERT INTO iceberg_data.analytics.orders
SELECT * FROM postgres_source.public.orders
```

### Phase 3: Validate

Compare the two datasets to confirm data integrity:

```sql
SELECT
  (SELECT COUNT(*) FROM postgres_source.public.orders) AS legacy_count,
  (SELECT COUNT(*) FROM iceberg_data.analytics.orders) AS iceberg_count
```

Beyond row counts, validate aggregates (total amounts, distinct customer counts) and spot-check individual records. A comprehensive validation script should compare:

- Total row count
- Column-level checksums or hash aggregates
- Distinct value counts for key columns
- Boundary values (MIN/MAX) for numeric and date columns
- Sample of specific records matched by primary key

Only proceed to the swap after all validation checks pass.

### Phase 4: Swap

Update the view to point to the Iceberg table:

```sql
CREATE OR REPLACE VIEW analytics.orders AS
SELECT order_id, customer_id, order_date, amount, status, region
FROM iceberg_data.analytics.orders
```

Consumers notice nothing. The view name is the same. The query interface is the same. But now the data is served from Iceberg with all of its advantages: [time travel](/posts/2026-04-29-iceberg-masterclass-11/), [hidden partitioning](/posts/2026-04-29-iceberg-masterclass-05/), [metadata-driven pruning](/posts/2026-04-29-iceberg-masterclass-03/), and [automatic optimization](https://www.dremio.com/blog/table-optimization-in-dremio/).

## Migrating One Table at a Time

The view swap pattern enables incremental migration. You do not need to migrate everything at once:

1. **Week 1:** Migrate the highest-value table (e.g., orders)
2. **Week 2:** Migrate the next table (e.g., customers)
3. **Continue** until all critical tables are on Iceberg

During the transition, [Dremio's federation](https://www.dremio.com/platform/federation/) queries legacy and Iceberg tables together. A join between a PostgreSQL table and an Iceberg table works the same as a join between two Iceberg tables. The migration is invisible to consumers.

## Post-Migration Checklist

After migrating each table:

- Run [OPTIMIZE TABLE](/posts/2026-04-29-iceberg-masterclass-10/) to ensure optimal file sizes
- Set up automatic optimization through [Dremio Open Catalog](https://www.dremio.com/platform/open-catalog/)
- Add wikis and tags for the [AI agent](https://www.dremio.com/platform/ai/)
- Verify [metadata table](/posts/2026-04-29-iceberg-masterclass-11/) health checks
- Decommission the legacy source after the retention period

## Common Migration Pitfalls

**Migrating without testing query performance:** Always benchmark critical queries against the new Iceberg table before switching production traffic. Iceberg's partition layout and file organization affect performance, and a migration can make some queries faster but others slower if the partition strategy is wrong.

**Skipping the validation phase:** Data discrepancies between the old and new systems are more common than expected. Schema differences, timezone handling, null semantics, and data type precision can all cause subtle mismatches. Validate thoroughly.

**Migrating everything at once:** Large "big bang" migrations carry high risk. If something goes wrong, rolling back is complex and time-consuming. Migrate one table at a time, validate each one, and build confidence incrementally.

This completes the Apache Iceberg Masterclass. The series covered table formats, metadata, performance, partitioning, writes, catalogs, maintenance, tooling, and migration. For hands-on practice, start a [Dremio Cloud trial](https://www.dremio.com/get-started/) and follow the workflow in [Part 14](/posts/2026-04-29-iceberg-masterclass-14/).

### Books to Go Deeper

- [Architecting the Apache Iceberg Lakehouse](https://www.amazon.com/Architecting-Apache-Iceberg-Lakehouse-open-source/dp/1633435105/) by Alex Merced (Manning)
- [Lakehouses with Apache Iceberg: Agentic Hands-on](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands-ebook/dp/B0GQL4QNRT/) by Alex Merced
- [Constructing Context: Semantics, Agents, and Embeddings](https://www.amazon.com/Constructing-Context-Semantics-Agents-Embeddings/dp/B0GSHRZNZ5/) by Alex Merced
- [Apache Iceberg & Agentic AI: Connecting Structured Data](https://www.amazon.com/Apache-Iceberg-Agentic-Connecting-Structured/dp/B0GW2WF4PX/) by Alex Merced
- [Open Source Lakehouse: Architecting Analytical Systems](https://www.amazon.com/Open-Source-Lakehouse-Architecting-Analytical/dp/B0GW595MVL/) by Alex Merced

### Free Resources

- [FREE - Apache Iceberg: The Definitive Guide](https://drmevn.fyi/linkpageiceberg)
- [FREE - Apache Polaris: The Definitive Guide](https://drmevn.fyi/linkpagepolaris)
- [FREE - Agentic AI for Dummies](https://hello.dremio.com/wp-resources-agentic-ai-for-dummies-reg.html?utm_source=link_page&utm_medium=influencer&utm_campaign=iceberg&utm_term=qr-link-list-04-07-2026&utm_content=alexmerced)
- [FREE - Leverage Federation, The Semantic Layer and the Lakehouse for Agentic AI](https://hello.dremio.com/wp-resources-agentic-analytics-guide-reg.html?utm_source=link_page&utm_medium=influencer&utm_campaign=iceberg&utm_term=qr-link-list-04-07-2026&utm_content=alexmerced)
- [FREE with Survey - Understanding and Getting Hands-on with Apache Iceberg in 100 Pages](https://forms.gle/xdsun6JiRvFY9rB36)
