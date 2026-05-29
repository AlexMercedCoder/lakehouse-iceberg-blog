---
term: "Dremio Arrow Flight SQL"
description: "Dremio Arrow Flight SQL is a high-performance database connectivity protocol based on Apache Arrow and gRPC, transferring columnar query results over the network without serialization overhead."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-sabot-engine"
  - "iceberg-arrow-flight"
  - "dremio-apache-iceberg"
keywords:
  - arrow flight sql
  - dremio flight sql
  - columnar protocol database
  - grpc data transfer
  - eliminate jdbc serialization tax
lastUpdated: 2026-05-29
---

## Dremio Arrow Flight SQL

**Dremio Arrow Flight SQL** is an open source database connectivity protocol built on Apache Arrow Flight and gRPC. It is designed to replace legacy transport protocols like Java Database Connectivity (JDBC) and Open Database Connectivity (ODBC) for bulk data retrieval.

While legacy protocols require query engines to convert memory structures into row-based formats before network transmission (and require clients to deserialize them back), Arrow Flight SQL transmits columnar data buffers directly. This eliminates the CPU-intensive serialization and deserialization (serde) tax.

## The Serialization Tax and the gRPC Framework

In traditional client-server database architectures:

```
Server Memory (Columnar) ──[Row Conversion]──> Network Wire (Row-Based) ──[Columnar Conversion]──> Client Memory (Columnar)
```

This double translation wastes significant CPU cycles when transferring millions of rows. Arrow Flight SQL streamlines this process:

```
Server Memory (Arrow Columnar) ──[Direct gRPC Stream]──> Client Memory (Arrow Columnar)
```

By streaming Arrow record batches directly over gRPC (HTTP/2-based RPC framework), the data remains in its native columnar layout from server to client.

## Core Features of Dremio's Implementation

Dremio natively implements an Arrow Flight SQL server interface, enabling clients to benefit from several key capabilities:

- **Parallel Streaming Endpoint Vending**: For large query results, the Flight server returns a set of ticket endpoints. The client can open multiple parallel connections to different executor nodes to fetch chunks of the query results simultaneously.
- **Standardized SQL Dialect Mapping**: Flight SQL defines a standard protocol for metadata requests (such as retrieving table schemas, column lists, and primary keys) using SQL command interfaces.
- **Cross-Language Support**: Dremio's Flight SQL server can be queried by clients written in Python (via PyArrow and `flight-sql-client` libraries), Go, Java, C++, and Rust.
- **BI Tool Direct Connections**: Modern BI tools (such as Tableau, Microsoft Power BI, and Apache Superset) leverage native Flight SQL connectors to load dashboard data up to 100 times faster than old ODBC drivers.

## Python Integration Example

Connecting a Python application to Dremio via Arrow Flight SQL allows analysts to load Iceberg table queries directly into pandas or Polars DataFrames in seconds. The following script illustrates connection initialization and data retrieval:

```python
from pyarrow import flight

/* Define connection credentials and Dremio Flight endpoint */
host = "sql.dremio.cloud:443"
token = "my_dremio_personal_access_token"

/* Initialize Flight client with authorization headers */
client = flight.FlightClient(f"grpc+tls://{host}")
options = flight.FlightCallOptions(headers=[(b"authorization", f"Bearer {token}".encode())])

/* Define SQL query against the semantic layer */
query = 'SELECT * FROM "Sales Space".analytics.orders'
descriptor = flight.FlightDescriptor.for_command(query.encode("utf-8"))

/* Retrieve Flight info and stream data blocks */
info = client.get_flight_info(descriptor, options)
reader = client.do_get(info.endpoints[0].ticket, options)
table = reader.read_all()

/* Convert Arrow table to local pandas DataFrame */
df = table.to_pandas()
print(df.head())
```
