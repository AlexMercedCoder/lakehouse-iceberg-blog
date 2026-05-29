---
term: "Dremio SQL Runner"
description: "Dremio SQL Runner is the integrated web-based query editor and SQL interface inside the Dremio console used for writing queries, exploring schemas, and analyzing query profiles."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-virtual-datasets-vds"
keywords:
  - dremio sql runner
  - sql editor dremio
  - query profiling tool
  - web sql console
  - create vds editor
lastUpdated: 2026-05-29
---

## Dremio SQL Runner

The **Dremio SQL Runner** is the built-in, web-based SQL editor and interactive development environment (IDE) inside the Dremio user interface. It serves as the primary workspace where data analysts, engineers, and administrators write SQL statements, explore catalog metadata, preview execution results, and perform query diagnostics.

The SQL Runner is designed to simplify dataset curation, allowing users to transform raw query drafts directly into permanent Virtual Datasets (VDS) with a single click.

## Core Features of the SQL Runner

The SQL Runner incorporates several developer-centric capabilities:

- **Autocompletion and Syntax Highlighting**: Natively suggests SQL keywords, database functions, catalog tables, spaces, and folder paths as the user types.
- **Dataset Schema Exploration**: Displays a sidebar panel containing the active data catalog hierarchy, enabling developers to browse schemas, tables, views, and data types without executing `DESCRIBE` queries.
- **Result Set Previews**: Renders query output in a fast, paginated grid interface. Users can inspect columns, filter preview rows, and analyze data types before exporting results.
- **One-Click VDS Creation**: Includes a "Save As" function that converts the active SQL query into a reusable Virtual Dataset, saving it into a designated Dremio Space.

## Query Profile Diagnostics

A key benefit of executing queries within the SQL Runner is direct access to Dremio's query profiling engine. After a query runs, developers can click to inspect the execution profile:

- **Acceleration Analysis**: Shows if the query successfully matched any Raw or Aggregation Reflections, listing exactly which reflections were utilized.
- **Execution Timeline**: Details where time was spent during execution (for example, mapping out time spent on metadata compilation, queue wait queues, thread scans, and network data shuffles).
- **Operator Graph**: Provides a visual node diagram showing how data flowed through execution steps, helping developers identify query bottlenecks and partition skew issues.
