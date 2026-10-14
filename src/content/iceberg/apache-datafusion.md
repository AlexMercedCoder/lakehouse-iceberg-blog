---
term: "Apache DataFusion"
metaTitle: "Apache DataFusion and Iceberg | Embeddable Rust SQL Engine"
description: "Apache DataFusion is an embeddable Rust SQL engine built on Apache Arrow. See how it reads and writes Iceberg tables and compares to DuckDB, Spark, and Trino."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "pyiceberg"
  - "dremio-sabot-engine"
  - "duckdb-apache-iceberg"
  - "trino-apache-iceberg"
keywords:
  - datafusion
  - apache datafusion
  - rust query engine
  - iceberg rust datafusion
  - datafusion-iceberg
lastUpdated: 2026-10-14
---

## Apache DataFusion

**Apache DataFusion** is an open source, extensible query engine written in Rust that uses Apache Arrow as its in-memory format. It ships as a library, not a server: developers add it to a Rust project and get a SQL parser, a DataFrame API, a query planner and optimizer, and a multi-threaded, vectorized execution engine that reads Parquet, CSV, JSON, and Arrow data.

DataFusion started as a subproject of Apache Arrow and became its own Apache top-level project in 2024. Projects built on it include InfluxDB 3, Apache DataFusion Comet (a Spark accelerator), and Ballista (distributed execution).

### How It Is Built

- **Rust.** Rust gives native performance without a garbage collector, and its compiler rules out whole classes of memory-safety bugs in safe code. That avoids the JVM pause behavior that Java engines have to tune around, though query latency still depends on the plan, the I/O, and the data.
- **Arrow end to end.** Data moves between operators as Arrow record batches, so an application that already speaks Arrow can hand data in and take results out without a conversion step.
- **Extension points.** DataFusion exposes traits (Rust interfaces) for nearly every layer: `TableProvider` and `CatalogProvider` for data sources, user-defined scalar, aggregate, and window functions, custom optimizer rules, and custom `ExecutionPlan` operators. Teams build their own engines by plugging into these rather than forking the codebase.

### Iceberg Integration Scope

DataFusion learns about Apache Iceberg through the **`iceberg-datafusion`** crate, which implements DataFusion's traits on top of iceberg-rust:

- **Catalog and table providers**: `IcebergCatalogProvider` wraps any iceberg-rust catalog, such as an Iceberg REST catalog client, so namespaces appear as DataFusion schemas and tables become queryable with SQL. `IcebergTableProvider` handles scans for a single table.
- **External tables and time travel**: `IcebergTableProviderFactory` adds `CREATE EXTERNAL TABLE ... STORED AS ICEBERG`, pointed at an existing metadata file, without a catalog. A static, read-only provider can be bound to a specific snapshot ID.
- **Creating, dropping, and appending**: Through a registered catalog, tables can be created and dropped, and `INSERT INTO` writes new Parquet files and commits the matching metadata. For partitioned tables, rows are sorted by partition value before writing, so each partition is written together instead of as many small files.
- **Query optimizations**: Filters are translated into Iceberg predicates and pushed down to the scan, along with limits, so iceberg-rust can prune manifests and data files using metadata statistics before reading Parquet.
- **Merge-on-read tables**: iceberg-rust applies positional and equality delete files during the scan.

### Where the Integration Lives Now

The crate started inside `apache/iceberg-rust`. In September 2026 the Iceberg community voted to move it into a new `apache/datafusion-iceberg` repository under the DataFusion project (the vote passed on September 14 with 17 +1 votes and none against). The crate name stays `iceberg-datafusion`. [Why the Iceberg DataFusion Integration Is Moving to Apache DataFusion](https://iceberglakehouse.com/posts/datafusion-iceberg-moves-to-apache-datafusion/) covers what moved and why. DataFusion also powers native Iceberg scans for Spark through Comet; see [DataFusion Comet 1.0 and Spark on Iceberg](https://iceberglakehouse.com/posts/datafusion-comet-1-spark-iceberg/).

### DataFusion vs Other Iceberg Engines

|                 | Apache DataFusion                  | DuckDB                         | Apache Spark SQL              | Trino                          |
| --------------- | ---------------------------------- | ------------------------------ | ----------------------------- | ------------------------------ |
| Form            | Rust library                       | Embedded C++ database          | Distributed JVM engine        | Distributed JVM SQL server     |
| Main use        | Building engines and data services | Local and in-process analytics | Large batch ETL and streaming | Interactive SQL across sources |
| Extensibility   | Deep (planner, operators, sources) | Extensions                     | Data sources, UDFs, plugins   | Connectors, UDFs               |
| Iceberg support | `iceberg-datafusion` crate         | `iceberg` extension            | Mature, read and write        | Mature, read and write         |

Pick DataFusion when you are building a product or service that needs a query engine inside it. For a ready-to-use tool, [DuckDB](/iceberg/duckdb-apache-iceberg/), [Spark](/iceberg/spark-apache-iceberg/), [Trino](/iceberg/trino-apache-iceberg/), or Dremio are closer to what you want.
