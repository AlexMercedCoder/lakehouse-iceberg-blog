---
term: "Iceberg Multi-Catalog Architecture"
description: "Multi-catalog architectures in Apache Iceberg use multiple catalog instances to achieve environment isolation, domain separation, regional data residency, or tenant isolation, all while maintaining interoperability through the shared Iceberg REST Catalog specification."
category: "Catalogs"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-rest-catalog"
  - "iceberg-lakehouse-federation"
  - "apache-polaris-catalog"
  - "iceberg-multi-tenant"
keywords:
  - iceberg multi catalog
  - multiple iceberg catalogs
  - iceberg catalog architecture
  - iceberg catalog isolation
  - iceberg catalog design
lastUpdated: 2026-05-14
---

## Iceberg Multi-Catalog Architecture

A **multi-catalog architecture** uses multiple Iceberg catalog instances to serve different purposes within the same organization — rather than a single monolithic catalog for everything. Multi-catalog design is a natural outcome of the Iceberg REST Catalog standard: because all catalogs speak the same REST API, they are interoperable, and query engines can connect to multiple catalogs simultaneously.

## Why Use Multiple Catalogs?

### Environment Isolation (Dev/Staging/Prod)

The most common motivation: strict separation of development, staging, and production environments at the catalog level.

```
dev-catalog    → s3://dev-bucket/warehouse/     (developers write freely)
staging-catalog → s3://staging-bucket/warehouse/ (CI/CD writes, no developer access)
prod-catalog    → s3://prod-bucket/warehouse/    (only approved jobs write)
```

Benefits:

- Developer accidents (bad writes, schema mistakes) are contained to `dev`.
- Staging validates pipeline changes before production promotion.
- Production catalog has stricter access control and audit logging.

### Domain Separation (Data Mesh)

Different business domains maintain their own catalogs:

```
marketing-catalog   → owned by Marketing team
finance-catalog     → owned by Finance team
engineering-catalog → owned by Engineering team
```

Each domain has autonomy over their schema, tables, and retention policies. Cross-domain access is federated via a query engine that connects to all three.

### Regional Data Residency

Data sovereignty requirements force data to remain in specific geographic regions:

```
us-catalog    → AWS us-east-1 (US customer data)
eu-catalog    → AWS eu-west-1 (EU customer data, GDPR-compliant)
apac-catalog  → AWS ap-southeast-1 (APAC customer data)
```

Each regional catalog manages data that must not leave its region. Analytics that require cross-region joins use a federated query engine with appropriate data residency controls.

### Tenant Isolation (SaaS)

Per-tenant catalogs provide maximum isolation for SaaS platforms. See [Iceberg Multi-Tenancy Patterns](/iceberg/iceberg-multi-tenant/) for details.

## Multi-Catalog Query Engine Configuration

### Dremio

Dremio supports connecting to an unlimited number of Iceberg catalogs as data sources:

```
Dremio Data Sources:
  ├── "prod-polaris" → Apache Polaris (production REST Catalog)
  ├── "partner-glue" → AWS Glue (partner data sharing)
  ├── "legacy-hms"   → Hive Metastore (historical data)
  └── "research-s3"  → S3 direct (research data lake)
```

SQL across all of them:

```sql
SELECT p.order_id, l.legacy_customer_name
FROM "prod-polaris".analytics.orders p
JOIN "legacy-hms".legacy_db.customers l
    ON p.customer_id = l.id;
```

### Trino

```
trino/catalog/prod_polaris.properties  → REST Catalog (production)
trino/catalog/glue.properties          → Glue (partner)
trino/catalog/nessie.properties        → Nessie (development)
```

### Apache Spark

```python
# Multiple catalogs in a single SparkSession
spark = SparkSession.builder \
    .config("spark.sql.catalog.prod", ...) \
    .config("spark.sql.catalog.dev", ...) \
    .config("spark.sql.catalog.partner_glue", ...) \
    .getOrCreate()
```

## Catalog Namespace Conventions

For multi-catalog environments, establish consistent namespace naming:

```
<catalog-name>.<domain>.<layer>.<table>

Examples:
  prod.marketing.gold.campaign_performance
  dev.engineering.bronze.raw_events
  eu.finance.silver.transactions
```

This naming makes the catalog, domain, pipeline layer, and table name immediately clear in SQL queries and logs.

## Promotion Between Catalogs (Dev → Staging → Prod)

The migration path for a table from dev to production:

```python
def promote_table(source_catalog, dest_catalog, namespace, table_name):
    """Promote an Iceberg table between catalog environments (zero data copy)."""

    # Get the current metadata file location
    source_table = source_catalog.load_table(f"{namespace}.{table_name}")
    metadata_location = source_table.metadata_location

    # Ensure namespace exists in destination
    if not dest_catalog.namespace_exists((namespace,)):
        dest_catalog.create_namespace((namespace,))

    # Register in destination catalog (same data, new catalog entry)
    dest_catalog.register_table(
        identifier=(namespace, table_name),
        metadata_location=metadata_location
    )

    print(f"Promoted {namespace}.{table_name} from {source_catalog} to {dest_catalog}")
    print(f"Metadata location: {metadata_location}")
    print("No data was copied.")
```

The destination catalog now has full access to the table (all snapshots, full history) without any data movement — only the catalog pointer was created.

## Governance in Multi-Catalog Environments

With multiple catalogs, establish a unified governance framework:

- **Shared RBAC principles**: Use the same role naming conventions across all catalogs.
- **Centralized secrets management**: Use AWS Secrets Manager or HashiCorp Vault for catalog credentials.
- **Federated audit logging**: Aggregate audit logs from all catalog instances into a central SIEM.
- **Schema registry**: Maintain a central registry of approved schemas that all catalogs must adhere to for shared datasets.
