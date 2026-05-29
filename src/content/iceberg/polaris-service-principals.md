---
term: "Polaris Service Principals"
description: "Programmatic identities created within Apache Polaris to authenticate query engines, ETL pipelines, and applications using OAuth2 credentials."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "apache-polaris-catalog"
  - "polaris-rbac-model"
  - "rest-catalog-oauth2-token-flow"
keywords:
  - polaris service principals
  - service principals
  - polaris credentials
  - polaris client id
lastUpdated: 2026-05-29
---

## Polaris Service Principals

**Polaris Service Principals** are the programmatic identities managed inside Apache Polaris. Because catalogs are accessed by machines (such as query engines, automated ETL scripts, and BI tools) rather than humans entering credentials on a web page, Polaris uses service principals to control API access. Each service principal represents a unique identity that can be authenticated and authorized.

### Authentication Credentials

When a service principal is created, Polaris generates a client ID and a client secret:

- **Client ID**: A unique public identifier for the service principal.
- **Client Secret**: A secure cryptographic string that must be kept secret.

Query engines use this pair of values to authenticate via the standard OAuth2 token flow. Once authenticated, the engine receives a temporary token to run catalog API calls, such as loading tables or updating schemas.

### Association with Roles

To prevent unauthorized access, a new service principal has no permissions by default. It must be explicitly mapped to a principal role:

```
Service Principal (e.g. Spark_Ingest_Principal)
     │
     └── Granted to ──> Principal Role (e.g. Ingestion_Writer_Role)
```

This mapping allows the service principal to inherit the catalog permissions assigned to the role, such as writing to specific tables or reading specific catalog namespaces.

### Operational Best Practices

When managing programmatic identities, security teams follow several operational rules:

- **Principle of Least Privilege**: Create dedicated service principals for distinct workloads (e.g. one for Spark writes and one for Trino reads) rather than sharing a single administrative principal.
- **Credential Rotation**: Periodically regenerate client secrets using the Polaris management API or console to reduce the risk of compromise.
- **Granular Auditing**: Name service principals descriptively to ensure catalog logs clearly show which service made specific table updates.
