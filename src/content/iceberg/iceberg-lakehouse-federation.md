---
term: "Iceberg Lakehouse Federation"
description: "Iceberg lakehouse federation enables querying Iceberg tables across multiple catalogs, cloud environments, and storage providers in a single SQL statement, using the Iceberg REST Catalog's multi-catalog architecture and cross-catalog table references."
category: "Patterns & Architecture"
relatedTerms:
  - "iceberg-rest-catalog"
  - "iceberg-catalog"
  - "dremio-apache-iceberg"
  - "trino-apache-iceberg"
  - "iceberg-data-mesh"
keywords:
  - iceberg lakehouse federation
  - federated iceberg catalog
  - cross catalog iceberg
  - multi cloud iceberg
  - iceberg query federation
lastUpdated: 2026-05-14
---

## Iceberg Lakehouse Federation

**Iceberg lakehouse federation** is the ability to query, join, and analyze data across multiple Iceberg catalogs, cloud environments, or storage locations in a single SQL statement: without moving data between systems or establishing dedicated ETL pipelines. Federation enables the "single pane of glass" analytics experience over a distributed, multi-cloud data estate.

## Federation Scenarios

### Multi-Catalog Federation

Different teams or business units maintain separate Iceberg catalogs. The query engine federates across them:

```
Marketing Catalog (Apache Polaris, AWS S3)
IT Catalog (Nessie, on-premise HDFS)
Finance Catalog (AWS Glue, S3)
  ↓
Dremio / Trino (federates across all three)
  ↓
Analyst: "JOIN marketing data WITH finance data"
```

### Multi-Cloud Federation

Tables span multiple cloud providers:

```
Customer data: GCS (Google Cloud)
Order data: S3 (AWS)
Inventory data: ADLS (Azure)
  ↓
Query engine federates across clouds
```

### Hybrid On-Premise/Cloud Federation

Legacy on-premise Hive tables + modern cloud Iceberg tables:

```
Historical data: On-premise HMS (Hive format)
New data: AWS Polaris/Glue (Iceberg format)
  ↓
Federated query: historical + modern
```

## Federation with Dremio

Dremio's Intelligent Query Engine is purpose-built for federation. A single Dremio instance can connect to multiple Iceberg catalogs simultaneously and join across them:

```sql
-- Dremio: join tables from two different Iceberg catalogs
SELECT
    m.campaign_id,
    m.impressions,
    f.revenue
FROM marketing_catalog.campaigns.ad_performance m
JOIN finance_catalog.revenue.daily_revenue f
    ON m.date = f.date AND m.region = f.region
WHERE m.date >= '2026-01-01';
```

No data movement: Dremio pushes predicates down to each catalog's storage, reads only needed columns, joins in its distributed query engine.

## Federation with Trino

Trino's connector architecture supports multiple concurrent catalog connections:

```properties
# trino/catalog/polaris.properties
connector.name=iceberg
iceberg.catalog.type=rest
iceberg.rest-catalog.uri=https://my-polaris.example.com
iceberg.rest-catalog.credential=client-id:client-secret

# trino/catalog/glue.properties
connector.name=iceberg
iceberg.catalog.type=glue
hive.metastore.glue.region=us-east-1
```

```sql
-- Trino: cross-catalog join
SELECT o.order_id, c.name
FROM polaris.analytics.orders o
JOIN glue.crm.customers c ON o.customer_id = c.id;
```

## Apache Arrow Flight for Federation

**Apache Arrow Flight** provides a high-performance RPC protocol for exchanging columnar data between federation participants:

- Each Iceberg catalog exposes an Arrow Flight SQL endpoint.
- A federated query engine (Dremio) distributes sub-queries via Flight.
- Results return as Arrow batches: zero-copy, columnar, high-throughput.

Dremio uses Arrow Flight natively for accelerated data exchange in federated environments.

## Federation and Credential Vending

A key challenge in federation is **credentials**: the query engine needs access to each catalog's object storage. The Iceberg REST Catalog's credential vending solves this:

1. The federated query engine authenticates with each catalog separately.
2. Each catalog vends scoped credentials for its storage prefix.
3. The query engine reads each storage location using the respective vended credentials.
4. Credentials are isolated per-catalog: no cross-contamination of access.

## Federation Anti-Patterns

**Don't replicate data for federation**: Moving data between catalogs to "enable" cross-catalog queries defeats the purpose. Federation should work against data in place.

**Don't over-federate**: Every cross-catalog join incurs network I/O. For frequently-joined datasets, consider co-locating them in the same catalog namespace with appropriate access control instead of always federating.

**Don't bypass the catalog**: Direct storage access bypasses credential vending and audit logging. All federated access should go through the catalog API.

## Practical Federation: Dremio Open Catalog as the Hub

A common enterprise federation pattern uses Dremio's Open Catalog (Apache Polaris) as the central hub:

```
Domain Catalogs (Polaris instances per domain)
  ├── Marketing Polaris → registered in Dremio as source
  ├── Finance Polaris → registered in Dremio as source
  └── Engineering Polaris → registered in Dremio as source

Dremio Agentic Lakehouse
  ├── Federates queries across all three
  ├── AI Semantic Layer unifies business terms across domains
  ├── AI Agent answers cross-domain business questions
  └── Single governance control plane via Dremio permissions
```

This architecture provides federated query capability while maintaining domain autonomy: each domain owns their catalog and data, while Dremio provides unified access and AI-powered analytics across the entire estate.
