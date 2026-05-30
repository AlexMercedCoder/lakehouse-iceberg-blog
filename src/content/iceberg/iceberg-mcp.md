---
term: "MCP and Apache Iceberg"
description: "Model Context Protocol (MCP) servers for Apache Iceberg enable AI agents and LLMs to discover, query, and reason over Iceberg lakehouse data as native tool calls, making the Iceberg catalog and table data a first-class resource in AI-driven analytics workflows."
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
lastUpdated: 2026-05-14
---

## Model Context Protocol (MCP) and Apache Iceberg

The **Model Context Protocol (MCP)** is an open standard (originally introduced by Anthropic) that defines a uniform interface for connecting AI agents and LLMs to external tools and data sources. MCP servers expose capabilities as "tools" that LLMs can call natively, enabling AI agents to interact with APIs, databases, file systems, and data platforms without custom integration code for each model.

**Apache Iceberg + MCP** is a powerful combination: an MCP server for Iceberg exposes lakehouse catalog discovery, table schema inspection, and SQL query execution as LLM-callable tools. This gives any MCP-compatible AI agent (Claude, GPT-4o, Gemini, Llama, and others) direct access to governed Iceberg lakehouse data.

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

- **Claude** (Anthropic): Native MCP support in the Claude API.
- **GitHub Copilot / VS Code**: MCP extension support.
- **LangChain / LangGraph**: MCP tool wrapping.
- **AutoGen (Microsoft)**: MCP tool integration.
- **Continue.dev**: Local AI assistant with MCP support.

The MCP ecosystem is rapidly expanding. Any new model or agent framework that adopts MCP can immediately leverage Iceberg MCP servers, making Iceberg data available to the entire AI tooling ecosystem without per-model integration work.

## Security Considerations

Iceberg MCP servers should:

- Authenticate with the catalog using service account credentials, not user credentials.
- Scope catalog access to only the namespaces/tables the AI agent should see.
- Use the catalog's credential vending to get object-storage-scoped access for data reads.
- Log all tool calls for audit.
- Limit query complexity (timeout, row limits) to prevent resource abuse.
