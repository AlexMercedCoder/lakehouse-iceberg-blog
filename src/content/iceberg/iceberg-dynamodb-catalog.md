---
term: "Iceberg DynamoDB Catalog"
description: "An AWS serverless catalog implementation that stores Iceberg table pointers in Amazon DynamoDB, using conditional writes for transaction isolation."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "iceberg-lock-manager"
  - "aws-glue-catalog"
  - "iceberg-concurrent-writes"
keywords:
  - dynamodb catalog
  - aws dynamodb catalog
  - iceberg dynamodb
  - serverless catalog locking
lastUpdated: 2026-05-29
---

## Iceberg DynamoDB Catalog

The **Iceberg DynamoDB Catalog** is a lightweight, serverless catalog implementation for Apache Iceberg. Rather than running a relational database for JDBC catalog tables or deploying a Hive Metastore service, this catalog stores table metadata pointers directly in Amazon DynamoDB. This design is popular for serverless AWS analytical architectures that require a cost-effective, low-maintenance catalog with strong concurrency features.

### Atomic Swaps via Conditional Writes

DynamoDB does not require separate lock servers (like ZooKeeper) because it supports conditional expressions. When an engine commits a new snapshot, it performs a DynamoDB `UpdateItem` operation.

The catalog schema uses a database attribute (like `version` or `metadata_location`) as a transaction version check. The client submits an update query with a condition:

```
ConditionExpression: "metadata_location = :old_metadata_location"
```

- **Success**: If the current value in DynamoDB matches `:old_metadata_location`, no other writer has committed. DynamoDB updates the value to point to the new metadata JSON path, completing the atomic swap.
- **Failure**: If another client committed during the write phase, the attribute value changed, and DynamoDB rejects the write. The client catches this transaction error, re-scans the table metadata, and retries the commit.

### Configuration Properties

To connect Spark or Flink engines to a DynamoDB-backed catalog, developers specify the DynamoDB catalog class and catalog table configuration:

```sql
/* Configure Spark to connect to a DynamoDB Catalog */
spark.sql.catalog.dy_prod = org.apache.iceberg.aws.dynamodb.DynamoDbCatalog
spark.sql.catalog.dy_prod.warehouse = s3://my-bucket/warehouse
spark.sql.catalog.dy_prod.dynamodb.table-name = my_iceberg_catalog_table
```

Using DynamoDB eliminates the cold-start latencies and maintenance tasks associated with traditional relational databases, making it a robust catalog choice for serverless workloads.
