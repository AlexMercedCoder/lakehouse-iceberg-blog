---
term: "Dremio Column-Level Masking"
description: "Dremio Column-Level Masking is a dynamic data security feature that obfuscates or replaces sensitive column values (such as PII) in query results based on the executing user's privileges."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-row-level-security-rls"
  - "dremio-virtual-datasets-vds"
keywords:
  - column masking
  - dremio column level masking
  - dynamic column masking
  - protect pii data
  - masking policy sql
lastUpdated: 2026-05-29
---

## Dremio Column-Level Masking

**Dremio Column-Level Masking** is a dynamic security capability that obfuscates, alters, or completely replaces sensitive column data (such as Personally Identifiable Information, PII) in query results based on the identity or role of the user running the query.

Rather than creating separate table copies with redacted columns, Column-Level Masking allows data teams to maintain a single source of truth. The query engine dynamically redacts values on the fly for unauthorized users while leaving raw data intact for users with appropriate security clearances.

## Common Masking Techniques

Dremio column masking policies can return different values depending on security rules:

- **Full Redaction**: Replaces values entirely with a fixed string (for example, replacing a Social Security Number with `XXX-XX-XXXX`) or returning `NULL`.
- **Partial Masking**: Exposes only a portion of the column data (such as showing only the last four digits of a credit card: `XXXX-XXXX-XXXX-4321` or redacting email domains).
- **Hash Obfuscation**: Replaces the value with a cryptographic hash (for example, `SHA256` value), preserving data formatting for testing while hiding the underlying value.

## SQL Implementation Example

Administrators configure dynamic column masking using SQL commands:

```sql
/* Create a column masking policy for email fields */
CREATE MASKING POLICY email_mask_policy
  AS (val VARCHAR)
  RETURN
    /* Members of HR see the actual email; others see a masked string */
    CASE
      WHEN is_member('HR-Team') THEN val
      ELSE 'XXXX@redacted.com'
    END;
```

After the policy is defined, it is bound to the target column:

```sql
/* Apply the policy to the email column in the customers table */
ALTER TABLE analytics.customers ADD COLUMN MASKING POLICY email_mask_policy ON (email);
```

When an unauthorized analyst queries `analytics.customers`, the output in the `email` column is dynamically replaced with `XXXX@redacted.com` during the projection phase of the query execution.

## Integration with Catalogs and BI Tools

Dynamic Column-Level Masking provides key advantages in unified lakehouse architectures:

_Centralized Compliance_: Masking policies are enforced at the query engine level. This ensures that whether data is accessed via Tableau, Power BI, python scripts, or command line interfaces, the sensitive data remains protected.
_Open REST Catalog Integration_: When Dremio is integrated with open catalogs like Apache Polaris or other managed catalogs, masking rules are combined with centralized Role-Based Access Control (RBAC) schemas to provide unified enterprise governance.
