---
term: "Dremio External Queries"
description: "Dremio External Queries are SQL pass-through commands that allow users to execute native database queries directly on underlying relational databases, bypassing Dremio planning logic."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-virtual-datasets-vds"
  - "dremio-physical-datasets-pds"
keywords:
  - dremio external queries
  - pass-through query sql
  - native sql execution
  - federated query bypass
  - database pushdown query
lastUpdated: 2026-05-29
---

## Dremio External Queries

**Dremio External Queries** are SQL syntax wrappers that enable users to execute native SQL queries directly on underlying relational database sources. Normally, Dremio compiles incoming SQL queries into an optimized logical execution plan, translates that plan into the source dialect, and pushes operations down dynamically.

However, some queries require vendor-specific SQL syntax, proprietary functions, or optimization hints that are not natively supported by standard Dremio SQL syntax. External Queries provide a pass-through mechanism to run queries directly on target sources (such as Snowflake, Oracle, PostgreSQL, and Teradata).

## SQL Syntax and Usage

External Queries utilize the `external_query` table function wrapper. The function takes the target database source name as its container and accepts a single query string argument:

```sql
SELECT * FROM table(source_name.external_query(query => 'SELECT * FROM raw_orders WHERE order_date > CURRENT_DATE()'))
```

During execution:

1.  **Parse and Ship**: Dremio's coordinator parses the outer `SELECT` statement and extracts the SQL query string argument inside `external_query`.
2.  **Remote Execution**: Dremio transmits the query string directly to the target source without planning or optimization.
3.  **Result Retrieval**: The target database executes the query using its own compute engine and streams the output records back to Dremio.
4.  **Dremio Processing**: Dremio converts the returned streams into Apache Arrow format, allowing the output to be filtered, aggregated, or joined with other datasets (such as Iceberg tables in S3) within the same query.

## Key Use Cases

External Queries are valuable in several database federation scenarios:

- **Vendor-Specific Analytics**: Running specialized analytic functions, statistical functions, or machine learning calls native to a database (such as Snowflake Cortex functions or Oracle analytical partitioning).
- **Database Optimizer Hints**: Injecting query optimization flags (for example, Oracle hints or SQL Server indexes) to force specific execution paths inside the source database.
- **Performance Troubleshooting**: Comparing pushdown performance by isolating queries inside the source engine to identify source network bottleneck issues.
- **Data Lake Joins**: Running an external query on a legacy database and joining the returned results with high-speed Iceberg tables in the lakehouse.

## Security Controls and Governance

Because pass-through queries bypass Dremio's query planner and compiler, managing security is essential:

- **Role-Based Execution Permission**: Administrators can restrict who can run external queries by configuring the `EXECUTE EXTERNAL QUERY` privilege on specific database sources.
- **Source Credential Isolation**: The query executes using the connection credentials configured for the Dremio data source, inheriting that user's source access controls.
- **Semantic Layer Integration**: Architects can wrap an external query inside a Dremio Virtual Dataset (VDS). This allows business analysts to query a clean VDS without knowing they are executing raw pass-through SQL against a database source.
