---
term: "Iceberg Natural Language Analytics"
description: "Natural language analytics on Apache Iceberg enables business users and AI agents to ask questions in plain English and receive data-backed answers, combining LLM text-to-SQL generation with Iceberg's governed data store and a semantic layer to ensure accurate, contextual responses."
category: "Agentic & AI"
relatedTerms:
  - "iceberg-ai-semantic-layer"
  - "iceberg-llm-grounding"
  - "iceberg-mcp"
  - "langchain-iceberg"
  - "dremio-apache-iceberg"
keywords:
  - iceberg natural language analytics
  - nl2sql iceberg
  - iceberg text to sql
  - natural language iceberg
  - conversational analytics iceberg
lastUpdated: 2026-05-14
---

## Natural Language Analytics on Apache Iceberg

**Natural language analytics** (NLA) is the ability to query a data lakehouse by asking questions in plain English: "What was our fastest-growing product category last quarter?", and receiving data-backed, accurate answers without writing SQL. Apache Iceberg is the ideal storage foundation for NLA because its governed, versioned, well-documented tables provide the authoritative data that LLMs need to generate trustworthy answers.

## The Three-Layer NLA Architecture

Every production natural language analytics system over Iceberg has three layers:

```
1. Semantic Layer → business context (what does each table/column mean?)
2. LLM Layer     → natural language → SQL translation (grounded in semantic context)
3. Execution Layer → SQL → Iceberg data → results
```

Without the semantic layer, the LLM generates SQL against raw schemas it doesn't understand, producing incorrect or hallucinated results. Without the execution layer, there's no connection to actual data. Without the LLM layer, it's not natural language.

## Layer 1: The Semantic Layer

The semantic layer is the most important component for NLA accuracy. It translates raw Iceberg schemas into AI-understandable business context:

```python
# Semantic catalog: register tables with business context
semantic_catalog = {
    "analytics.orders": {
        "description": "Canonical order table. Every order placed by customers since 2020-01-01.",
        "columns": {
            "order_id": "Unique identifier for each order. Never null.",
            "customer_id": "Foreign key to analytics.customers. Links order to customer profile.",
            "total": "Net order revenue in USD after discounts. Excludes tax and shipping.",
            "order_date": "Calendar date the order was placed (not shipped or delivered).",
            "status": "Order lifecycle status. Values: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED.",
            "region": "Geographic sales region. Values: AMER (Americas), EMEA (Europe/Middle East/Africa), APAC (Asia Pacific)."
        },
        "metrics": {
            "revenue": "SUM(total) WHERE status IN ('SHIPPED', 'DELIVERED')",
            "order_count": "COUNT(*) WHERE status != 'CANCELLED'",
            "aov": "SUM(total) / COUNT(*) WHERE status IN ('SHIPPED', 'DELIVERED')"
        },
        "business_rules": [
            "Only SHIPPED and DELIVERED orders count as revenue",
            "CANCELLED orders are excluded from all revenue metrics",
            "order_date is in UTC timezone"
        ]
    }
}
```

## Layer 2: LLM Text-to-SQL (NL2SQL)

The LLM generates SQL from natural language, grounded in semantic context:

```python
import anthropic

client = anthropic.Anthropic()

def natural_language_to_sql(question: str, table_context: dict) -> str:
    """Convert natural language question to SQL using LLM + semantic context."""

    context = f"""
    Table: analytics.orders
    Description: {table_context['description']}

    Columns:
    {chr(10).join([f"- {col}: {desc}" for col, desc in table_context['columns'].items()])}

    Pre-defined metrics:
    {chr(10).join([f"- {m}: {d}" for m, d in table_context['metrics'].items()])}

    Business rules:
    {chr(10).join([f"- {r}" for r in table_context['business_rules']])}
    """

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        system=f"""You are a SQL expert. Generate a single, correct SQL SELECT query to answer
        the user's question using the following table context. Return ONLY the SQL query, no explanation.

        {context}""",
        messages=[{"role": "user", "content": f"Question: {question}"}]
    )

    return response.content[0].text.strip()
```

## Layer 3: SQL Execution Against Iceberg

Execute the generated SQL against Iceberg:

```python
import duckdb
from pyiceberg.catalog import load_catalog

def execute_on_iceberg(sql: str) -> pd.DataFrame:
    """Execute SQL against Iceberg tables, return results."""
    catalog = load_catalog("my_catalog", **{...})
    table = catalog.load_table("analytics.orders")

    arrow = table.scan().to_arrow()
    conn = duckdb.connect()
    conn.register("orders", arrow)

    return conn.execute(sql).fetchdf()
```

## Full NLA Pipeline

```python
def answer_business_question(question: str) -> str:
    """
    End-to-end natural language analytics over Iceberg.
    1. Get semantic context
    2. Generate SQL from question
    3. Execute against Iceberg
    4. Synthesize natural language answer
    """
    # 1. Get semantic context for relevant tables
    context = semantic_catalog["analytics.orders"]

    # 2. Generate SQL
    sql = natural_language_to_sql(question, context)
    print(f"Generated SQL: {sql}")

    # 3. Execute against Iceberg
    results = execute_on_iceberg(sql)

    # 4. Synthesize answer
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        system="You are a business analyst. Synthesize the data into a clear, concise answer.",
        messages=[{
            "role": "user",
            "content": f"""
            Question: {question}

            Data:
            {results.to_markdown()}

            Provide a clear business answer.
            """
        }]
    )

    return response.content[0].text

# Example
answer = answer_business_question(
    "Which regions showed revenue growth above 20% this quarter compared to last?"
)
print(answer)
```

## Dremio's AI Agent: Production NLA on Iceberg

Dremio's **AI Agent** is the production-ready implementation of NLA over Iceberg:

1. **Semantic Layer**: Dremio Virtual Datasets with Wiki documentation and column descriptions provide the business context.
2. **NL2SQL**: Dremio's AI Agent uses the semantic layer to generate highly accurate SQL.
3. **Execution**: Dremio's Intelligent Query Engine executes against Iceberg via Apache Polaris.
4. **Governance**: All queries are authenticated, authorized, and audit-logged.
5. **MCP Integration**: AI Agents in Claude, ChatGPT, or custom applications connect via MCP.

The Dremio approach eliminates the need to build and maintain a custom semantic catalog: the Dremio platform manages the business context layer that makes NLA accurate.

## Common NLA Failure Modes (and How Iceberg + Semantic Layer Fixes Them)

| Failure Mode            | Cause                                                              | Fix                                                     |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Wrong numerical results | LLM uses wrong filter (e.g., includes cancelled orders in revenue) | Business rules in semantic layer                        |
| Column name confusion   | `rev` vs `revenue`: LLM guesses wrong                             | Clear column descriptions                               |
| Join errors             | LLM doesn't know `customer_id` joins to `customers.id`             | Relationship declarations in semantic catalog           |
| Stale data              | LLM answers from training data, not live tables                    | Iceberg query execution grounds answers in current data |
| Hallucinated metrics    | LLM invents numbers                                                | Iceberg query execution with `LIMIT` enforcement        |
