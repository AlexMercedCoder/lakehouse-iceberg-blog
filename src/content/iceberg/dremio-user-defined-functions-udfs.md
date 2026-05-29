---
term: "Dremio User Defined Functions (UDFs)"
description: "Dremio User Defined Functions (UDFs) are custom calculations created in SQL that allow data teams to encapsulate reusable logic, standardizing business rules across the semantic layer."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-virtual-datasets-vds"
  - "dremio-spaces"
keywords:
  - dremio udfs
  - user defined functions dremio
  - custom SQL functions
  - reusable query logic
  - semantic layer functions
lastUpdated: 2026-05-29
---

## Dremio User Defined Functions (UDFs)

**Dremio User Defined Functions (UDFs)** are custom, reusable functions created using standard SQL statements. UDFs enable data engineers and architects to encapsulate complex calculations, mathematical formulas, string operations, or business rules into a single named function.

Once created, a UDF can be called inside SQL queries, Virtual Dataset (VDS) definitions, and business intelligence tool views just like built-in database functions.

## Types of User Defined Functions

Dremio supports two formats of UDFs:

### 1. Scalar Functions

Scalar functions accept zero or more input parameters and return a single value (such as a string, integer, or date). They are commonly used for calculating business metrics (for example, customer lifetime value) or standardizing formatting:

```sql
/* Creating a scalar UDF to calculate order discount amounts */
CREATE FUNCTION calculate_discount(amount DECIMAL(10,2), discount_rate DECIMAL(3,2))
RETURNS DECIMAL(10,2)
RETURN SELECT amount * discount_rate;
```

Once defined, the function can be called in the select list:

```sql
SELECT order_id, calculate_discount(amount, 0.15) AS discount_amount FROM analytics.orders;
```

### 2. Tabular Functions (Table Functions)

Tabular functions accept input parameters and return a set of rows as output. They allow teams to parameterize complex datasets dynamically. When called in a query, they are placed in the `FROM` clause:

```sql
/* Creating a table function to filter active orders by state */
CREATE FUNCTION get_orders_by_state(target_state VARCHAR)
RETURNS TABLE
RETURN SELECT * FROM analytics.orders o
       JOIN analytics.customers c ON o.customer_id = c.customer_id
       WHERE c.state = target_state;
```

The function is queried as a table source:

```sql
SELECT * FROM TABLE(get_orders_by_state('CA'));
```

## Benefits for the Semantic Layer

Creating custom UDFs provides three core advantages to analytical environments:

- **DRY Code Principles**: Avoids duplicating SQL calculations across multiple dashboards or VDS files. If a business formula changes, updating the UDF definition updates all downstream queries instantly.
- **Performance Inlining**: Dremio's query planner compiles UDFs directly into the query execution tree during planning, allowing them to benefit from compiler code generation and pushdown rules without execution penalties.
- **Abstraction for AI Agents**: LLMs and AI agents querying the semantic layer can call high-level UDFs (such as `calculate_net_revenue(order_id)`) instead of attempting to generate complex, multi-line join and aggregation math.
