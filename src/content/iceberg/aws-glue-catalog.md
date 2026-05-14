---
term: "AWS Glue Catalog for Apache Iceberg"
description: "AWS Glue Data Catalog is Amazon's managed metadata catalog service with native support for Apache Iceberg tables via the REST Catalog API, enabling Iceberg workloads across AWS analytics services including Athena, EMR, Glue ETL, and Redshift Spectrum."
category: "Catalogs"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-rest-catalog"
  - "apache-polaris-catalog"
  - "spark-apache-iceberg"
keywords:
  - aws glue iceberg catalog
  - glue data catalog iceberg
  - amazon iceberg catalog
  - aws iceberg integration
  - glue rest catalog
lastUpdated: 2026-05-14
---

## AWS Glue Catalog for Apache Iceberg

**AWS Glue Data Catalog** is Amazon Web Services' managed metadata catalog service, deeply integrated with the AWS analytics ecosystem. Since 2023, Glue has supported Apache Iceberg natively — including Iceberg REST Catalog API compatibility — making it the natural catalog choice for teams running Iceberg workloads entirely within AWS.

## Overview

The AWS Glue Data Catalog serves as a centralized metadata repository for data assets in AWS:

- **Table definitions**: Column names, types, partition info, and (for Iceberg tables) the metadata file location.
- **Database/namespace management**: Logical grouping of tables.
- **Lake Formation integration**: Fine-grained access control via AWS Lake Formation on top of Glue catalog entries.
- **Service integration**: Native discovery by Athena, EMR, Glue ETL jobs, Redshift Spectrum, and more.

## Glue and Apache Iceberg

AWS Glue supports Iceberg through two modes:

### Native Iceberg Table Support

Glue can register and manage Iceberg tables directly. When using Glue as an Iceberg catalog:

- The Glue catalog stores the current metadata file pointer for each Iceberg table.
- AWS services (Athena, EMR, Glue ETL) can read and write Iceberg tables via Glue.
- Glue's schema registry and data quality integrations apply to Iceberg tables.

### Iceberg REST Catalog Endpoint

AWS introduced an Iceberg REST Catalog-compatible endpoint for Glue, allowing engines and clients that support the REST Catalog API (PyIceberg, Spark with Iceberg REST config, Flink) to use Glue as their Iceberg catalog via the standard protocol.

## Using Glue with Apache Spark (EMR/Glue ETL)

```python
spark = SparkSession.builder \
    .config("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.glue_catalog.warehouse", "s3://my-bucket/warehouse/") \
    .config("spark.sql.catalog.glue_catalog.catalog-impl",
            "org.apache.iceberg.aws.glue.GlueCatalog") \
    .config("spark.sql.catalog.glue_catalog.io-impl",
            "org.apache.iceberg.aws.s3.S3FileIO") \
    .getOrCreate()

# Create an Iceberg table in Glue
spark.sql("""
    CREATE TABLE glue_catalog.db.orders (
        order_id BIGINT,
        order_date TIMESTAMP,
        total DOUBLE
    ) USING iceberg PARTITIONED BY (days(order_date))
""")
```

## Using Glue with AWS Athena

Athena has native Iceberg support using the Glue catalog:

```sql
-- Athena: create Iceberg table in Glue
CREATE TABLE orders (
    order_id bigint,
    order_date timestamp,
    total double
)
PARTITIONED BY (day(order_date))
LOCATION 's3://my-bucket/warehouse/db/orders/'
TBLPROPERTIES ('table_type'='ICEBERG');

-- Time travel query
SELECT * FROM orders FOR TIMESTAMP AS OF '2026-01-01 00:00:00';
```

## AWS Lake Formation Integration

AWS Lake Formation provides fine-grained access control for Glue-cataloged Iceberg tables:

- **Table-level permissions**: Grant SELECT, INSERT, DROP to specific IAM roles/users.
- **Column-level security**: Restrict access to specific columns.
- **Row-level security**: Filter rows based on the identity of the querying principal.

Lake Formation integrates with Glue to enforce these permissions across all AWS services that query the catalog (Athena, EMR, Redshift Spectrum).

## Glue vs. Apache Polaris for AWS Workloads

| Consideration           | AWS Glue       | Apache Polaris (via Dremio) |
| ----------------------- | -------------- | --------------------------- |
| AWS service integration | Native         | Via REST Catalog API        |
| Multi-cloud             | AWS only       | Cloud-agnostic              |
| Open source             | No             | Yes                         |
| Credential vending      | Via IAM roles  | Native REST spec            |
| Branching               | No             | No (use Nessie)             |
| Governance              | Lake Formation | Built-in RBAC               |

For teams building on AWS exclusively, Glue is the most frictionless choice. For multi-cloud or cross-engine portability requirements, Apache Polaris (available via Dremio Cloud or self-hosted) offers broader interoperability.

## Pricing

AWS Glue Data Catalog has a free tier (up to 1 million objects) with pay-per-use pricing beyond that. Iceberg metadata operations (table loads, commits) count against Glue API request quotas. For very high-throughput Iceberg workloads, catalog request costs should be factored into architecture decisions.
