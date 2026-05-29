---
term: "Iceberg Column Projection"
description: "The process of reading only the specific fields requested by a query from physical storage files using unique field IDs instead of column names."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-column-mapping"
  - "iceberg-nested-type-system"
keywords:
  - column projection
  - field id mapping
  - iceberg query optimization
lastUpdated: 2026-05-29
---

## Iceberg Column Projection

**Iceberg Column Projection** is a query planning optimization that extracts only the columns required to satisfy a SQL query, avoiding the overhead of reading unused fields from physical disk storage. Because analytical formats like Parquet and ORC organize data columns sequentially, query engines use projection to skip entire segments of files, reducing storage I/O and network transfer costs.

Iceberg improves on traditional projection techniques by mapping columns to unique, immutable integer field IDs rather than string column names.

### Field ID Resolution

In Hive-style tables, columns are projected by name. If a column is renamed or reordered, older data files become unreadable or require expensive rewrite operations to align names. Iceberg solves this problem:

- **Metadata mapping**: The table's schema mapping translates user-visible SQL column names to underlying field IDs.
- **Name-independence**: If a query requests a column `user_email`, Iceberg maps the request to field ID `10`. The query engine instructs the reader to pull field ID `10` from the Parquet files, regardless of what string column name was stored inside those files when they were written.

```sql
/* The engine projects only field IDs associated with customer_id and amount */
SELECT customer_id, amount FROM sales.orders;
```

### Nested Column Projection

Column projection is also applied to nested data types (structs, lists, and maps). If a table has a struct column representing user profiles, and a query requests only `profile.zipcode`, Iceberg projects only the nested zipcode field:

```json
{
  "id": 4,
  "name": "profile",
  "type": {
    "type": "struct",
    "fields": [
      { "id": 5, "name": "street", "type": "string", "required": false },
      { "id": 6, "name": "zipcode", "type": "string", "required": false }
    ]
  }
}
```

The projection planner tells the file reader to read field ID `6` and ignore field ID `5`. This nested pruning minimizes disk scans and improves retrieval performance for datasets with complex schemas.
