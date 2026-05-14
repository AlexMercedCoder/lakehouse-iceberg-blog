---
term: "LangChain and Apache Iceberg"
description: "LangChain agents can query Apache Iceberg lakehouses using SQL tools and Arrow Flight connections, enabling natural language analytics over governed Iceberg data through LangChain's tool-calling framework integrated with Dremio, DuckDB, or Trino as the SQL execution layer."
category: "Agentic & AI"
relatedTerms:
  - "iceberg-mcp"
  - "iceberg-llm-grounding"
  - "iceberg-agentic-lakehouse"
  - "iceberg-ai-semantic-layer"
  - "dremio-apache-iceberg"
keywords:
  - langchain iceberg
  - langchain apache iceberg
  - langchain sql iceberg
  - langchain data agent iceberg
  - langchain dremio iceberg
lastUpdated: 2026-05-14
---

## LangChain and Apache Iceberg

**LangChain** is the most widely used open-source framework for building LLM-powered applications and AI agents. Its tool-calling, chain, and agent abstractions have made it the standard integration layer between LLMs and data systems. Apache Iceberg integrates with LangChain through **SQL tool connectors**, enabling LangChain agents to discover, query, and reason over governed lakehouse data.

## The Integration Architecture

LangChain agents don't access Iceberg directly — they call **SQL tools** that connect to query engines that execute SQL against Iceberg tables:

```
LangChain Agent (LLM reasoning)
  → SQL Tool (executes SQL)
    → Query Engine (Dremio / Trino / DuckDB / Spark SQL)
      → Apache Iceberg Tables (Parquet files in S3/GCS/ADLS)
```

The agent generates SQL based on schema context, the SQL tool executes it, results are returned to the agent for reasoning and response synthesis.

## LangChain SQLDatabase Tool with Dremio

The most governed and AI-ready approach: LangChain connects to Dremio's SQL endpoint, which provides access to the AI Semantic Layer over Iceberg tables.

```python
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent
from langchain_anthropic import ChatAnthropic
from sqlalchemy import create_engine

# Connect to Dremio (Arrow Flight SQL or JDBC)
dremio_engine = create_engine(
    "dremio+flight://my-dremio.example.com:32010",
    connect_args={
        "username": "dremio_user",
        "password": "dremio_password",
        "tls_enabled": True,
    }
)

# LangChain SQLDatabase wrapper (auto-discovers tables and schemas)
db = SQLDatabase(
    engine=dremio_engine,
    include_tables=["analytics.orders", "analytics.customers", "analytics.monthly_revenue"]
)

# LLM
llm = ChatAnthropic(model="claude-opus-4-5", temperature=0)

# SQL agent: auto-generates SQL from natural language
agent = create_sql_agent(
    llm=llm,
    db=db,
    verbose=True,
    agent_type="openai-tools",
)

# Natural language query
result = agent.invoke({
    "input": "Which customers have spent more than $10,000 this quarter and are from the AMER region?"
})
print(result["output"])
```

## Custom LangChain Tools for Iceberg

For more control, define custom LangChain tools that directly interact with Iceberg:

```python
from langchain.tools import tool
from pyiceberg.catalog import load_catalog
import duckdb

catalog = load_catalog("my_catalog", **{
    "type": "rest",
    "uri": "https://my-polaris.example.com",
    "credential": "client-id:client-secret",
})

@tool
def query_iceberg_orders(sql: str) -> str:
    """
    Execute a SQL SELECT query against the Iceberg orders table.

    Table schema:
    - order_id (BIGINT): Unique order identifier
    - customer_id (BIGINT): Customer who placed the order
    - total (DOUBLE): Order total in USD
    - order_date (DATE): Date order was placed
    - region (STRING): Geographic region (AMER, EMEA, APAC)
    - status (STRING): Order status (PENDING, SHIPPED, DELIVERED, CANCELLED)

    Only SELECT queries are allowed. Max 1000 rows returned.
    """
    table = catalog.load_table("analytics.orders")
    arrow_table = table.scan().to_arrow()

    conn = duckdb.connect()
    conn.register("orders", arrow_table)

    result = conn.execute(sql + " LIMIT 1000").fetchdf()
    return result.to_markdown(index=False)

@tool
def get_table_schema(table_name: str) -> str:
    """
    Get the schema of an Iceberg table including column names, types, and descriptions.
    Available tables: analytics.orders, analytics.customers, analytics.products
    """
    table = catalog.load_table(table_name)
    schema_info = []
    for field in table.schema().fields:
        schema_info.append(f"- {field.name} ({field.field_type}): {field.doc or 'No description'}")
    return "\n".join(schema_info)

@tool
def list_iceberg_tables() -> str:
    """List all available Iceberg tables in the analytics namespace."""
    tables = catalog.list_tables("analytics")
    return "\n".join([str(t) for t in tables])
```

Using these tools in a LangChain agent:

```python
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate

tools = [query_iceberg_orders, get_table_schema, list_iceberg_tables]

prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a data analytics assistant with access to an Apache Iceberg
     lakehouse. Use the available tools to answer business questions with precise,
     data-backed answers. Always cite the data you used to support your conclusions."""),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}")
])

agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

response = executor.invoke({
    "input": "What was our revenue trend by region over the last 6 months? Are there any regions showing concerning declines?"
})
```

## LangChain + Iceberg: RAG for Tabular Data

LangChain's document loader pattern can be adapted for Iceberg:

```python
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter

def load_iceberg_as_documents(table, selected_fields, filter_expr=None):
    """Load Iceberg table rows as LangChain documents for RAG."""
    scan = table.scan(selected_fields=selected_fields)
    if filter_expr:
        scan = scan.filter(filter_expr)

    df = scan.to_arrow().to_pandas()

    documents = []
    for _, row in df.iterrows():
        content = " | ".join([f"{col}: {val}" for col, val in row.items()])
        documents.append(Document(
            page_content=content,
            metadata={"source": "iceberg", "table": table.name()}
        ))

    return documents
```

## Dremio + LangChain: The Production Stack

The production-grade LangChain + Iceberg stack uses Dremio as the SQL layer:

```
LangChain Agent
  → Dremio SQLDatabase tool (or Arrow Flight custom tool)
    → Dremio AI Semantic Layer (business context, metric definitions)
      → Dremio Intelligent Query Engine
        → Apache Iceberg tables (via Apache Polaris catalog)
```

Dremio's semantic layer enriches every LangChain SQL call with business context — column descriptions, metric definitions, and relationships — reducing the need for extensive prompt engineering to convey schema context.
