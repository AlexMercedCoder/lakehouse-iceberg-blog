---
term: "Medallion Architecture with Apache Iceberg"
description: "The Medallion Architecture (Bronze/Silver/Gold) is a multi-layer data organization pattern where raw data flows through progressive refinement stages, with Apache Iceberg providing ACID-safe writes, schema evolution, and time travel at each layer for reliable, governed lakehouse pipelines."
category: "Patterns & Architecture"
relatedTerms:
  - "data-lakehouse"
  - "iceberg-upsert"
  - "iceberg-cdc"
  - "iceberg-compaction"
  - "dremio-apache-iceberg"
  - "spark-apache-iceberg"
keywords:
  - medallion architecture iceberg
  - bronze silver gold iceberg
  - iceberg data pipeline
  - lakehouse medallion
  - iceberg etl architecture
lastUpdated: 2026-05-14
---

## Medallion Architecture with Apache Iceberg

The **Medallion Architecture** is a data design pattern that organizes a data lakehouse into three progressive refinement layers — **Bronze** (raw), **Silver** (cleaned/normalized), and **Gold** (business-ready) — with each layer transforming data into increasingly trusted, performant, and use-case-specific tables.

Apache Iceberg is the ideal table format for the Medallion Architecture because its ACID guarantees, schema evolution, and time travel capabilities provide reliability and observability at every layer of the pipeline.

## The Three Layers

### Bronze Layer: Raw Ingestion

The Bronze layer captures raw, unmodified data exactly as it arrives from source systems. No transformations, no cleaning, no filtering.

**Characteristics**:

- Data appended directly from Kafka, CDC streams, file uploads, or API calls.
- Schema matches the source system schema (or raw Kafka record schema).
- All historical data retained indefinitely (or per retention policy).
- Used for reprocessing: if Silver or Gold logic changes, Bronze is the source of truth for replay.

**Iceberg properties at Bronze**:

- Merge-on-Read with frequent Flink commits → low ingestion latency.
- Schema preserved exactly as received.
- Snapshot history enables replay from any historical point.

```sql
-- Bronze table: raw orders
CREATE TABLE bronze.orders (
    raw_payload STRING,  -- raw JSON or entire source row
    ingested_at TIMESTAMP,
    source_system STRING
) USING iceberg
PARTITIONED BY (days(ingested_at));
```

### Silver Layer: Cleaned and Normalized

The Silver layer applies data quality rules, type casting, deduplication, and normalization to produce a clean, queryable representation of each entity.

**Characteristics**:

- CDC upserts applied (Bronze raw events merged into Silver fact/dimension tables).
- Schema normalized to match the business data model.
- Data quality rules enforced (null checks, range validation, deduplication).
- Queryable by data analysts and data scientists.

**Iceberg properties at Silver**:

- MERGE INTO for CDC apply and deduplication.
- Schema evolution as business model evolves.
- Time travel for debugging data quality issues.

```sql
-- Silver table: cleaned orders (CDC upsert target)
CREATE TABLE silver.orders (
    order_id     BIGINT NOT NULL,
    customer_id  BIGINT,
    order_date   DATE,
    total        DECIMAL(10,2),
    status       STRING,
    region       STRING,
    updated_at   TIMESTAMP
) USING iceberg
PARTITIONED BY (months(order_date));
```

```sql
-- Periodic Bronze → Silver CDC apply
MERGE INTO silver.orders AS target
USING bronze_normalized AS source
ON target.order_id = source.order_id
WHEN MATCHED THEN UPDATE SET ...
WHEN NOT MATCHED THEN INSERT VALUES (...);
```

### Gold Layer: Business-Ready Aggregates

The Gold layer contains pre-aggregated, business-metric-aligned tables optimized for specific analytical use cases: executive dashboards, BI tools, ML feature stores, and AI agent queries.

**Characteristics**:

- Aggregated, denormalized, or pivoted data.
- Optimized for read performance (compacted, Z-order clustered).
- Refreshed on a schedule (daily, hourly) or on-demand.
- Served to BI tools (Dremio, Tableau, Power BI) and AI agents.

**Iceberg properties at Gold**:

- Copy-on-Write mode for maximum read performance.
- Z-order clustering for multi-column query patterns.
- Regular compaction to maintain file size and column statistics.
- Reflections (in Dremio) for sub-second query performance.

```sql
-- Gold table: daily revenue by region and product category
CREATE TABLE gold.daily_revenue (
    revenue_date     DATE,
    region           STRING,
    product_category STRING,
    total_revenue    DECIMAL(18,2),
    order_count      BIGINT,
    avg_order_value  DECIMAL(10,2)
) USING iceberg
PARTITIONED BY (months(revenue_date))
TBLPROPERTIES ('write.merge.mode' = 'copy-on-write');
```

## Full Pipeline with Iceberg

```
Source Systems (DBs, APIs, Kafka)
  │
  ▼ (Flink streaming, batch ingestion)
Bronze Layer (raw Iceberg tables, MoR, append-only)
  │
  ▼ (Spark batch CDC apply, MERGE INTO)
Silver Layer (cleaned Iceberg tables, schema-enforced)
  │
  ▼ (Spark aggregation, Dremio virtual datasets)
Gold Layer (business-ready Iceberg tables, CoW, clustered)
  │
  ▼
Dremio Intelligent Query Engine → BI Tools, AI Agents, Self-serve analytics
```

## Why Iceberg Enables the Medallion Pattern

| Requirement               | How Iceberg Fulfills It                                     |
| ------------------------- | ----------------------------------------------------------- |
| Raw data preservation     | Immutable snapshots at Bronze → replay any point in history |
| CDC application at Silver | MERGE INTO with MoR → fast upsert without rewrites          |
| Schema evolution          | Safe schema changes at each layer without pipeline breakage |
| Audit trail               | Snapshot history at every layer                             |
| Performance at Gold       | CoW + compaction + Z-order clustering + Dremio Reflections  |
| Cross-layer consistency   | Atomic snapshot commits → each layer always consistent      |
| AI/agent readiness        | Semantic layer over Gold tables → AI agents understand data |
