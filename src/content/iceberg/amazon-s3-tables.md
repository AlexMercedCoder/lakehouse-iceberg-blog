---
term: "Amazon S3 Tables for Apache Iceberg"
description: "Amazon S3 Tables is an AWS managed service that provides Apache Iceberg table storage and catalog directly within Amazon S3, offering automatic compaction, snapshot management, and a built-in Iceberg REST Catalog endpoint without requiring separate infrastructure."
category: "Cloud-Specific Integrations"
relatedTerms:
  - "aws-glue-catalog"
  - "iceberg-rest-catalog"
  - "iceberg-compaction"
  - "iceberg-catalog"
  - "spark-apache-iceberg"
keywords:
  - amazon s3 tables
  - s3 tables iceberg
  - aws s3 managed iceberg
  - s3 tables catalog
  - aws iceberg managed service
lastUpdated: 2026-05-14
---

## Amazon S3 Tables for Apache Iceberg

**Amazon S3 Tables** is an AWS managed service (launched in late 2024) that extends Amazon S3 with native Apache Iceberg table management capabilities. S3 Tables provides the storage, catalog, and automated maintenance for Iceberg tables in a single managed service: with no separate Glue, HMS, or self-managed catalog infrastructure required.

This represents Amazon's most direct answer to the need for a fully managed, cloud-native Iceberg experience: the object storage and the Iceberg catalog are merged into a single AWS service.

## What S3 Tables Provides

### S3 Table Buckets

A **table bucket** is a new S3 bucket type specifically for Iceberg tables. Unlike regular S3 buckets:

- You cannot put arbitrary objects in table buckets: they only contain Iceberg tables.
- AWS manages the internal layout (metadata files, manifests, data files).
- The bucket exposes an **Iceberg REST Catalog endpoint** that any Iceberg-compatible engine can connect to.

```bash
# Create a table bucket via AWS CLI
aws s3tables create-table-bucket \
    --region us-east-1 \
    --name my-lakehouse-tables
```

### Built-In Iceberg REST Catalog

Every S3 table bucket automatically provides an **Iceberg REST Catalog endpoint**:

```
https://s3tables.<region>.amazonaws.com/iceberg
```

This endpoint implements the full Iceberg REST Catalog specification, so any Iceberg-compatible engine can connect to it without additional configuration.

### Automatic Compaction

S3 Tables runs automatic background compaction on Iceberg tables stored in table buckets. AWS monitors file sizes and runs compaction jobs when files fall below the optimal size threshold, eliminating the need for manual compaction scheduling.

### Automatic Snapshot Expiration

AWS automatically expires old snapshots according to the table's retention policy, preventing unbounded metadata growth without operator intervention.

## Connecting to S3 Tables

### Apache Spark

```python
spark = SparkSession.builder \
    .config("spark.sql.catalog.s3tablesbucket",
            "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.s3tablesbucket.catalog-impl",
            "software.amazon.s3tables.iceberg.S3TablesCatalog") \
    .config("spark.sql.catalog.s3tablesbucket.warehouse",
            "arn:aws:s3tables:us-east-1:123456789:bucket/my-lakehouse-tables") \
    .getOrCreate()

# Create a namespace and table
spark.sql("CREATE NAMESPACE s3tablesbucket.analytics")
spark.sql("""
    CREATE TABLE s3tablesbucket.analytics.orders (
        order_id BIGINT, customer_id BIGINT, total DOUBLE, order_date DATE
    ) USING iceberg PARTITIONED BY (months(order_date))
""")
```

### PyIceberg

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "s3tables",
    **{
        "type": "rest",
        "uri": "https://s3tables.us-east-1.amazonaws.com/iceberg",
        "rest.sigv4-enabled": "true",
        "rest.signing-region": "us-east-1",
        "rest.signing-name": "s3tables",
        "warehouse": "arn:aws:s3tables:us-east-1:123456789:bucket/my-lakehouse-tables",
    }
)

table = catalog.load_table(("analytics", "orders"))
```

### AWS Athena

Athena natively supports querying S3 Tables via the built-in S3 Tables catalog integration:

```sql
-- Register the S3 table bucket as a federated data source in Athena
-- Then query directly:
SELECT * FROM "my_s3_tables_bucket"."analytics"."orders"
WHERE order_date >= DATE '2026-01-01';
```

## S3 Tables vs. Regular S3 + Glue Catalog

| Aspect                   | S3 Tables                      | S3 + Glue Catalog            |
| ------------------------ | ------------------------------ | ---------------------------- |
| Catalog                  | Built-in REST Catalog          | Separate Glue service        |
| Compaction               | Automatic                      | Manual or via AWS Glue ETL   |
| Snapshot management      | Automatic                      | Manual (expire_snapshots)    |
| Multi-engine access      | REST Catalog API               | REST Catalog API (Glue)      |
| Arbitrary object storage | No (table-only bucket)         | Yes                          |
| Best for                 | Managed Iceberg-only workloads | Mixed S3 + Iceberg workloads |
| Pricing                  | Per table operation + storage  | Per Glue API call + storage  |

## S3 Tables and the Broader AWS Iceberg Ecosystem

S3 Tables integrates with the full AWS analytics ecosystem:

- **Amazon Athena**: Direct query support
- **Amazon EMR**: Spark/Flink clusters with S3 Tables catalog config
- **AWS Glue ETL**: Glue jobs can read from S3 Tables via the REST Catalog
- **Amazon Redshift Spectrum**: Cross-query S3 Tables from Redshift SQL

S3 Tables represents Amazon's strategic commitment to Apache Iceberg as the open table format standard for AWS cloud analytics workloads.
