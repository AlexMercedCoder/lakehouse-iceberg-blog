---
term: "dbt and Apache Iceberg"
description: "dbt (data build tool) transforms raw Iceberg table data into clean, tested, documented analytical models using SQL, with native Iceberg materialization support via the dbt-spark and dbt-trino adapters, making dbt the standard SQL transformation layer in the Iceberg lakehouse."
category: "Engines & Integrations"
relatedTerms:
  - "spark-apache-iceberg"
  - "trino-apache-iceberg"
  - "iceberg-table-design"
  - "iceberg-views"
  - "iceberg-medallion-architecture"
keywords:
  - dbt iceberg
  - dbt apache iceberg
  - dbt spark iceberg
  - dbt trino iceberg
  - dbt lakehouse iceberg models
lastUpdated: 2026-05-14
---

## dbt and Apache Iceberg

**dbt** (data build tool) is the dominant SQL-first data transformation framework used by data engineers and analytics engineers worldwide. It enables teams to define data models as SQL `SELECT` statements, manage dependencies between models, run data quality tests, and auto-generate documentation: all from a version-controlled SQL codebase.

Apache Iceberg is the ideal storage format for dbt models in a lakehouse architecture: dbt's idempotent table materializations map naturally to Iceberg's transactional table creation and overwrite capabilities, and dbt's incremental materializations align with Iceberg's MoR/CoW strategies.

## dbt Adapters for Iceberg

dbt connects to query engines via **adapters**. The most common Iceberg adapters:

### dbt-spark (with Iceberg)

The most mature Iceberg + dbt combination. Configure the SparkSession with an Iceberg catalog:

```yaml
# profiles.yml
my_profile:
  target: dev
  outputs:
    dev:
      type: spark
      method: thrift
      host: spark-thrift-host
      port: 10001
      schema: analytics
      connect_retries: 5
```

Configure Iceberg catalog in SparkSession before dbt runs:

```python
spark.conf.set("spark.sql.catalog.iceberg", "org.apache.iceberg.spark.SparkCatalog")
spark.conf.set("spark.sql.catalog.iceberg.type", "rest")
spark.conf.set("spark.sql.catalog.iceberg.uri", "https://my-polaris.example.com")
```

### dbt-trino

Queries Iceberg tables via Trino:

```yaml
# profiles.yml
my_profile:
  target: dev
  outputs:
    dev:
      type: trino
      host: trino.example.com
      port: 443
      database: iceberg_catalog # Trino catalog name
      schema: analytics
      auth:
        method: jwt
        jwt_token: "{{ env_var('TRINO_JWT_TOKEN') }}"
```

### dbt-dremio

Dremio has a dbt adapter that queries Iceberg tables through Dremio's semantic layer:

```yaml
# profiles.yml
my_profile:
  target: dev
  outputs:
    dev:
      type: dremio
      host: my-dremio.example.com
      port: 9047
      user: "{{ env_var('DREMIO_USER') }}"
      password: "{{ env_var('DREMIO_PASSWORD') }}"
      database: "$scratch"
      schema: analytics
```

## dbt Model Types and Iceberg

### Table Materialization (Full Refresh)

Creates or replaces the Iceberg table each run: equivalent to `CREATE OR REPLACE TABLE ... AS SELECT`:

```sql
-- models/silver/orders_clean.sql
{{ config(
    materialized='table',
    file_format='iceberg',
    partition_by=['months(order_date)', 'region'],
    properties={
        'write.target-file-size-bytes': '268435456',
        'format-version': '2'
    }
) }}

SELECT
    order_id,
    customer_id,
    CAST(total AS DECIMAL(18,2)) AS total_usd,
    order_date,
    region,
    UPPER(status) AS status
FROM {{ source('bronze', 'raw_orders') }}
WHERE order_id IS NOT NULL
  AND total > 0
```

### Incremental Materialization (Append / Merge)

Only processes new or changed rows: the core pattern for large production Iceberg tables:

```sql
-- models/silver/events.sql
{{ config(
    materialized='incremental',
    file_format='iceberg',
    incremental_strategy='append',  -- or 'merge', 'insert_overwrite'
    unique_key='event_id',
    partition_by=['days(event_ts)']
) }}

SELECT
    event_id,
    user_id,
    event_type,
    event_ts,
    properties
FROM {{ source('bronze', 'raw_events') }}

{% if is_incremental() %}
    WHERE event_ts > (SELECT MAX(event_ts) FROM {{ this }})
{% endif %}
```

**Incremental strategies for Iceberg**:

- `append`: Add new rows only (fast, for append-only sources).
- `insert_overwrite`: Overwrite affected partitions (for partition-aligned refresh).
- `merge`: Upsert by `unique_key` using `MERGE INTO` (for CDC/SCD2 patterns).

## dbt Tests on Iceberg Tables

dbt's built-in tests validate Iceberg table data quality after each run:

```yaml
# models/schema.yml
models:
  - name: orders_clean
    columns:
      - name: order_id
        tests:
          - not_null
          - unique
      - name: total_usd
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"
      - name: status
        tests:
          - accepted_values:
              values: ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"]
```

Failed tests surface data quality issues before downstream consumers see bad data: complementing Iceberg's WAP pattern for pipeline safety.

## dbt Sources and Iceberg

Register existing Iceberg tables as dbt sources for lineage tracking:

```yaml
# models/sources.yml
sources:
  - name: bronze
    database: iceberg_catalog
    schema: bronze
    tables:
      - name: raw_orders
        description: "Raw orders from operational DB CDC"
        loaded_at_field: _loaded_at
        freshness:
          warn_after: { count: 4, period: hour }
          error_after: { count: 12, period: hour }
      - name: raw_events
        description: "Raw clickstream events from Kafka"
```

dbt's source freshness check (`dbt source freshness`) validates that Iceberg source tables are being updated within their SLA: alerting on pipeline delays.

## dbt Docs and Iceberg Catalog

`dbt docs generate` creates a rich documentation site from your models, with:

- **DAG visualization**: See the full dependency graph from raw Iceberg sources to gold models.
- **Column-level lineage**: Track which raw column feeds which gold metric.
- **Test coverage**: See which columns have quality tests.

This dbt documentation layer complements the AI Semantic Layer in Dremio: dbt documents the transformation logic; Dremio's semantic layer exposes the result to AI agents.

## dbt + Iceberg in the Medallion Architecture

The classic lakehouse flow with dbt:

```
Bronze (raw Iceberg) → dbt → Silver (clean Iceberg) → dbt → Gold (metrics Iceberg)
```

```
sources: raw_orders, raw_events, raw_customers (Iceberg, CDC-loaded)
  ↓
staging models: stg_orders, stg_events (dbt: type casting, renaming)
  ↓
intermediate models: int_orders_enriched (dbt: business logic joins)
  ↓
mart models: fct_orders, dim_customers, agg_revenue (dbt: gold layer)
  ↓
Dremio Virtual Datasets → AI Semantic Layer → AI Agent analytics
```
