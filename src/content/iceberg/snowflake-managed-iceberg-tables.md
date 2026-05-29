---
term: "Snowflake Managed Iceberg Tables"
description: "Iceberg tables where Snowflake serves as the catalog manager, executing all DML writes and writing physical Parquet files to the user's external cloud storage."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "snowflake-iceberg-tables"
  - "snowflake-external-table-catalog-sync"
keywords:
  - snowflake managed iceberg
  - managed iceberg tables
  - snowflake catalog write
  - external volume snowflake
lastUpdated: 2026-05-29
---

## Snowflake Managed Iceberg Tables

**Snowflake Managed Iceberg Tables** are Iceberg tables where Snowflake acts as the primary catalog manager. Unlike external tables where Snowflake has read-only access, managed Iceberg tables allow Snowflake to execute write, update, delete, and merge operations (DML). The data files are stored in the customer's own cloud storage bucket, but Snowflake manages the table metadata and catalog pointers.

### Architectural Setup

To create a managed Iceberg table, administrators must configure two integration objects in Snowflake:

1.  **External Volume**: A Snowflake object that securely connects to the customer's cloud storage bucket (such as Amazon S3, Google Cloud Storage, or Azure Blob Storage) using IAM trust relationships.
2.  **Catalog Integration**: An object that specifies the metadata repository. For managed tables, Snowflake's internal metadata engine serves as the catalog.

```sql
/* Create a managed Iceberg table in Snowflake pointing to S3 */
CREATE OR REPLACE ICEBERG TABLE customers (
    id INT,
    name STRING,
    signup_date DATE
)
CATALOG = 'SNOWFLAKE'
EXTERNAL_VOLUME = 'my_s3_volume'
BASE_LOCATION = 'tables/customers/';
```

### Writing and Maintaining Managed Tables

Once created, Snowflake processes these tables similarly to standard internal database tables:

- **Writes**: Insert, update, or merge queries run via Snowflake compute virtual warehouses, which compile the results into Parquet files and write them to the specified external volume.
- **Metadata Generation**: Snowflake automatically generates the Iceberg metadata JSON files, manifest lists, and manifest files, ensuring spec compliance.
- **Automated Maintenance**: Snowflake handles compaction and file pruning behind the scenes, using its engine resources to keep the table optimized without requiring manual maintenance scripts.

This model combines the performance of Snowflake's database engine with the open structure of Iceberg, preventing vendor lock-in since other engines can read the tables directly from S3.
