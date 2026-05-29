---
term: "Dremio Row-Level Security (RLS)"
description: "Dremio Row-Level Security (RLS) is an access control mechanism that dynamically filters table rows returned by a query based on the executing user's identity or group memberships."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-column-level-masking"
  - "dremio-virtual-datasets-vds"
keywords:
  - row-level security rls
  - dremio rls
  - dynamic row filtering
  - data access control rls
  - row policy sql dremio
lastUpdated: 2026-05-29
---

## Dremio Row-Level Security (RLS)

**Dremio Row-Level Security (RLS)** is a security management feature that dynamically restricts the rows of data returned by a query based on the security context of the user executing the statement. Instead of creating and maintaining separate, filtered tables or database views for different user roles, administrators can define a single table or Virtual Dataset (VDS) and apply row filtering policies.

When a query is executed, Dremio automatically injects security filter predicates into the execution plan, ensuring users can view only the specific records they are authorized to access.

## How Row-Level Security Works

Dremio evaluates security rules at query runtime using built-in context functions:

1.  **User Context Evaluation**: Dremio identifies the executing user's username using `query_user()` and checks their associated security groups using `is_member()`.
2.  **Filter Rule Injection**: The query planner rewrites the logical execution plan, appending an implicit `WHERE` clause predicate defined in the row security policy.
3.  **Data Pruning**: Executor nodes apply the security filter during the initial scan phase, preventing unauthorized rows from ever loading into executor memory.

## SQL Implementation Example

Administrators can apply RLS policies directly using Dremio SQL commands:

```sql
/* Define a row filter policy based on user region */
CREATE ROW FILTER POLICY region_filter_policy
  AS (region_col VARCHAR)
  RETURN
    /* Administrators see all rows; others see only their region rows */
    is_member('Administrators') OR region_col = query_user_region();
```

After the policy is created, it is bound to the target physical or virtual table:

```sql
/* Apply the policy to the orders table */
ALTER TABLE analytics.orders ADD ROW FILTER region_filter_policy ON (state);
```

When a user in the 'US-West' sales group queries `analytics.orders`, Dremio executes the query as if they wrote:

```sql
SELECT * FROM analytics.orders WHERE state IN ('CA', 'OR', 'WA');
```

## Advantages for Federated Architectures

Implementing Row-Level Security within Dremio's semantic layer provides several architectural benefits:

- **Centralized Security Rules**: Security policies are defined once in Dremio and apply across all physical data sources, ensuring consistent access rules whether data resides in S3, ADLS, or PostgreSQL.
- **Decoupled BI Maintenance**: Custom filters do not need to be configured inside BI tools like Tableau or Power BI. The query engine enforces the security rules before data reaches the client tools.
- **Zero Performance Penalties**: Dremio's query compiler compiles security filters directly into vectorized execution fragments, enabling executors to apply filtering during data skipping loops.
