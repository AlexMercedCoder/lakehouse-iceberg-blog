---
term: "Iceberg AI Semantic Layer"
description: "The AI Semantic Layer on Apache Iceberg translates raw Iceberg table data into AI-understandable business context through virtual datasets, column descriptions, pre-defined metrics, and business glossaries, enabling AI agents to generate accurate, governed SQL without raw schema knowledge."
category: "Agentic & AI"
relatedTerms:
  - "iceberg-agentic-lakehouse"
  - "iceberg-views"
  - "dremio-apache-iceberg"
  - "iceberg-mcp"
  - "iceberg-llm-grounding"
keywords:
  - iceberg semantic layer
  - ai semantic layer iceberg
  - iceberg business context ai
  - iceberg virtual datasets
  - dremio semantic layer iceberg
lastUpdated: 2026-05-14
---

## The AI Semantic Layer on Apache Iceberg

The **AI Semantic Layer** is a business context and metadata layer that sits between raw Iceberg table data and AI agents (or human analysts), translating technical schemas into semantically meaningful, AI-consumable data descriptions. It solves the fundamental problem of AI data access: raw column names like `rev`, `cust_id`, `ord_dt` mean nothing to an LLM without context.

The semantic layer makes Iceberg data AI-ready by encoding:

- **What each dataset is**: Table descriptions that explain the business domain.
- **What each column means**: Column-level documentation in plain language.
- **How metrics are defined**: Pre-defined, validated business calculations (revenue, churn rate, DAU).
- **What the relationships are**: Foreign keys, hierarchies, and dimension/fact relationships.

## The Gap Between Raw Iceberg Tables and AI

A raw Iceberg schema might look like:

```sql
CREATE TABLE fact_orders (
    ord_id BIGINT,
    cst_id BIGINT,
    rev DOUBLE,
    ord_dt DATE,
    sts INT,
    rgn VARCHAR(10)
);
```

An AI agent encountering this table has no idea:

- That `rev` means "net revenue in USD after discounts and returns."
- That `sts = 3` means "shipped."
- That `rgn` uses codes like "AMER", "EMEA", "APAC."
- That `cst_id` joins to `dim_customers.cust_id`.
- That "monthly revenue" is `SUM(rev)` only where `sts IN (3, 4, 5)`.

Without semantic context, AI agents generate incorrect SQL, misinterpret data, or hallucinate values.

## The Semantic Layer Components

### Virtual Datasets / Views

Curated SQL views that expose clean, well-named, business-aligned data:

```sql
-- Virtual dataset: clean, semantic interface over raw table
CREATE VIEW analytics.monthly_revenue AS
SELECT
    date_trunc('month', ord_dt) AS revenue_month,
    rgn AS region,
    SUM(rev) AS net_revenue_usd,  -- clear naming
    COUNT(DISTINCT cst_id) AS unique_customers
FROM fact_orders
WHERE sts IN (3, 4, 5)  -- only completed orders (shipped, delivered, closed)
GROUP BY 1, 2;
```

The AI agent queries `analytics.monthly_revenue` instead of `fact_orders`. The complexity is hidden; the semantics are clear.

### Column Descriptions

Column-level documentation that LLMs read to understand data meaning:

```sql
-- Dremio: add column-level wiki documentation to a virtual dataset
-- (Also expressible via table properties or catalog annotations)
COMMENT ON COLUMN analytics.monthly_revenue.net_revenue_usd IS
    'Total net revenue in US dollars. Excludes refunded orders (sts=6).
     Includes partial refunds at the line-item level.
     Source: fact_orders.rev after status filter.';
```

### Pre-Defined Business Metrics

Metrics that encode business logic in reusable form:

```python
# Semantic layer: define reusable metrics
metrics = {
    "monthly_revenue": {
        "description": "Net revenue in USD for completed orders",
        "sql": "SUM(CASE WHEN sts IN (3,4,5) THEN rev ELSE 0 END)",
        "table": "fact_orders",
        "dimensions": ["revenue_month", "region", "product_category"]
    },
    "customer_churn_rate": {
        "description": "% of active customers last month who did not purchase this month",
        "sql": "1 - (COUNT(DISTINCT active_this_month) / COUNT(DISTINCT active_last_month))",
        "table": "customer_activity_monthly"
    }
}
```

### Business Glossary

Shared vocabulary that standardizes business term definitions across the organization and makes them available to AI agents:

```
- "Customer": A party who has placed at least one completed order. Bots and test accounts excluded.
- "Revenue": Net revenue after discounts, returns, and taxes. Measured in USD at order close date.
- "Active customer": A customer with at least one completed order in the trailing 90 days.
- "Region": One of AMER, EMEA, APAC based on customer billing address country.
```

## Dremio's AI Semantic Layer Implementation

Dremio's Agentic Lakehouse platform provides a first-class, production-grade AI Semantic Layer:

- **Virtual Datasets**: Saved views over Iceberg tables with business-friendly schemas.
- **Wikis**: Markdown documentation at the dataset and column level, readable by AI agents.
- **Labels and tags**: Categorical tagging for discovery (e.g., "PII", "Finance", "Certified").
- **Reflections**: Pre-computed materializations of virtual datasets for sub-second AI agent queries.
- **Native AI Agent**: Uses the semantic layer to answer business questions in natural language.

Dremio's AI Agent workflow:

1. User asks: "What regions are growing fastest this quarter?"
2. AI Agent queries the semantic catalog for relevant datasets.
3. Finds `analytics.monthly_revenue` with wiki description.
4. Reads column descriptions to understand `region` and `net_revenue_usd`.
5. Generates correct SQL using the semantic context.
6. Executes against Iceberg via Dremio Intelligent Query Engine.
7. Returns a grounded, business-correct answer.

## Building a Semantic Layer Without Dremio

For teams using open-source tools, a lightweight semantic layer can be built with:

- **Views** in Trino or Spark for clean dataset interfaces.
- **Table properties** in Iceberg for column-level descriptions.
- **dbt** for metric definitions, documentation, and test coverage.
- **MCP tools** that expose the metric catalog to LLMs.

The Dremio approach provides the most integrated, production-ready implementation: but the fundamental semantic layer pattern works across any Iceberg-compatible stack.
