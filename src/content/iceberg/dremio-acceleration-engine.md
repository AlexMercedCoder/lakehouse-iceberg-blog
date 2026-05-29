---
term: "Dremio Acceleration Engine"
description: "The Dremio Acceleration Engine is the dedicated resource allocation mechanism within Dremio executors responsible for building, updating, and maintaining reflections without impacting user queries."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-reflections"
keywords:
  - acceleration engine
  - dremio acceleration compute
  - refresh reflections engine
  - resource isolation dremio
  - workload management query
lastUpdated: 2026-05-29
---

## Dremio Acceleration Engine

The **Dremio Acceleration Engine** is the specialized compute allocation system within Dremio that builds, refreshes, and maintains reflections. In high-concurrency enterprise environments, background data maintenance processes (such as updating pre-computed query reflections) can consume substantial compute resources, creating CPU contention that slows down user queries.

The Acceleration Engine resolves this by separating the query execution compute resources from the reflection maintenance compute pools, ensuring that background updates do not degrade the performance of live BI dashboards and user queries.

## Workload Isolation and Resource Routing

Dremio manages compute resources by dividing executor nodes into distinct engine groups:

```
[Incoming SQL Queries] ────> [Default Query Engine (Executors 1-8)] ──> Server Client
[Reflection Refresh Tasks] ──> [Acceleration Engine (Executors 9-12)] ──> Writes to S3 Store
```

This physical or logical separation provides two main benefits:

- **SLA Protection**: When an Iceberg table updates and triggers a reflection refresh, Dremio schedules the compilation and write tasks to execute on the Acceleration Engine nodes. Live user queries continue running on the query engine nodes with zero CPU interference.
- **Cost Control**: The Acceleration Engine can be configured to auto-scale independently. It spins up executor nodes when reflection refreshes are queued and suspends them once the materializations are written to storage, minimizing cloud infrastructure costs.

## Workload Management (WLM) Rules

Dremio uses Workload Management (WLM) rules to route query tasks to the appropriate engines:

1.  **Rule Evaluation**: The coordinator checks the query type and origin.
2.  **Internal Routing**: System queries triggered by the reflection manager (such as `CREATE REFLECTION` or `REFRESH REFLECTION`) are automatically routed to the designated Acceleration queue.
3.  **Queue Prioritization**: Within the Acceleration Engine, tasks are prioritized by size and dependency, ensuring that small reflections refresh quickly while large-scale rebuilds run in the background.
