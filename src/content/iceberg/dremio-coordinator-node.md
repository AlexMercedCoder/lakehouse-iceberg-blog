---
term: "Dremio Coordinator Node"
description: "The control plane node in a Dremio cluster responsible for query parsing, optimization, metadata catalog management, and client connections."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-sabot-engine"
  - "dremio-metadata-caching"
  - "dremio-sql-runner"
keywords:
  - dremio coordinator
  - dremio master coordinator
  - query planning dremio
lastUpdated: 2026-05-29
---

## Dremio Coordinator Node

A **Dremio Coordinator Node** acts as the primary control plane and intellectual hub of a Dremio cluster. While executor nodes handle the physical data processing, the coordinator manages the user interface, accepts SQL queries from clients (such as BI tools, web applications, or JDBC/ODBC endpoints), parses and optimizes query plans, and coordinates execution tasks across the cluster.

### Roles and Architecture

Dremio distinguishes between two classes of coordinator nodes to ensure high availability and scalability:

- **Master Coordinator**: This node manages the master metadata catalog, schedules background reflection refreshes, orchestrates source metadata syncs, and updates the internal key-value store (KV-store) catalog database. Only one coordinator acts as the master coordinator at any given time.
- **Scale-out Coordinators**: These auxiliary nodes are deployed behind a load balancer to handle concurrent user connections, parse queries, and generate physical execution plans. They fetch shared metadata from the Master Coordinator via high-speed gRPC streams to execute query compiles.

### Query Planning and Optimization

When a SQL query arrives at a coordinator, it goes through several planning phases:

```sql
/* Query parsing, catalog validation, and plan compilation occur on the coordinator */
SELECT * FROM business_space.sales_vds WHERE transaction_year = 2026;
```

1.  **Parsing and Validation**: The coordinator parses the SQL statement using an Apache Calcite-based compiler and validates the query against schemas in the metadata catalog.
2.  **Reflection Matching**: The cost-based optimizer checks if the logical expression tree matches any pre-computed data reflections (materializations). If a match is found, the plan is rewritten to scan the reflection instead of the raw source.
3.  **Physical Plan Generation**: The compiler generates an optimized, parallelized physical execution plan specifying partition scans, join algorithms, and memory allocation.
4.  **Task Distribution**: The coordinator slices the plan into fragments and distributes them to executor nodes running the Sabot engine for processing.
