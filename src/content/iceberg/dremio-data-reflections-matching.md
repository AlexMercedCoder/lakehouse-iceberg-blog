---
term: "Dremio Data Reflections Matching"
description: "Dremio Data Reflections Matching is the query planner compiler logic that automatically identifies, evaluates, and substitutes pre-computed reflections into user SQL queries using cost-based algebraic rewriting rules."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-reflections"
  - "dremio-raw-reflections"
  - "dremio-aggregation-reflections"
keywords:
  - reflections matching
  - query rewrite matching
  - dremio calclite matching
  - query acceleration planner
  - dynamic query substitution
lastUpdated: 2026-05-29
---

## Dremio Data Reflections Matching

**Dremio Data Reflections Matching** is the compiler logic within Dremio's query planner that automatically substitutes pre-computed reflections into user SQL queries. Powered by **Apache Calcite**, this matching system acts as an algebraic rewrite optimizer. It analyzes incoming queries, compares them against the catalog of active reflections, and determines if a query can be served from reflection Parquet files instead of the raw physical source.

This matching process occurs entirely at compilation runtime. It is transparent to users, meaning database clients and BI tools do not need to reference reflection names or alter their SQL syntax to benefit from acceleration.

## The Matching Lifecycle

When an SQL query is submitted to Dremio, the coordinator node executes a series of planning phases:

1.  **Parsing and Validation**: Converts the raw SQL string into an abstract syntax tree (AST).
2.  **Logical Representation**: Translates the AST into a logical query plan represented as a tree of relational algebra operations (such as project, filter, join, and aggregate).
3.  **Reflection Normalization**: Ensures that all available reflections in the catalog are represented in the same relational algebra tree format.
4.  **Substitution Matching**: Executes Calcite query rewrite rules to search for tree isomorphisms. If a subtree of the user query plan matches a subtree of a reflection's plan, the planner replaces the original scan node with a scan node pointing to the reflection's storage files.
5.  **Cost Estimation**: Calculates the computational cost of the rewritten plans. If multiple reflections match, the query planner compares the costs (for example, comparing I/O volumes and CPU instructions) and selects the plan with the lowest overall cost.

## How Matches are Evaluated

The matching compiler supports two substitution models depending on the type of reflection:

### Raw Reflection Matching

For Raw Reflections, the planner evaluates whether the columns, filters, and join paths requested by the query exist within the reflection. The compiler can match queries even if they require:

- **Filter Pushdown**: The query requests a subset of rows (for example, `state = 'CA'`), and the Raw Reflection contains all states. The planner scans the reflection and pushes down the filter on the reflection.
- **Column Projection**: The query requests columns `A` and `B`, and the reflection contains columns `A`, `B`, and `C`. The planner projects only the necessary columns from the reflection files.

### Aggregation Reflection Matching

For Aggregation Reflections, the planner determines if the query's group-by groupings and mathematical metrics can be calculated from the reflection. This enables:

- **Rollups**: If a query groups by `year` and `month`, and the Aggregation Reflection groups by `year`, `month`, and `day`, the matching logic aggregates the day-level metrics up to the month level.
- **Metric Computations**: Derives averages from pre-computed sums and counts stored in the reflection.

## Diagnostic Tools: Checking Reflection Matches

Data architects can inspect how Dremio matched and substituted queries by opening the query profile in the Dremio UI:

- **Accelerated**: Indicates that the matching engine successfully substituted a reflection to execute the query.
- **Non-Accelerated**: Indicates the query scanned the raw sources. Architects can view the "Acceleration" tab to read compiler logs, which explain why specific reflections were not matched (for example, missing dimensions, incompatible join paths, or data freshness limitations).
