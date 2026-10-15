---
term: "MCP and Apache Iceberg"
metaTitle: "Load Data into Iceberg with MCP: Servers, Tools, Steps"
description: "To load data into Iceberg with MCP, use a server with write tools: AWS's S3 Tables MCP server, Dremio's MCP server with DML enabled, or a PyIceberg server."
category: "Agentic & AI"
relatedTerms:
  - "iceberg-agentic-lakehouse"
  - "dremio-apache-iceberg"
  - "iceberg-rest-catalog"
  - "pyiceberg"
  - "iceberg-ai-readiness"
keywords:
  - mcp iceberg
  - model context protocol iceberg
  - ai agent iceberg
  - iceberg mcp server
  - llm iceberg integration
  - mcp load data into iceberg
  - s3 tables mcp server
lastUpdated: 2026-10-15
---

## Model Context Protocol (MCP) and Apache Iceberg

The **Model Context Protocol (MCP)** is an open standard (introduced by Anthropic and now hosted by the Linux Foundation's Agentic AI Foundation) that defines a uniform interface for connecting AI agents and LLMs to external tools and data sources. MCP servers expose capabilities as "tools" that LLMs can call natively, enabling AI agents to interact with APIs, databases, file systems, and data platforms without custom integration code for each model.

**Apache Iceberg + MCP** is a powerful combination: an MCP server for Iceberg exposes lakehouse catalog discovery, table schema inspection, and SQL query execution as LLM-callable tools. This gives any MCP-compatible AI agent or client (Claude, ChatGPT, Gemini, VS Code, Cursor, and others) direct access to governed Iceberg lakehouse data.

## How to Load Data into Iceberg with MCP

_Reviewed October 15, 2026 against the [AWS S3 Tables MCP server](https://github.com/awslabs/mcp/tree/main/src/s3-tables-mcp-server) and [Dremio MCP server](https://github.com/dremio/dremio-mcp) source and docs, and the [PyIceberg API docs](https://py.iceberg.apache.org/api/)._

MCP does not write data by itself. An agent loads data into Iceberg by calling a **write-capable tool** on an MCP server, and that server does the actual write through a query engine or an Iceberg library, then commits a new snapshot through the catalog. Most Iceberg MCP servers are read-only by default, so loading data is always an explicit opt-in. Three realistic paths exist today:

**1. Amazon S3 Tables: the AWS Labs S3 Tables MCP server.** The open source `awslabs.s3-tables-mcp-server` (run with `uvx awslabs.s3-tables-mcp-server@latest`) starts in read-only mode. Start it with the `--allow-write` flag and give its AWS credentials the matching IAM permissions, and it exposes write tools that use PyIceberg against the S3 Tables Iceberg REST endpoint:

- `create_table_bucket`, `create_namespace`, `create_table`: set up the destination.
- `import_csv_to_table` and `import_parquet_to_table`: load a CSV or Parquet file already in S3 into a table, creating the table from the file's schema if it does not exist.
- `append_rows_to_table`: append a list of rows (JSON objects) to an existing table.
- `query_database`: run read-only SQL to check the result.

**2. Any Iceberg catalog Dremio can write to: the Dremio MCP server.** Dremio's open source MCP server exposes a `RunSqlQuery` tool that only allows `SELECT` statements by default. Setting `allow_dml: true` in its config removes that check, so the agent can run `INSERT INTO ... SELECT`, `CREATE TABLE ... AS SELECT`, or `COPY INTO` against Iceberg tables, limited by the privileges of the personal access token the server uses. This path suits loading from sources Dremio already federates (databases, object storage files, other tables).

**3. Any Iceberg REST catalog: your own PyIceberg MCP server.** If no existing server fits, a small MCP server can expose an append tool that calls PyIceberg's `table.append()` with a PyArrow table (see the example server below). Keep the tool narrow: one target namespace, schema validation before the write, and a row or file-size limit.

For a longer walkthrough of path 1 and the governance questions around it, see [Conversational AI on Managed Iceberg: the S3 Tables MCP server](/posts/conversational-ai-managed-iceberg-s3-tables-mcp-server/).

Whichever path you use, follow the same steps:

1. **Scope credentials first.** Give the MCP server a service identity with write access only to the target namespace or tables, not your personal admin credentials.
2. **Enable writes explicitly** (`--allow-write`, `allow_dml: true`, or your own tool) and leave read-only servers in place for agents that only answer questions.
3. **Have the agent inspect the schema** (`describe_table`, `GetSchemaOfTable`, or a metadata tool) before it writes, so it maps source columns to the right types.
4. **Prefer bulk tools for real data.** Point the agent at a file in object storage (`import_parquet_to_table`, `COPY INTO`) instead of passing thousands of rows through the model's context.
5. **Validate with snapshot metadata.** Every successful load creates a new Iceberg snapshot. Check its summary (`added-records`, `added-data-files`) with PyIceberg's `table.inspect.snapshots()`, Spark's `SELECT * FROM db.tbl.snapshots`, or Dremio's `SELECT * FROM TABLE(table_snapshot('db.tbl'))`, and roll back to the previous snapshot if the load was wrong.

## Why MCP + Iceberg Matters

The traditional AI-to-data integration pattern requires custom code for every model and every data source. MCP standardizes this:

- **Any MCP-compatible LLM** can call Iceberg tools without model-specific integration code.
- **Tool definitions** (schemas, descriptions) guide the LLM on when and how to call each Iceberg capability.
- **Governed access**: The MCP server authenticates with the Iceberg catalog (via the REST API) and enforces access control before returning data.

## Core Iceberg MCP Tools

A well-designed Iceberg MCP server exposes tools such as:

### `list_namespaces`

Lists all available namespaces (databases/schemas) in the catalog. The LLM uses this to discover what data domains are available.

### `list_tables`

Lists all tables within a namespace. Returns table names and optional descriptions.

### `describe_table`

Returns the full schema of a table: column names, data types, descriptions, and partition spec. The LLM uses this to understand what data is available and how to query it correctly.

### `query_iceberg`

Executes a SQL query against the Iceberg catalog and returns results. This is the primary data access tool.

### `get_table_snapshots`

Returns the snapshot history for a table, enabling the LLM to implement time travel queries or understand when data was last updated.

### `get_recent_rows`

Returns a sample of recent rows from a table: useful for the LLM to understand data formats and values before writing a complex query.

## Example MCP Server (Python / PyIceberg)

```python
from mcp.server import Server
from mcp.types import Tool, TextContent
from pyiceberg.catalog import load_catalog
import pyarrow as pa
import json

app = Server("iceberg-mcp")
catalog = load_catalog("my_catalog", **{
    "type": "rest",
    "uri": "https://my-catalog.example.com",
    "credential": "client-id:client-secret",
})

@app.list_tools()
async def list_tools():
    return [
        Tool(
            name="list_tables",
            description="List all Iceberg tables in a namespace",
            inputSchema={
                "type": "object",
                "properties": {
                    "namespace": {"type": "string", "description": "Database/namespace name"}
                },
                "required": ["namespace"]
            }
        ),
        Tool(
            name="describe_table",
            description="Get the schema and properties of an Iceberg table",
            inputSchema={
                "type": "object",
                "properties": {
                    "namespace": {"type": "string"},
                    "table": {"type": "string"}
                },
                "required": ["namespace", "table"]
            }
        ),
        Tool(
            name="append_rows",
            description="Append rows (a list of JSON objects) to an existing Iceberg table in the staging namespace",
            inputSchema={
                "type": "object",
                "properties": {
                    "table": {"type": "string"},
                    "rows": {"type": "array", "items": {"type": "object"}, "maxItems": 1000}
                },
                "required": ["table", "rows"]
            }
        ),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "list_tables":
        tables = catalog.list_tables(arguments["namespace"])
        return [TextContent(type="text", text=json.dumps([str(t) for t in tables]))]

    elif name == "describe_table":
        table = catalog.load_table(f"{arguments['namespace']}.{arguments['table']}")
        schema_str = str(table.schema())
        return [TextContent(type="text", text=schema_str)]

    elif name == "append_rows":
        # Writes are limited to one namespace; the catalog credential should only allow this too
        table = catalog.load_table(f"staging.{arguments['table']}")
        data = pa.Table.from_pylist(arguments["rows"], schema=table.schema().as_arrow())
        table.append(data)  # commits a new snapshot
        snap = table.current_snapshot()
        return [TextContent(type="text", text=json.dumps({
            "snapshot_id": snap.snapshot_id,
            "summary": snap.summary.additional_properties,
        }))]
```

## MCP + Dremio: The Agentic Lakehouse Pattern

Dremio's Agentic Lakehouse is designed to serve as the data backend for AI agent workflows. Dremio's AI Semantic Layer (virtual datasets, column descriptions, pre-defined metrics) provides the **context** that MCP tools return to LLMs, making AI-generated queries more accurate and trustworthy.

A Dremio MCP server pattern:

1. LLM calls `list_namespaces` → Dremio returns available business domains.
2. LLM calls `describe_table` with a selected table → Dremio returns schema + semantic descriptions.
3. LLM generates SQL grounded in the semantic context.
4. LLM calls `query_iceberg` → Dremio executes against Iceberg, returns results.
5. LLM synthesizes a natural-language answer.

## MCP Clients and Compatibility

MCP is supported by:

- **Claude** (Anthropic): Claude Desktop, Claude Code, and the Claude API's MCP connector.
- **GitHub Copilot / VS Code** and **Cursor**: MCP server configuration in the editor.
- **LangChain / LangGraph**: MCP tool adapters.
- **Kiro** and other agentic IDEs: MCP server configuration.

The MCP ecosystem is rapidly expanding. Any new model or agent framework that adopts MCP can immediately leverage Iceberg MCP servers, making Iceberg data available to the entire AI tooling ecosystem without per-model integration work.

## Security Considerations

Iceberg MCP servers should:

- Authenticate with the catalog using service account credentials, not user credentials.
- Scope catalog access to only the namespaces/tables the AI agent should see.
- Use the catalog's credential vending to get object-storage-scoped access for data reads.
- Keep write tools disabled unless a workflow needs them, and log every write with the snapshot ID it produced.
- Log all tool calls for audit.
- Limit query complexity (timeout, row limits) to prevent resource abuse.
