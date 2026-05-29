---
term: "Iceberg Identity Partition Transform"
description: "The default partition transform in Apache Iceberg that partitions data directly by the values of a source column without modification."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-hidden-partitioning"
  - "iceberg-bucket-partition-transform"
  - "iceberg-truncate-partition-transform"
keywords:
  - iceberg identity partition
  - identity transform
  - table partitioning
lastUpdated: 2026-05-29
---

## Iceberg Identity Partition Transform

The **Iceberg Identity Partition Transform** is the baseline partitioning strategy in Apache Iceberg. It maps the values of a source column directly to partition directories without applying any mathematical transformation or alteration. It is best suited for columns that naturally contain a low number of unique values, such as country codes, user segments, or department IDs.

Unlike traditional Hive partitioning where partition columns must be maintained as separate physical directories and explicitly referenced in user queries, Iceberg manages identity transforms natively as metadata mappings.

### Syntax and Implementation

Identity transforms are specified by naming the source column directly in the `PARTITIONED BY` clause:

```sql
/* Create a table partitioned by department using the identity transform */
CREATE TABLE corporate.employees (
    employee_id bigint,
    full_name string,
    department string,
    hire_date date
)
USING iceberg
PARTITIONED BY (department);
```

During table writes, the query engine automatically creates storage paths based on the values in the `department` column:

```
s3://my-bucket/corporate/employees/data/department=Engineering/
s3://my-bucket/corporate/employees/data/department=Sales/
```

### Evolving Partition Specs

If a table is originally unpartitioned, administrators can evolve the specification to use an identity partition:

```sql
/* Add a partition field using the identity transform */
ALTER TABLE corporate.employees ADD PARTITION FIELD department;
```

Iceberg handles this split-layout seamlessly. Data written before the alteration remains unpartitioned, while new data is written to partitioned directories. The table metadata JSON file tracks this shift, allowing query engines to plan scans correctly across both layouts.
