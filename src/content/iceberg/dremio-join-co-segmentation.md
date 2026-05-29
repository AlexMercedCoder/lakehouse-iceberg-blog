---
term: "Dremio Join Co-segmentation"
description: "Dremio Join Co-segmentation is a query planning optimization that aligns join keys with matching table partition structures, executing joins locally on executors to eliminate network data shuffles."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-sabot-engine"
  - "iceberg-data-skipping"
  - "dremio-reflections"
keywords:
  - join co-segmentation
  - dremio join optimization
  - eliminate shuffle join
  - partition aligned join
  - distributed query execution
lastUpdated: 2026-05-29
---

## Dremio Join Co-segmentation

**Dremio Join Co-segmentation** (also known as Colocated Join Optimization) is a query optimization technique executed by Dremio's query planner to accelerate distributed joins between large datasets. In distributed query processing, joining two large tables typically requires a shuffle join, where executor nodes partition and stream data across the network so that rows with matching join keys end up on the same physical node.

Join Co-segmentation eliminates this network transfer phase. If the joining tables are partitioned on the same key, Dremio assigns matching partition files to the same executor nodes, executing the join operations locally in memory.

## The Cost of Shuffle Joins vs. Co-segmented Joins

### Traditional Shuffle Join

When joining `orders` and `customers` on `customer_id` without co-segmentation:

1.  Executor A reads a block of `orders`.
2.  Executor B reads a block of `customers`.
3.  Both executors calculate hashes on `customer_id` and send records across the network to Executor C.
4.  Executor C performs the in-memory join calculation.

This network shuffle stage introduces latency and CPU serialization overhead.

### Co-segmented Join

When both tables are partitioned on `customer_id`:

1.  The query planner maps partition files (for example, `customer_id` hash bucket 12) from both tables to Executor A.
2.  Executor A reads the local NVMe cache blocks for both tables and executes the join.
3.  No records are sent across the network.

By keeping the data local to the executor node, join co-segmentation achieves linear execution scaling.

## Requirements for Co-segmentation

For Dremio to apply Join Co-segmentation, queries must meet three criteria:

- **Identical Partition Keys**: Both tables must be partitioned on the exact columns used in the SQL join predicate (for example, joining on `customer_id` where both tables are partitioned on `customer_id`).
- **Compatible Partition Transforms**: For Apache Iceberg tables, the tables must use compatible partition transformations (such as both tables utilizing bucket partitioning with the same number of buckets).
- **Planner Matching**: Dremio's coordinator node must align the file split assignments, ensuring that corresponding partition folders from both tables are dispatched to the same executor nodes.

## Optimization with Raw Reflections

Data engineers can force join co-segmentation on unpartitioned source tables using Raw Reflections. By creating Raw Reflections on two tables and configuring both reflections to use matching partition and distribution keys, Dremio can rewrite queries to join the reflections, executing accelerated, co-segmented joins without restructuring the original source tables.
