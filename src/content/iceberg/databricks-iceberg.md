---
term: "Databricks and Apache Iceberg"
description: "Databricks supports Apache Iceberg through UniForm (Delta-to-Iceberg automatic metadata generation) and native Iceberg catalog connections in Unity Catalog, enabling Iceberg-compatible engines to read Delta tables and vice versa in multi-engine lakehouse architectures."
category: "Engines & Integrations"
relatedTerms:
  - "iceberg-open-table-format"
  - "iceberg-rest-catalog"
  - "spark-apache-iceberg"
  - "iceberg-catalog"
  - "what-is-apache-iceberg"
keywords:
  - databricks iceberg
  - databricks delta iceberg
  - databricks uniform iceberg
  - databricks unity catalog iceberg
  - delta lake iceberg interop
lastUpdated: 2026-05-14
---

## Databricks and Apache Iceberg

**Databricks** is the commercial platform built around Apache Spark, Delta Lake, and the Databricks Runtime. Its relationship with Apache Iceberg has evolved significantly: from competitor (Delta Lake vs. Iceberg) to partial integration (UniForm) to first-class support (Unity Catalog Iceberg catalogs). Understanding how Databricks approaches Iceberg is important for teams in the Databricks ecosystem who need multi-engine interoperability.

## Delta Lake vs. Apache Iceberg: Background

Databricks created **Delta Lake** as an alternative open table format, and for years Delta Lake and Apache Iceberg competed directly. Delta Lake's tight integration with Databricks gave it a strong ecosystem within Databricks deployments, but Apache Iceberg's broader multi-engine support and Apache Software Foundation governance made it the community standard outside the Databricks world.

By 2023–2024, the industry had clearly consolidated around Apache Iceberg for multi-engine use cases, and Databricks responded by building Iceberg compatibility into their platform.

## UniForm: Automatic Delta → Iceberg Metadata

**Delta UniForm** (Universal Format) is Databricks' approach to Delta-Iceberg interoperability. When UniForm is enabled on a Delta table, Databricks automatically generates and maintains **Iceberg metadata** (metadata files, manifests) alongside the Delta log — allowing Iceberg-compatible engines to read the table as if it were a native Iceberg table.

```sql
-- Enable UniForm on a new Delta table
CREATE TABLE orders (order_id BIGINT, total DOUBLE, order_date DATE)
TBLPROPERTIES (
    'delta.enableIcebergCompatV2' = 'true',
    'delta.universalFormat.enabledFormats' = 'iceberg'
);

-- Enable UniForm on an existing Delta table
ALTER TABLE orders
SET TBLPROPERTIES (
    'delta.enableIcebergCompatV2' = 'true',
    'delta.universalFormat.enabledFormats' = 'iceberg'
);
```

With UniForm enabled:

- Spark reads the table as Delta (unchanged).
- Iceberg-compatible engines (Dremio, Trino, Spark with Iceberg catalog, PyIceberg) read it as an Iceberg table via the generated Iceberg metadata.
- No data file duplication — only metadata is added.

### UniForm Limitations

- Read-only for Iceberg engines: Only Databricks Spark can write to UniForm tables (it manages both Delta and Iceberg metadata). Other engines are read-only via the Iceberg interface.
- Some advanced Iceberg features (row-level deletes via delete files, branching) may not be available in UniForm.
- Schema compatibility: Not all Delta types have direct Iceberg equivalents.

## Unity Catalog and Iceberg

**Databricks Unity Catalog** (the data governance layer for Databricks) supports connecting external Iceberg catalogs as federated data sources:

```python
# Connect an external Iceberg REST Catalog to Unity Catalog
# (via Databricks CLI or UI)
databricks catalogs create --name external_iceberg \
    --type FOREIGN \
    --options '{"type": "iceberg_rest", "uri": "https://my-polaris-catalog.example.com"}'
```

This allows Databricks users to query Iceberg tables in Apache Polaris, Nessie, or other REST Catalogs directly from Databricks notebooks and SQL warehouses — without moving data.

Unity Catalog also exposes Databricks-managed tables as an Iceberg REST Catalog endpoint, allowing external Iceberg engines to read Databricks data.

## Reading Native Iceberg Tables in Databricks

Databricks Spark supports native Iceberg table reads via the Iceberg Spark connector:

```python
# Databricks: configure Iceberg catalog alongside Delta
spark = SparkSession.builder \
    .config("spark.sql.catalog.polaris_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.polaris_catalog.type", "rest") \
    .config("spark.sql.catalog.polaris_catalog.uri", "https://my-polaris.example.com") \
    .getOrCreate()

# Query native Iceberg tables
spark.sql("SELECT * FROM polaris_catalog.analytics.orders").show()
```

## Databricks + Dremio: Complementary Roles

A common architecture combines Databricks and Dremio:

```
Databricks (ETL, ML training on Delta/Iceberg)
  → Iceberg tables (via UniForm or native Iceberg)
  → Apache Polaris Catalog
  → Dremio (BI, AI Analytics, AI Semantic Layer)
```

Databricks handles heavy ETL, ML training, and data preparation. Dremio handles BI serving, AI agent access, and self-serve analytics — both working against the same Iceberg data via a shared catalog.

## The Competitive Context

The Databricks-Iceberg relationship reflects a broader industry shift: even Databricks, the creator of Delta Lake, has acknowledged that Apache Iceberg's multi-engine portability and open governance make it the interoperability standard. UniForm and Unity Catalog Iceberg support are Databricks' pragmatic response to enterprise demand for open, portable data — even when that data originates in a Databricks-managed lakehouse.
