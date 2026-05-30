---
term: "Iceberg Apache Arrow Flight"
description: "Apache Arrow Flight provides a high-throughput, low-latency RPC protocol for transferring Apache Arrow columnar data from Iceberg tables to downstream consumers, enabling Python ML pipelines, BI tools, and AI agents to receive Iceberg query results at memory bandwidth speeds."
category: "Agentic & AI"
relatedTerms:
  - "iceberg-ai-readiness"
  - "pyiceberg"
  - "dremio-apache-iceberg"
  - "iceberg-parquet"
  - "iceberg-agentic-lakehouse"
keywords:
  - iceberg arrow flight
  - apache arrow flight iceberg
  - arrow flight sql iceberg
  - iceberg high performance data transfer
  - dremio arrow flight iceberg
lastUpdated: 2026-05-14
---

## Apache Arrow Flight and Apache Iceberg

**Apache Arrow Flight** is a high-performance RPC framework built on Apache Arrow's columnar in-memory format that enables extremely fast transfer of analytical data between systems. In the Iceberg ecosystem, Arrow Flight is the high-throughput data delivery protocol that connects Iceberg query engines to downstream consumers: Python ML pipelines, AI agents, BI tools, and data science notebooks.

The combination of Iceberg (governed, versioned data storage) + Arrow Flight (high-throughput columnar data delivery) is a foundational pattern for AI-ready lakehouses.

## Why Arrow Flight for Iceberg Data

Traditional data access patterns over Iceberg tables involve:

1. Query engine scans Iceberg (reads Parquet → deserializes → produces rows).
2. Results serialized to JDBC ResultSet or CSV.
3. Client deserializes JDBC/CSV rows.
4. Client re-serializes into Pandas DataFrame or NumPy arrays.

Each serialization/deserialization step wastes CPU and memory bandwidth. For ML pipelines consuming millions of rows, this overhead is significant.

Arrow Flight eliminates this:

1. Query engine scans Iceberg (reads Parquet → deserializes → produces Arrow batches).
2. Arrow batches transferred over Flight wire protocol (binary, no serialization overhead).
3. Client receives Arrow batches → zero-copy conversion to Pandas, NumPy, PyTorch tensors.

## Arrow Flight SQL

**Arrow Flight SQL** is an extension of Arrow Flight that adds SQL query semantics: the client sends SQL, the server executes it against Iceberg, and returns results as Arrow record batches:

```python
# Python: query Iceberg via Dremio Arrow Flight SQL
import pyarrow.flight as fl
import pandas as pd

# Connect to Dremio's Arrow Flight SQL endpoint
client = fl.connect("grpc+tls://my-dremio.example.com:32010")

# Authenticate
auth = fl.BasicAuth("dremio_user", "password")
token = client.authenticate_basic_token(auth.username, auth.password)
options = fl.FlightCallOptions(headers=[token])

# Execute query against Iceberg tables via Dremio
descriptor = fl.FlightDescriptor.for_command(
    b'{"query": "SELECT customer_id, total, order_date FROM analytics.orders WHERE order_date >= \'2026-01-01\'"}'
)

flight_info = client.get_flight_info(descriptor, options)
reader = client.do_get(flight_info.endpoints[0].ticket, options)

# Zero-copy to Pandas (Arrow in, Arrow out: no re-serialization)
df = reader.read_all().to_pandas()
```

## Arrow Flight Performance Characteristics

Arrow Flight is orders of magnitude faster than JDBC for large data transfers:

| Transfer Method | 100M rows / 10 columns | Overhead                        |
| --------------- | ---------------------- | ------------------------------- |
| JDBC            | ~300 seconds           | High (row-by-row serialization) |
| CSV export      | ~120 seconds           | Medium (text parsing)           |
| Arrow Flight    | ~8 seconds             | Near-zero (binary columnar)     |

For ML training pipelines that fetch millions of rows for feature engineering, Arrow Flight can reduce data loading time from minutes to seconds.

## PyIceberg + Arrow: The Native Integration

PyIceberg natively produces Arrow outputs: the integration is built in:

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog("my_catalog", **{...})
table = catalog.load_table("analytics.user_features")

# Scan directly to Arrow (no intermediate format)
arrow_table = table.scan(
    selected_fields=("user_id", "feature_a", "feature_b", "label"),
    row_filter="order_date >= '2026-01-01'"
).to_arrow()

# Zero-copy to Pandas
df = arrow_table.to_pandas()

# Zero-copy to PyTorch (via DLPack or NumPy bridge)
import torch
tensor = torch.from_numpy(df[["feature_a", "feature_b"]].values)
```

## Dremio Arrow Flight SQL

Dremio provides native Arrow Flight SQL endpoints for accessing Iceberg data:

- Supports all SQL analytics against Dremio Virtual Datasets (semantic layer views).
- Returns results as Arrow record batches with efficient columnar compression.
- Authentication via Dremio's token system.
- Used by Dremio's own BI connectors (Superset, Tableau via ADBC) and Python clients.

```python
# Query Dremio's semantic layer (virtual datasets over Iceberg)
# via Arrow Flight SQL: AI agent data retrieval
query = """
    SELECT region, revenue_month, net_revenue_usd
    FROM analytics.monthly_revenue
    WHERE revenue_month >= '2026-01-01'
    ORDER BY revenue_month, net_revenue_usd DESC
"""
df = flight_query(dremio_flight_client, query)
```

## Arrow Flight in AI Agent Pipelines

For AI agents that need fast access to Iceberg data:

```python
# AI agent tool: fetch Iceberg data via Arrow Flight
def get_iceberg_data(sql: str) -> pd.DataFrame:
    """
    Tool for AI agent: executes SQL against Iceberg via Arrow Flight.
    Returns results as DataFrame. Fast enough for real-time agent use.
    """
    flight_info = flight_client.get_flight_info(
        fl.FlightDescriptor.for_command(sql.encode())
    )
    reader = flight_client.do_get(flight_info.endpoints[0].ticket)
    return reader.read_all().to_pandas()

# Agent uses this tool to retrieve grounding data
result = get_iceberg_data(
    "SELECT SUM(total) as revenue FROM analytics.orders WHERE order_date >= '2026-05-01'"
)
# result.iloc[0].revenue → exact numerical value for LLM grounding
```

Arrow Flight is the bridge that makes Iceberg data retrieval fast enough for interactive AI agent workflows, where users expect answers in under 2 seconds, not minutes.
