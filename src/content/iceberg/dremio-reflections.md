---
term: "Dremio Reflections"
description: "Dremio Reflections are pre-computed query acceleration structures that automatically optimize and speed up SQL queries using Apache Calcite query planning rewrites without requiring user query modifications."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-raw-reflections"
  - "dremio-aggregation-reflections"
  - "dremio-apache-iceberg"
  - "dremio-data-reflections-matching"
keywords:
  - dremio reflections
  - query acceleration reflections
  - dremio acceleration
  - automatic query rewrite
  - dremio performance
lastUpdated: 2026-05-29
---

## Dremio Reflections

**Dremio Reflections** are pre-computed, optimized layouts of data stored in Parquet format that the Dremio query planner leverages to accelerate SQL execution. Reflections function similarly to materialized views in relational databases, but with a critical distinction: users never query a reflection directly. Instead, Dremio uses Apache Calcite to analyze incoming SQL queries and automatically rewrite them to read from one or more matching reflections.

By decoupling query acceleration from the user-facing SQL layer, Dremio Reflections allow data teams to optimize performance transparently. If a reflection is created, updated, or dropped, user queries, dashboards, and BI reports continue to query the original physical or virtual datasets without any code modifications.

## How Dremio Reflections Work

Reflections are managed entirely by Dremio's coordinator and executor nodes:

1.  **Definition**: An administrator or data architect enables a Raw or Aggregation reflection on a physical dataset (PDS) or virtual dataset (VDS).
2.  **Materialization**: Dremio executes the query definition behind the reflection, optimizes the layout (including sorting, partitioning, and distribution settings), and writes the output as Parquet files to the configured distributed store (such as Amazon S3, Azure Data Lake, or HDFS).
3.  **Query Rewrite**: When a client submits an SQL query, Dremio's compiler matches the logical plan against available reflections. If a reflection can satisfy the query, the planner automatically swaps the raw data source scan with a scan of the pre-computed reflection files.
4.  **Maintenance**: Dremio automatically refreshes reflections based on configurable refresh policies (incremental or full updates), tracking partition changes and data freshness.

## Types of Reflections

Dremio categorizes reflections into two primary types based on workload patterns:

- **Raw Reflections**: Designed to accelerate queries requiring row-level detail, filtering, sorting, or complex joins. Raw reflections preserve the original data columns, allowing sorting and partitioning on selected fields to speed up selective scans.
- **Aggregation Reflections**: Designed to accelerate analytical queries that perform groupings, sums, counts, and other mathematical aggregations. These reflections store data grouped by specific dimension columns, pre-calculating measures to serve high-level dashboards instantly.

## The Role of Apache Calcite

The core technology behind Dremio Reflections is Apache Calcite, an open source framework for query planning and optimization. During the planning phase, Dremio represents both the incoming user query and all active reflections as relational algebra trees.

Calcite executes a series of rules to determine if a reflection's logical tree can substitute all or part of the query's logical tree. If multiple matching reflections are found, Calcite estimates the cost of each execution plan and selects the plan with the lowest computational cost.

## Benefits for Apache Iceberg Lakehouses

Integrating Dremio Reflections with Apache Iceberg tables provides significant architectural advantages:

- **Bypassing Object Storage Latency**: Scan operations on cloud object storage suffer from metadata lookup overheads. Reflections pre-consolidate data, reducing file counts and catalog requests.
- **Decoupling Compute Costs**: By reading pre-computed aggregations instead of scanning billions of raw Iceberg rows, reflections dramatically lower the CPU resources required per query.
- **Consistent BI Performance**: Reflections can accelerate complex dashboard joins and filter loops to sub-second response times, meeting strict concurrency SLAs.
