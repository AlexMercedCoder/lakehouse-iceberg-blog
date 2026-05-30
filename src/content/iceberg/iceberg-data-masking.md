---
term: "Iceberg Data Masking"
description: "Data masking in Apache Iceberg protects sensitive column values from unauthorized consumers by applying masking functions at the view or virtual dataset layer, ensuring PII and confidential data are obscured without modifying underlying Iceberg table data."
category: "Governance & Security"
relatedTerms:
  - "iceberg-access-control"
  - "iceberg-views"
  - "apache-polaris-catalog"
  - "dremio-apache-iceberg"
  - "iceberg-multi-tenant"
keywords:
  - iceberg data masking
  - iceberg column masking
  - iceberg pii protection
  - iceberg sensitive data
  - iceberg column security
lastUpdated: 2026-05-14
---

## Iceberg Data Masking

**Data masking** in Apache Iceberg is the practice of protecting sensitive column values: personally identifiable information (PII), financial data, health records, from unauthorized consumers by replacing actual values with masked, obfuscated, or anonymized versions. Unlike row-level security (which hides entire rows), column masking allows consumers to see a record exists and access non-sensitive fields while sensitive columns show protected values.

Iceberg itself does not implement masking at the storage level: data files always contain the real values. Masking is enforced at the **access layer**: the view, virtual dataset, or query engine policy layer.

## Why Masking at the View Layer (Not Storage)

Implementing masking at the storage layer (encrypting data at rest) makes sense for at-rest protection but creates operational problems:

- Different consumers need different masking (analyst sees last 4 digits, customer service sees full number, finance sees encrypted hash).
- Masking requirements change over time without needing to rewrite data.
- Authorized consumers (auditors, PII data owners) need unmasked access to the same table.

The view-based approach:

- Stores real data in Iceberg (encrypted at rest by cloud provider).
- Exposes different views with different masking for different consumer roles.
- Authorized principals access the base table directly; others only access masked views.

## Masking Patterns

### Partial Masking (Show Last N Characters)

```sql
-- Credit card: show last 4 digits only
CREATE VIEW analytics.orders_masked AS
SELECT
    order_id,
    customer_id,
    'XXXX-XXXX-XXXX-' || RIGHT(cc_number, 4) AS cc_number,
    total,
    order_date
FROM analytics.orders;
```

### Hash Masking (Pseudonymization)

```sql
-- Replace PII with consistent hash (same person always maps to same hash)
CREATE VIEW analytics.orders_pseudonymized AS
SELECT
    order_id,
    MD5(CAST(customer_id AS VARCHAR)) AS customer_hash,  -- pseudonymized
    total,
    order_date,
    region
FROM analytics.orders;
-- customer_hash is consistent: ML models can still learn customer behavior patterns
-- but the hash cannot be reversed to identify the customer
```

### Null Masking (Complete Suppression)

```sql
-- Hide column entirely for unauthorized consumers
CREATE VIEW analytics.orders_suppressed AS
SELECT
    order_id,
    NULL AS email,         -- completely suppressed
    NULL AS phone,         -- completely suppressed
    total,
    order_date
FROM analytics.orders;
```

### Conditional Masking (Role-Based)

```sql
-- Different masking based on a session variable or context
CREATE VIEW analytics.orders_conditional AS
SELECT
    order_id,
    CASE
        WHEN current_role() IN ('pii_authorized', 'admin') THEN email
        ELSE CONCAT(SUBSTRING(email, 1, 3), '***@***.***')
    END AS email,
    total,
    order_date
FROM analytics.orders;
```

## Access Control for Masking

The masking view is enforced by restricting direct table access:

```
RBAC:
  General analysts:
    ✅ TABLE_READ_DATA on analytics.orders_masked
    ❌ TABLE_READ_DATA on analytics.orders (base table)

  PII authorized team:
    ✅ TABLE_READ_DATA on analytics.orders (base table)
    ✅ TABLE_READ_DATA on analytics.orders_masked

  Audit team:
    ✅ TABLE_READ_DATA on analytics.orders (full access for audits)
```

## Dremio Column Masking

Dremio provides policy-based column masking at the platform level:

- **Column masking policies**: Define masking rules centrally that apply regardless of how the virtual dataset is accessed.
- **Role-based policy assignment**: Different masking levels for different roles.
- **Automatic policy inheritance**: Masking applied in derived datasets (views of views).

In Dremio, an admin can define:

```
Column: analytics.orders.email
Masking policy for role "general_analyst":
  SHOW CONCAT(SUBSTR(email, 1, 2), '***@***.com')
Masking policy for role "customer_support":
  SHOW FULL value
Masking policy for role "pii_admin":
  SHOW FULL value
```

No matter which virtual dataset references `analytics.orders.email`, the column masking policy is enforced for the consumer's role, providing centralized, consistent masking governance.

## Masking and GDPR Compliance

Data masking directly supports GDPR's privacy-by-design principle:

- **Data minimization**: Analysts see only the PII they need for their specific task.
- **Purpose limitation**: Masking enforces that data can only be used in privacy-safe forms for analytics.
- **Right to erasure**: Masking is not a substitute for deletion, when a user requests erasure, delete from the base Iceberg table. Masked views automatically reflect the deletion.

For GDPR-compliant architectures, use masking for routine analytics access and row-level deletes for erasure requests.
