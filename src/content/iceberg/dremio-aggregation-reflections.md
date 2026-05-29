---
term: "Dremio Aggregation Reflections"
description: "Dremio Aggregation Reflections are pre-computed data structures that store pre-aggregated metrics and measures grouped by specific dimension columns, accelerating high-level BI dashboards and analytical queries."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-reflections"
  - "dremio-raw-reflections"
  - "dremio-data-reflections-matching"
keywords:
  - dremio aggregation reflections
  - aggregation reflections
  - query acceleration metrics
  - bi acceleration dremio
  - pre-computed aggregates
lastUpdated: 2026-05-29
---

## Dremio Aggregation Reflections

**Dremio Aggregation Reflections** are pre-computed, summarized representations of datasets optimized for analytical queries. Instead of storing row-level records, Aggregation Reflections group data by designated dimension columns and calculate aggregate measures (such as counts, sums, minimums, maximums, and distinct values).

When users interact with Business Intelligence (BI) dashboards, run executive reports, or execute analytical SQL queries performing `GROUP BY` operations, Dremio's planner automatically routes the queries to read from the matching Aggregation Reflection. This avoids scanning millions or billions of individual source files, reducing query response times to sub-second levels while significantly lowering engine CPU workload.

## Dimensions vs. Measures

Configuring an Aggregation Reflection requires identifying the query patterns of the target workloads:

- **Dimensions**: The fields used to group, filter, or slice data. Typical dimensions include date/time attributes (year, month, day), geographic boundaries (country, state, city), and entity attributes (product category, department).
- **Measures**: The numerical values subjected to mathematical aggregation. Common measures include revenue, order volume, quantity sold, and active customer counts.

For each designated measure, Dremio pre-calculates and stores specific aggregate values:

- **Sum**: Pre-computed totals for columns.
- **Count**: Raw number of rows matching the group.
- **Min and Max**: Boundary values for range check calculations.
- **Approximate Distinct (HLL)**: HyperLogLog sketches enabling fast distinct value estimations (such as unique active user counts) without expensive hash lookups.

## Automated Rollup Capabilities

One of the most powerful features of Dremio's aggregation optimizer is its ability to perform rollups. If an Aggregation Reflection is grouped by granular dimensions (such as daily transactions), Dremio can utilize it to satisfy queries requesting higher-level aggregations (such as monthly or yearly summaries).

```
Reflection Grouping: Year, Month, Day, Region, Sum(Amount)
User Query Grouping: Year, Month, Sum(Amount)
→ Dremio Planner Actions: Automatically scans the reflection and aggregates the daily totals to monthly totals.
```

This rollup logic means a single, well-designed Aggregation Reflection can accelerate a wide array of reporting dashboards, eliminating the need to build separate pre-aggregated summary tables manually.

## Benefits for Cloud Storage

Since Aggregation Reflections condense row-level data into summary rows, they are highly compact. An Iceberg table containing one billion rows might compress into an Aggregation Reflection of only a few thousand rows. This drastic reduction in data volume minimizes network transfer overheads, avoids cloud storage egress fees, and prevents executor memory bottlenecks during large-scale join and aggregation phases.
