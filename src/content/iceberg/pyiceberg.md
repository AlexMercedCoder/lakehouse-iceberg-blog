---
term: "PyIceberg: Python Library for Apache Iceberg"
metaTitle: "PyIceberg Tutorial: Read and Write Iceberg in Python"
description: "PyIceberg is the official Python library for Apache Iceberg: read, write, and manage tables without Spark or a JVM. Install it and connect a catalog."
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
lastUpdated: 2026-10-15
---

## PyIceberg: Python Library for Apache Iceberg

PyIceberg lets you read, write, and manage Apache Iceberg tables from plain Python, no Spark or JVM required. Install it with `pip install "pyiceberg[pyarrow]"` (current release 0.12.0), point `load_catalog` at a REST, Glue, Hive, SQL, or DynamoDB catalog, and scan tables into PyArrow, pandas, Polars, or DuckDB.

**PyIceberg** is the official Python client library for Apache Iceberg, maintained as part of the Apache Iceberg project. It provides a pure-Python API for:

- Connecting to Iceberg catalogs (REST, SQL, Hive, Glue, DynamoDB, plus BigQuery metastore and in-memory)
- Reading Iceberg tables as PyArrow tables, pandas or Polars DataFrames, DuckDB relations, Ray datasets, or Daft DataFrames
- Writing data to Iceberg tables
- Managing table schema, partitioning, and properties
- Running SQL queries against Iceberg tables (via DuckDB integration)

PyIceberg is the correct choice for Python data engineering workflows that don't require Spark's distributed processing. It's significantly lighter weight, faster to set up, and more Python-idiomatic.

## Installation

```bash
pip install "pyiceberg[pyarrow,glue]"   # AWS Glue catalog, S3 via PyArrow
pip install "pyiceberg[pyarrow,adlfs]"  # Azure
pip install "pyiceberg[pyarrow,gcsfs]"  # GCP
pip install "pyiceberg[duckdb,sql-sqlite]"  # Local SQL catalog with DuckDB
```

## Connecting to a Catalog

### REST Catalog (Apache Polaris, Dremio Catalog, AWS Glue REST)

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
        "glue.region": "us-east-1",  # region_name was removed in 0.8.0
    }
)
```

### Local / Development (SQL Catalog on SQLite)

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

# Replace rows matching a filter (here, one day of orders)
from pyiceberg.expressions import EqualTo
table.overwrite(new_data, overwrite_filter=EqualTo("order_date", "2026-05-14"))
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

table = catalog.load_table("db.orders")

# Scan with PyIceberg (filters pushed down), register the result in DuckDB
conn = table.scan(
    row_filter="order_date >= '2026-01-01'"
).to_duckdb(table_name="orders")

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
for task in table.scan().plan_files():
    print(task.file.file_path, task.file.record_count)

# Or use the metadata tables (returns PyArrow)
files = table.inspect.files()
```

## PyIceberg and the Agentic Lakehouse

PyIceberg is the natural integration point for AI agents and LLM-driven data workflows:

- **MCP servers**: AI agent frameworks can use PyIceberg to inspect Iceberg table schemas, run queries, and return results to LLMs.
- **LangChain tools**: PyIceberg can be wrapped as a LangChain tool for natural-language-to-Iceberg-query workflows.
- **Data pipeline automation**: Python-based orchestration frameworks (Airflow, Prefect) use PyIceberg for catalog management without Spark dependencies.

For Python-first AI and data engineering teams, PyIceberg is the fastest path to Iceberg integration.
