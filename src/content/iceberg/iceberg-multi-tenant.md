---
term: "Iceberg Multi-Tenancy Patterns"
description: "Multi-tenancy in Apache Iceberg isolates multiple tenants, teams, or environments in a shared lakehouse using namespace hierarchy, credential vending, RBAC at the catalog layer, and optional per-tenant catalog instances: all without duplicating data or infrastructure."
category: "Governance & Security"
relatedTerms:
  - "iceberg-access-control"
  - "apache-polaris-catalog"
  - "iceberg-rest-catalog"
  - "iceberg-audit-logging"
  - "iceberg-catalog"
keywords:
  - iceberg multi tenant
  - iceberg namespace isolation
  - iceberg tenant separation
  - iceberg shared lakehouse tenancy
  - iceberg saas multi-tenant
lastUpdated: 2026-05-14
---

## Iceberg Multi-Tenancy Patterns

**Multi-tenancy** in Apache Iceberg is the ability to serve multiple independent tenants (business units, customers, or environments) from a shared Iceberg infrastructure: with strong isolation guarantees so that each tenant's data, schemas, and access policies are separated from others.

Multi-tenancy is relevant for:

- **Enterprise lakehouses**: Different business units (Finance, Marketing, Engineering) sharing a catalog but needing data isolation.
- **SaaS platforms**: A data platform vendor serving multiple end-customer organizations from a shared lakehouse infrastructure.
- **Dev/Staging/Prod isolation**: Multiple environments sharing infrastructure but with strict separation.

## Tenancy Models

### Model 1: Namespace-Based Tenancy (Single Catalog)

Each tenant has their own namespace within a shared catalog:

```
Apache Polaris Catalog (shared)
  ├── tenant-a/
  │   ├── orders
  │   ├── customers
  │   └── events
  ├── tenant-b/
  │   ├── orders
  │   ├── customers
  │   └── events
  └── tenant-c/
      └── ...
```

**Isolation via RBAC**: Each tenant's principal can only access their namespace.

```
tenant-a-service-account → tenant-a-reader role → TABLE_READ_DATA on tenant-a.*
tenant-b-service-account → tenant-b-reader role → TABLE_READ_DATA on tenant-b.*
```

**Pros**: Simple, single catalog instance, easy administration.
**Cons**: Schema namespace collisions possible if not managed carefully; catalog admin can see all tenants.

### Model 2: Per-Tenant Catalog (Catalog-Level Isolation)

Each tenant has their own catalog instance in Polaris:

```
Apache Polaris Server
  ├── Catalog: tenant-a (warehouse: s3://tenant-a-bucket/)
  ├── Catalog: tenant-b (warehouse: s3://tenant-b-bucket/)
  └── Catalog: tenant-c (warehouse: s3://tenant-c-bucket/)
```

**Isolation via separate catalogs**: Full metadata isolation. A tenant-a admin cannot see tenant-b's catalog at all.

**Pros**: Maximum isolation, separate warehouses, separate credentials.
**Cons**: More complex administration, more Polaris instances or catalog management overhead.

### Model 3: Environment Isolation (Dev/Staging/Prod)

Use separate namespaces or catalogs for each environment:

```
Apache Polaris Catalog
  ├── dev/
  │   └── (development tables: can be written by developers)
  ├── staging/
  │   └── (staging tables: written only by CI/CD)
  └── prod/
      └── (production tables: written only by approved jobs)
```

RBAC enforces that developer credentials only write to `dev`, not `staging` or `prod`.

## Credential Vending for Tenant Isolation

The critical security mechanism for multi-tenancy is **credential vending** at the catalog layer. When tenant A's engine requests table access:

1. Catalog authenticates tenant A's service principal.
2. Catalog verifies privilege: does tenant A have access to `tenant-a.orders`?
3. Catalog vends scoped STS credentials valid for `s3://bucket/tenant-a/*` only.
4. Engine reads data using those scoped credentials.

Tenant A's engine cannot access `s3://bucket/tenant-b/*`: even if it knows the path: because its credentials are restricted to the tenant-a prefix.

## Tenant Onboarding Automation

For SaaS platforms, tenant onboarding should be automated:

```python
def onboard_new_tenant(tenant_id: str, tier: str):
    """Create namespace, roles, and base tables for a new tenant."""

    # Create namespace
    catalog.create_namespace(
        namespace=(tenant_id,),
        properties={
            "tenant.id": tenant_id,
            "tenant.tier": tier,
            "created.at": datetime.utcnow().isoformat(),
        }
    )

    # Create catalog role for this tenant
    polaris_admin.create_catalog_role(
        catalog_name="shared-catalog",
        role_name=f"{tenant_id}-readwrite"
    )

    # Grant privileges
    polaris_admin.grant_privilege(
        catalog_role=f"{tenant_id}-readwrite",
        privilege="TABLE_WRITE_DATA",
        resource=f"namespace:{tenant_id}"
    )

    # Create service principal for this tenant
    principal = polaris_admin.create_principal(
        name=f"svc-{tenant_id}",
        credentials_rotation_enabled=True
    )

    # Assign role to principal
    polaris_admin.assign_principal_role(
        principal=f"svc-{tenant_id}",
        role=f"{tenant_id}-readwrite"
    )

    return {
        "tenant_id": tenant_id,
        "namespace": tenant_id,
        "service_account": f"svc-{tenant_id}",
        "client_id": principal.client_id,
        "client_secret": principal.client_secret,  # rotated after first use
    }
```

## Cross-Tenant Data Sharing

In some scenarios, one tenant needs controlled access to another tenant's data (shared reference data, marketplace datasets):

```sql
-- Polaris: grant tenant-b read access to tenant-a's products table
GRANT TABLE_READ_DATA ON TABLE tenant-a.products TO CATALOG ROLE tenant-b-reader;
```

Tenant B's engine can then read `tenant-a.products` while still being restricted from all other tenant-a tables.

## Dremio as a Multi-Tenant Lakehouse Layer

Dremio's Agentic Lakehouse platform provides a multi-tenant access model at the query engine layer:

- **Spaces** in Dremio map to tenant namespaces in the catalog.
- **User/role provisioning** in Dremio controls which analysts see which virtual datasets.
- **AI Semantic Layer** per-tenant allows different tenants to have their own semantic definitions.
- **Usage monitoring** tracks per-tenant query consumption for billing/chargeback.
