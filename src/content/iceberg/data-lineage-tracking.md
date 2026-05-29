---
term: "Data Lineage Tracking"
description: "The practice of documenting and visualizing the lifecycle, transformations, and flow of data from its source to its final analytics destination."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-audit-logging"
keywords:
  - data lineage
  - lineage tracking
  - column lineage
  - table lineage
lastUpdated: 2026-05-29
---

## Data Lineage Tracking

**Data Lineage Tracking** is the governance practice of tracing the origin, transformations, and final destinations of datasets within an analytical platform. In complex data architectures where raw data is ingested, partitioned, cleaned, and aggregated across multiple stages, lineage tracking provides visibility into how specific datasets were created and how changes propagate downstream.

### Levels of Lineage

Lineage is tracked at different levels of granularity:

1.  **Table-Level Lineage**: Shows how tables depend on one another. For example, it maps a gold-level aggregation table back to its raw bronze-level source tables.
2.  **Column-Level Lineage**: Maps the transformations of individual columns. It traces how a column like `net_revenue` is computed from columns like `gross_sales` and `discount_rate` in upstream tables.
3.  **Job-Level Lineage**: Documents the specific execution pipelines, scheduled jobs, and script versions that processed the data.

### Implementing Lineage in Lakehouses

Modern lakehouse environments capture lineage data automatically:

- **Catalog Integration**: Catalogs (like Apache Polaris or Unity Catalog) log table read and write APIs. When an engine reads Table A and writes to Table B, the catalog registers this dependency.
- **Query Planning Analysis**: Query engines (such as Dremio) analyze the logical AST of SQL operations during compilation to extract column-to-column mappings.
- **Pipeline Orchestrators**: Tools like dbt and Airflow generate dependency graphs based on SQL model configurations and task schedules, presenting a visual map of the data pipeline.

### Operational Value

Data lineage tracking is essential for modern operations:

- **Impact Analysis**: Prior to changing a table schema or column type, engineers can use the lineage graph to identify which downstream dashboards or reports will break.
- **Troubleshooting**: If a report displays incorrect figures, analysts can trace the lineage upstream to find where the error was introduced.
- **Compliance and Auditing**: Simplifies regulatory audits (such as GDPR or HIPAA) by proving exactly where sensitive data came from and how it is used.
