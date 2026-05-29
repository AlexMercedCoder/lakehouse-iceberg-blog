---
term: "Polaris RBAC Model"
description: "The Role-Based Access Control framework in Apache Polaris that secures catalog metadata resources by mapping service principals to resource-specific privileges."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "apache-polaris-catalog"
  - "rest-catalog-credential-vending"
keywords:
  - polaris rbac
  - polaris roles
  - principal roles
  - catalog roles
  - access control polaris
lastUpdated: 2026-05-29
---

## Polaris RBAC Model

The **Polaris RBAC Model** is the security architecture used by Apache Polaris to govern metadata access across multi-engine lakehouses. Rather than relying on simple storage-level access controls or engine-specific permission models, Polaris provides a unified Role-Based Access Control (RBAC) model. This design allows administrators to define fine-grained permissions once and enforce them consistently across all query engines connecting to the catalog.

### Core Concepts of the Model

The RBAC system in Polaris is built on three major entities:

1.  **Service Principals**: These represent programmatic users or engines (e.g. Dremio, Spark, or a specific ETL service) that connect to the catalog API.
2.  **Principal Roles**: These are logical collections of permissions assigned directly to Service Principals. For example, you can create a principal role named `data_engineer_role` and assign it to the Spark ingestion principal.
3.  **Catalog Roles**: These roles define specific privileges on metadata resources within a catalog, such as catalog namespaces, tables, or views. For example, a catalog role named `finance_reader` might grant `TABLE_READ` privilege on the `finance_db` namespace.

### The Role Mapping Model

To grant access, administrators map Catalog Roles to Principal Roles. The principal role acts as a bridge:

```
Service Principal (Identity)
    └── Granted to ──> Principal Role
                        └── Mapped to ──> Catalog Role (Resource Privileges)
```

This decoupling allows you to manage user identities and data access rules independently. If a table moves to a different catalog, you only update the catalog role mapping without modifying the underlying service principals.

### Available Privileges

Polaris allows granular controls on different levels of the namespace hierarchy:

- **CATALOG_MANAGE**: Administrative privilege allowing creation or deletion of catalogs and roles.
- **NAMESPACE_CREATE / NAMESPACE_READ**: Restricts who can browse database hierarchies or create new sub-namespaces.
- **TABLE_READ / TABLE_WRITE**: Governs who can query table statistics or append data files to existing Iceberg tables.
- **VIEW_READ / VIEW_WRITE**: Governs access to logical virtual datasets and views.
