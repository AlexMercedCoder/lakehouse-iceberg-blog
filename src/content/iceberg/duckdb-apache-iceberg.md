---
term: "DuckDB and Apache Iceberg"
description: "DuckDB is an embedded analytical database with a native Apache Iceberg extension that enables direct, high-performance SQL queries over Iceberg tables from Python, R, and other local environments without requiring Spark or a distributed cluster."
category: "Engines & Integrations"
relatedTerms:
  - "pyiceberg"
  - "iceberg-rest-catalog"
  - "apache-polaris-catalog"
  - "trino-apache-iceberg"
  - "iceberg-parquet"
  - "what-is-apache-iceberg"
keywords:
  - duckdb iceberg
  - duckdb apache iceberg
  - duckdb iceberg extension
  - local iceberg analytics
  - duckdb iceberg python
lastUpdated: 2026-05-14
---

## DuckDB and Apache Iceberg

**DuckDB** is an embedded, in-process analytical database that runs directly within Python, R, Julia, Java, and other language runtimes — no server, no cluster, no infrastructure required. Its native **Apache Iceberg extension** makes DuckDB one of the fastest and most frictionless ways to query Iceberg tables, particularly for data scientists and engineers working locally or in notebooks.

DuckDB + Iceberg has emerged as the go-to stack for lightweight Iceberg analytics, replacing the need to spin up a Spark cluster for exploratory data work on lakehouse tables.

## Why DuckDB for Iceberg?

Before DuckDB's Iceberg extension, querying Iceberg tables locally required:

1. Installing and configuring Apache Spark (JVM-heavy, complex setup).
2. Or using PyIceberg to load data into Pandas/Arrow — limited to in-memory scale.

DuckDB provides:

- **Sub-second cold start**: No JVM, no cluster initialization. DuckDB opens in milliseconds.
- **Full SQL**: Standard SQL with analytical extensions (window functions, QUALIFY, PIVOT, etc.).
- **Vectorized execution**: DuckDB's columnar execution engine is extremely fast for aggregation and filtering.
- **Direct Parquet reading**: DuckDB reads Parquet files natively — the same files Iceberg tables are built on.
- **Iceberg metadata awareness**: DuckDB reads Iceberg manifest files to understand the table structure and apply partition pruning.

## Installing the Iceberg Extension

```sql
-- In DuckDB (SQL or Python)
INSTALL iceberg;
LOAD iceberg;
```

Or in Python:

```python
import duckdb

conn = duckdb.connect()
conn.execute("INSTALL iceberg; LOAD iceberg;")
```

## Querying Iceberg Tables with DuckDB

### Direct Table Scan (Metadata File Path)

```python
import duckdb

conn = duckdb.connect()
conn.execute("INSTALL iceberg; LOAD iceberg;")

# Query an Iceberg table directly by metadata file path
result = conn.execute("""
    SELECT customer_id, SUM(total) as revenue
    FROM iceberg_scan('s3://my-bucket/warehouse/db/orders/metadata/v5.metadata.json')
    WHERE order_date >= '2026-01-01'
    GROUP BY customer_id
    ORDER BY revenue DESC
    LIMIT 10
""").fetchdf()

print(result)
```

### Using iceberg_scan() Function

```sql
-- Read all data from an Iceberg table
SELECT * FROM iceberg_scan('s3://my-bucket/warehouse/db/orders/');

-- With predicate pushdown (DuckDB pushes filters to file scanning)
SELECT order_id, customer_id, total
FROM iceberg_scan('s3://my-bucket/warehouse/db/orders/')
WHERE order_date BETWEEN '2026-05-01' AND '2026-05-14'
  AND total > 100.00;
```

### Time Travel

```sql
-- Query a specific snapshot
SELECT count(*) FROM iceberg_scan(
    's3://my-bucket/warehouse/db/orders/',
    version = '8027658604211071520'
);
```

## DuckDB + PyIceberg: The Power Combo

The most ergonomic pattern is combining PyIceberg (for catalog access and table management) with DuckDB (for SQL execution):

```python
import duckdb
from pyiceberg.catalog import load_catalog

# Load table via PyIceberg catalog (handles auth, credential vending)
catalog = load_catalog("my_catalog", **{
    "type": "rest",
    "uri": "https://my-catalog.example.com",
    "credential": "client-id:client-secret",
})

table = catalog.load_table("db.orders")

# Scan to Arrow table via PyIceberg (handles Iceberg metadata)
arrow_table = table.scan(
    selected_fields=("order_id", "customer_id", "total", "order_date")
).to_arrow()

# Query with DuckDB SQL (handles analytics)
conn = duckdb.connect()
conn.register("orders", arrow_table)

result = conn.execute("""
    SELECT
        date_trunc('month', order_date) as month,
        COUNT(*) as orders,
        SUM(total) as revenue
    FROM orders
    WHERE order_date >= '2026-01-01'
    GROUP BY 1
    ORDER BY 1
""").fetchdf()
```

## DuckDB Iceberg Extension Capabilities

| Capability                          | Status (2025+)    |
| ----------------------------------- | ----------------- |
| Read Iceberg tables (Parquet files) | ✅ Full           |
| Partition pruning                   | ✅                |
| Predicate pushdown                  | ✅                |
| Time travel (by snapshot ID)        | ✅                |
| Iceberg REST Catalog integration    | ✅ (via `attach`) |
| Write to Iceberg tables             | 🚧 In development |
| Delete file support (MoR reads)     | ✅                |
| Schema evolution handling           | ✅                |

## DuckDB MotherDuck + Iceberg

MotherDuck (the cloud-hosted DuckDB service) supports Iceberg table scanning, enabling shared SQL analytics over Iceberg tables without any infrastructure management — suitable for small team collaborative analytics.

## Performance Characteristics

DuckDB is extremely competitive with full distributed engines for single-machine data sizes:

- **Up to ~100GB of data**: DuckDB often outperforms Spark due to elimination of JVM/network overhead.
- **100GB–1TB**: DuckDB can still handle this range with sufficient RAM.
- **1TB+**: Use distributed engines (Dremio, Trino, Spark) for full-scale production analytics.

For exploratory analysis, model validation, and development workflows on Iceberg tables, DuckDB is the right tool. For production-scale analytics serving dashboards or AI agents, Dremio's Intelligent Query Engine provides the performance, governance, and AI integration needed.
