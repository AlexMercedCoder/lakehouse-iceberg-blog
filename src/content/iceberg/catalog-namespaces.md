---
term: "Catalog Namespaces"
description: "Hierarchical logical containers (similar to databases, schemas, or folders) used within an Iceberg catalog to organize tables, views, and security boundaries."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-rest-catalog-api"
keywords:
  - catalog namespaces
  - iceberg namespaces
  - multi level namespaces
  - database schemas
lastUpdated: 2026-05-29
---

## Catalog Namespaces

**Catalog Namespaces** are the hierarchical groupings used within an Apache Iceberg catalog to organize tables and views. In traditional databases, this hierarchy is typically fixed (for example, a catalog contains schemas, which contain tables). In Apache Iceberg, particularly within the REST Catalog specification, namespaces are flexible and can support multiple levels of nested folders.

### Multi-Level Nesting

Unlike legacy catalogs that restrict nesting to a single level (like a database name), Iceberg REST Catalogs (such as Apache Polaris or Project Nessie) allow namespaces to contain an arbitrary list of levels:

```
prod_catalog (Catalog)
  └── corporate (Level 1)
        └── finance (Level 2)
              └── budget_2026 (Table)
```

In SQL, these nested levels are referenced using dot notation: `prod_catalog.corporate.finance.budget_2026`.

### REST API Operations

The Iceberg REST Catalog specification defines standard API endpoints to manage namespaces. Client applications can create, update, or list namespaces via HTTP requests:

- `GET /v1/namespaces`: Lists top-level namespaces.
- `POST /v1/namespaces`: Creates a new namespace.
- `GET /v1/namespaces/{namespace}`: Retrieves detail properties for a specific namespace.
- `DELETE /v1/namespaces/{namespace}`: Deletes an empty namespace.

### Security and Property Boundaries

Namespaces serve as key administrative boundaries:

- **Property Inheritance**: You can set custom properties (such as default storage locations or write formats) on a namespace. Tables created within that namespace inherit these properties.
- **Security Access Control**: Role-Based Access Control (RBAC) models apply permissions at the namespace boundary. Granting a principal permission on a parent namespace automatically propagates that permission to all nested tables and sub-namespaces.
