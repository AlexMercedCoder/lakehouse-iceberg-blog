---
term: "BigQuery and Apache Iceberg"
description: "Google BigQuery supports Apache Iceberg tables through BigLake managed tables and Biglake Metastore, enabling BigQuery SQL to query Iceberg tables stored in Google Cloud Storage while sharing those tables with other Iceberg-compatible engines via the REST Catalog."
category: "Cloud-Specific Integrations"
relatedTerms:
  - "iceberg-rest-catalog"
  - "iceberg-catalog"
  - "spark-apache-iceberg"
  - "iceberg-table-format"
  - "what-is-apache-iceberg"
keywords:
  - bigquery iceberg
  - google bigquery apache iceberg
  - biglake iceberg
  - bigquery open table format
  - gcp iceberg integration
lastUpdated: 2026-05-14
---

## BigQuery and Apache Iceberg

**Google BigQuery** — Google Cloud's serverless data warehouse — supports Apache Iceberg through its **BigLake** infrastructure, enabling BigQuery SQL to query Iceberg tables stored in Google Cloud Storage (GCS). This integration makes BigQuery a first-class Iceberg query engine, joining Dremio, Spark, Trino, and others in the multi-engine Iceberg ecosystem.

## BigLake and Iceberg

**BigLake** is Google's unified storage framework that allows BigQuery and other GCP analytics tools to query data in Cloud Storage using a consistent access model. BigLake supports multiple open table formats, with Apache Iceberg being the primary target.

### BigLake Managed Tables (Iceberg)

**BigLake managed Iceberg tables** are the primary Iceberg integration — BigQuery manages the Iceberg metadata and writes data files to GCS. This is equivalent to Snowflake's "Snowflake-managed Iceberg tables":

- BigQuery is the primary writer and metadata manager.
- Data is stored in customer-owned GCS buckets as standard Parquet files in Iceberg format.
- Other engines (Spark, PyIceberg, Dremio) can read the tables via the Iceberg REST Catalog.

```sql
-- BigQuery SQL: create a managed Iceberg table
CREATE TABLE my_dataset.orders (
    order_id INT64,
    customer_id INT64,
    total FLOAT64,
    order_date DATE
)
OPTIONS (
    file_format = 'PARQUET',
    table_format = 'ICEBERG',
    storage_uri = 'gs://my-bucket/warehouse/orders/'
);

-- Insert and query as normal BigQuery SQL
INSERT INTO my_dataset.orders VALUES (1001, 42, 150.00, '2026-05-14');

SELECT customer_id, SUM(total) as revenue
FROM my_dataset.orders
WHERE order_date >= '2026-01-01'
GROUP BY customer_id;
```

### BigLake External Tables (Externally-Managed Iceberg)

For Iceberg tables managed by other engines (Spark, Flink, Dremio), BigQuery can connect as an external reader:

```sql
-- Create a BigLake external table over an externally-managed Iceberg table
CREATE EXTERNAL TABLE my_dataset.events
OPTIONS (
    format = 'ICEBERG',
    uris = ['gs://my-bucket/warehouse/events/'],
    require_partition_filter = false
);

-- Refresh metadata after external writes
CALL BQ.REFRESH_EXTERNAL_METADATA_CACHE('my_project.my_dataset.events');
```

## BigLake Metastore (Iceberg REST Catalog)

**BigLake Metastore** is Google's managed Iceberg catalog service, implementing the Iceberg REST Catalog specification. It enables multi-engine table sharing:

- BigQuery tables are registered in BigLake Metastore and accessible via the REST API.
- Spark, Flink, PyIceberg, and Dremio connect to BigLake Metastore via the REST Catalog protocol.
- Changes made by any engine are immediately visible to all others.

```python
# PyIceberg: connect to BigLake Metastore
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "biglake",
    **{
        "type": "rest",
        "uri": "https://biglake.googleapis.com/v1",
        "credential": "...",  # GCP service account credentials
        "warehouse": "projects/my-project/locations/us-central1/catalogs/my-catalog",
    }
)
```

## Dataplex and Iceberg Governance

**Google Cloud Dataplex** provides data governance and metadata management for GCP, with Iceberg table support:

- **Data scanning**: Profile Iceberg tables and detect data quality issues.
- **Metadata discovery**: Automatically discover Iceberg tables in GCS and register them.
- **Data lineage**: Track lineage of Iceberg table transformations across GCP services.
- **Access control**: Integrate with IAM to govern Iceberg table access.

## Time Travel in BigQuery Iceberg

BigQuery supports Iceberg time travel syntax:

```sql
-- Query as of a specific timestamp
SELECT * FROM my_dataset.orders
FOR SYSTEM_TIME AS OF TIMESTAMP '2026-01-15 00:00:00 UTC';

-- Query as of a specific snapshot (BigQuery uses Iceberg snapshot IDs)
SELECT * FROM my_dataset.orders
FOR SYSTEM_VERSION AS OF 8027658604211071520;
```

## BigQuery vs. Dremio for Iceberg Analytics

| Aspect                   | BigQuery                      | Dremio                                     |
| ------------------------ | ----------------------------- | ------------------------------------------ |
| Architecture             | Serverless (Google-managed)   | Managed cloud or self-hosted               |
| Compute pricing          | Per-query (TB scanned)        | Per-compute-hour or flat                   |
| AI Semantic Layer        | Limited                       | Full (AI Semantic Layer)                   |
| Open Catalog             | BigLake Metastore             | Apache Polaris (co-created with Snowflake) |
| MCP/AI Agent integration | Via Vertex AI                 | Native AI Agent + MCP                      |
| Best for                 | GCP-native BigQuery workflows | Multi-cloud, AI analytics, open ecosystem  |

For teams heavily invested in Google Cloud, BigQuery + BigLake provides a cohesive managed Iceberg experience. For multi-cloud or open ecosystem requirements, Dremio's Agentic Lakehouse provides broader interoperability and deeper AI integration.
