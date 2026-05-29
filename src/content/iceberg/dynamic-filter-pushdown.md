---
term: "Dynamic Filter Pushdown"
description: "A query optimization technique that uses runtime join results to dynamically filter scan operations on the opposing table, reducing storage I/O."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "iceberg-column-projection"
  - "dremio-sabot-engine"
keywords:
  - dynamic filter pushdown
  - dynamic partition pruning
  - query optimization
  - join optimization
lastUpdated: 2026-05-29
---

## Dynamic Filter Pushdown

**Dynamic Filter Pushdown** (also known as Dynamic Partition Pruning) is a query optimization technique designed to speed up join operations on large datasets. While standard filter pushdown applies static WHERE clauses (such as `WHERE year = 2026`) directly to the table scan, dynamic pushdown generates filtering criteria at runtime based on the values returned from join tables.

### How Dynamic Pushdown Works

Consider a typical star-schema query joining a large `fact_sales` table with a small `dim_stores` table:

```sql
SELECT s.amount, st.city
FROM fact_sales s
JOIN dim_stores st ON s.store_id = st.id
WHERE st.region = 'Europe';
```

Without dynamic pushdown, the engine must scan the entire `fact_sales` table, shuffle the rows across the network, and then discard rows that do not match European store IDs.

With dynamic filter pushdown, the engine optimizes the execution:

1.  **Scan Dimension Table**: The engine scans the small `dim_stores` table, applying the static filter (`region = 'Europe'`), and collects the matching `id` values.
2.  **Generate Dynamic Filter**: The coordinator builds a runtime filter containing these store IDs.
3.  **Push Filter to Fact Scan**: The engine passes this list of IDs down to the `fact_sales` table scanner.
4.  **Skip Metadata and Files**: Iceberg uses this dynamic list to prune files using manifest statistics and partition indexes, ensuring the engine only reads files associated with European store IDs.

### Architectural Value

This optimization minimizes the read footprint:

- **Saves Network Bandwidth**: Discards non-matching rows at the storage reader level, preventing useless shuffles.
- **Improves Cache Locality**: Reduces memory usage on executor nodes, leaving more space for hot caching.
- **Bypasses S3 Throttling**: Reduces the number of GET requests sent to cloud object storage.
