---
term: "Snowflake External Table Catalog Sync"
description: "The automated or manual synchronization process that refreshes Snowflake metadata pointers to match updates made to Iceberg tables by external catalogs."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "snowflake-iceberg-tables"
  - "snowflake-managed-iceberg-tables"
keywords:
  - snowflake catalog sync
  - external catalog sync
  - snowflake iceberg sync
  - refresh external table
lastUpdated: 2026-05-29
---

## Snowflake External Table Catalog Sync

**Snowflake External Table Catalog Sync** is the operation that keeps Snowflake aligned with Apache Iceberg tables governed by external catalogs (such as AWS Glue, Apache Polaris, or Project Nessie). When an external engine (such as Spark or Flink) writes data to an Iceberg table, it commits a new metadata JSON file. Because Snowflake is not managing the catalog, it does not know about this new commit automatically. The catalog sync process refreshes Snowflake's pointers to point to the latest table version.

### Execution Mechanisms

Snowflake supports two primary methods to synchronize external Iceberg tables:

#### 1. Automated Refresh (Event-Driven)

This approach uses cloud notification services (such as AWS SNS/SQS, Google Cloud Pub/Sub, or Azure Event Grid) to monitor the storage bucket metadata folder.

When a new `.metadata.json` file is written, a notification is sent to Snowflake. Snowflake parses the message and automatically updates the table reference to point to the new metadata file. This ensures queries in Snowflake read current data within seconds of the external commit.

#### 2. Manual Refresh (SQL Command)

If event-driven synchronization is not configured, developers must manually run a SQL refresh command before querying the table from Snowflake. This command tells Snowflake to scan the external catalog API or the cloud storage path to resolve the current metadata file:

```sql
/* Refresh the external Iceberg table pointer in Snowflake */
ALTER ICEBERG TABLE prod_db.public.sales_data REFRESH;
```

### Performance and Cost Trade-Offs

Using manual refreshes is simple to set up but introduces stale data risks if pipelines run out of sync. Conversely, automated refreshes ensure query accuracy but require configuring cloud integration objects and bucket notifications, which can incur small event-processing fees.
