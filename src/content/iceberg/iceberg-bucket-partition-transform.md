---
term: "Iceberg Bucket Partition Transform"
description: "An Iceberg partition transform that hashes values of a source column into a user-specified number of buckets to distribute data evenly."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-hidden-partitioning"
  - "iceberg-identity-partition-transform"
  - "iceberg-truncate-partition-transform"
keywords:
  - iceberg bucket partition
  - bucket transform
  - hash partitioning
lastUpdated: 2026-05-29
---

## Iceberg Bucket Partition Transform

The **Iceberg Bucket Partition Transform** distributes table records across a fixed number of partitions by applying a hash function to a source column. The resulting hash value is divided modulo the specified bucket count, placing the row into a deterministic bucket. This transform is ideal for high-cardinality columns (such as UUIDs, user IDs, or transaction IDs) that cannot be partitioned using identity transforms without creating too many small directories.

By grouping records into a fixed number of buckets, this strategy avoids partition hotspots in cloud object storage while enabling query engines to prune irrelevant partitions when queries filter on the bucketed column.

### Syntax and Implementation

Bucket transforms are configured by specifying the bucket count and the target column:

```sql
/* Partition the transactions table into 16 buckets based on customer_id */
CREATE TABLE financial.transactions (
    transaction_id string,
    customer_id string,
    amount double,
    transaction_date timestamp
)
USING iceberg
PARTITIONED BY (bucket(16, customer_id));
```

The data files are written to folders corresponding to the computed bucket number:

```
s3://my-bucket/financial/transactions/data/customer_id_bucket=0/
s3://my-bucket/financial/transactions/data/customer_id_bucket=1/
```

### Query Pruning and Joins

When a query filter is applied to the bucketed column, the coordinator calculates which bucket contains the matching hash and directs executors to scan only that partition:

```sql
/* The engine hashes the filter value and scans only the matching bucket */
SELECT * FROM financial.transactions WHERE customer_id = 'cust_98765';
```

Additionally, if two large tables are bucket-partitioned on the same join key with the same number of buckets, query planners can perform optimized bucket-joins, matching buckets locally to eliminate expensive network shuffles.
