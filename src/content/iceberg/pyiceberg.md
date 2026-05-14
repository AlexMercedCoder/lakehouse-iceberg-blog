---
term: "PyIceberg: Python Library for Apache Iceberg"
description: "PyIceberg is the official Python library for Apache Iceberg, providing a pure-Python client for reading, writing, and managing Iceberg tables without requiring Spark or the JVM, enabling Python-native data engineering and ML workflows."
category: "Engines & Integrations"
relatedTerms:
  - "what-is-apache-iceberg"
  - "iceberg-rest-catalog"
  - "iceberg-catalog"
  - "iceberg-data-files"
  - "iceberg-parquet"
  - "iceberg-agentic-lakehouse"
keywords:
  - pyiceberg
  - python iceberg
  - iceberg python library
  - pyiceberg tutorial
  - iceberg pandas arrow python
lastUpdated: 2026-05-14
---

## PyIceberg: Python Library for Apache Iceberg

**PyIceberg** is the official Python client library for Apache Iceberg, maintained as part of the Apache Iceberg project. It provides a pure-Python API for:

- Connecting to Iceberg catalogs (REST, Hive, Glue, Nessie)
- Reading Iceberg tables as PyArrow tables, Pandas DataFrames, or Dask/Ray collections
- Writing data to Iceberg tables
- Managing table schema, partitioning, and properties
- Running SQL queries against Iceberg tables (via DuckDB integration)

PyIceberg is the correct choice for Python data engineering workflows that don't require Spark's distributed processing. It's significantly lighter weight, faster to set up, and more Python-idiomatic.

## Installation

```bash
pip install "pyiceberg[s3fs,glue]"    # AWS with S3 storage
pip install "pyiceberg[adlfs,azure]"  # Azure
pip install "pyiceberg[gcs]"          # GCP
pip install "pyiceberg[duckdb]"       # Local with DuckDB SQL
```

## Connecting to a Catalog

### REST Catalog (Apache Polaris, Dremio Open Catalog, AWS Glue REST)

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "my_catalog",
    **{
        "type": "rest",
        "uri": "https://my-catalog.example.com",
        "credential": "client-id:client-secret",
    }
)
```

### AWS Glue Catalog

```python
catalog = load_catalog(
    "glue",
    **{
        "type": "glue",
        "region_name": "us-east-1",
    }
)
```

### Local / Development (SQL Catalog with DuckDB)

```python
catalog = load_catalog(
    "local",
    **{
        "type": "sql",
        "uri": "sqlite:///local_catalog.db",
        "warehouse": "file:///tmp/iceberg-warehouse",
    }
)
```

## Reading Iceberg Tables

```python
# Load a table
table = catalog.load_table("db.orders")

# Full table scan → PyArrow Table
arrow_table = table.scan().to_arrow()

# Convert to Pandas
df = arrow_table.to_pandas()

# Filter pushdown (predicates pushed to Iceberg manifest scanning)
from pyiceberg.expressions import GreaterThanOrEqual, LessThan, And

filtered = table.scan(
    row_filter=And(
        GreaterThanOrEqual("order_date", "2026-01-01"),
        LessThan("order_date", "2026-06-01")
    ),
    selected_fields=("order_id", "customer_id", "total"),
).to_arrow()
```

## Writing Data

```python
import pyarrow as pa

# Append new data
new_data = pa.table({
    "order_id": [1001, 1002, 1003],
    "customer_id": [42, 17, 99],
    "total": [150.00, 289.99, 44.50],
    "order_date": ["2026-05-14", "2026-05-14", "2026-05-14"],
})

table.append(new_data)

# Overwrite a partition
table.overwrite(new_data)
```

## Time Travel Queries

```python
# Load a specific snapshot by ID
snapshot = table.snapshot_by_id(8027658604211071520)
scan = table.scan(snapshot_id=snapshot.snapshot_id)
historical_data = scan.to_arrow()

# Load by timestamp
from datetime import datetime
snap = table.snapshot_as_of_timestamp(
    int(datetime(2026, 1, 1).timestamp() * 1000)  # milliseconds
)
```

## SQL via DuckDB Integration

PyIceberg integrates with DuckDB for SQL-based querying:

```python
import duckdb

# Register the Iceberg table with DuckDB
conn = duckdb.connect()
table = catalog.load_table("db.orders")

# Read via PyIceberg to Arrow, then query with DuckDB
arrow_table = table.scan().to_arrow()
conn.register("orders", arrow_table)

result = conn.execute("""
    SELECT customer_id, SUM(total) as revenue
    FROM orders
    WHERE order_date >= '2026-01-01'
    GROUP BY customer_id
    ORDER BY revenue DESC
    LIMIT 10
""").fetchdf()
```

## Schema and Metadata Operations

```python
# Inspect table schema
print(table.schema())

# List all snapshots
for snap in table.snapshots():
    print(snap.snapshot_id, snap.timestamp_ms, snap.operation)

# Inspect data files
for df in table.scan().plan_files():
    print(df.file.file_path, df.file.record_count)
```

## PyIceberg and the Agentic Lakehouse

PyIceberg is the natural integration point for AI agents and LLM-driven data workflows:

- **MCP servers**: AI agent frameworks can use PyIceberg to inspect Iceberg table schemas, run queries, and return results to LLMs.
- **LangChain tools**: PyIceberg can be wrapped as a LangChain tool for natural-language-to-Iceberg-query workflows.
- **Data pipeline automation**: Python-based orchestration frameworks (Airflow, Prefect) use PyIceberg for catalog management without Spark dependencies.

For Python-first AI and data engineering teams, PyIceberg is the fastest path to Iceberg integration.
