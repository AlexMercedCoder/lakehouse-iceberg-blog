---
term: "Dremio Spaces"
description: "Dremio Spaces are logical namespace containers in the Dremio catalog where data teams organize, collaborate on, and secure Virtual Datasets in the semantic layer."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-virtual-datasets-vds"
  - "dremio-physical-datasets-pds"
  - "dremio-apache-iceberg"
keywords:
  - dremio spaces
  - spaces semantic layer
  - data namespaces dremio
  - dataset organization spaces
  - rbac dremio spaces
lastUpdated: 2026-05-29
---

## Dremio Spaces

**Dremio Spaces** are logical, high-level directories in Dremio's data catalog designed for organizing, sharing, and securing Virtual Datasets (VDS). Spaces function as collaboration zones where data engineers, architects, and business analysts construct the semantic layer.

Within a Space, users can create folders and subfolders to organize datasets hierarchically. For example, a data team can structure a workspace by business department (such as Finance, Marketing, or HR) or by data maturity stage (such as Staging, Cleansed, and Reporting).

## Role in the Semantic Layer

Dremio Spaces serve three core architectural purposes:

### 1. Unified Namespace Organization

Spaces provide a clear, business-friendly namespace that shields users from the complex paths of physical storage buckets or databases. Instead of querying a raw file path like `s3://prod-analytics-bucket-01/raw_orders/csv/data.csv`, a business analyst can query the semantic path:

```sql
SELECT * FROM "Sales Space".active_orders;
```

This logical layer makes SQL queries readable and insulates downstream BI dashboards from modifications to upstream physical database locations.

### 2. Granular Access Control and Security

Dremio Spaces are critical boundaries for Role-Based Access Control (RBAC). Administrators can define permissions at the Space level, regulating who can:

- **View**: Discover datasets within the Space.
- **Query**: Execute SQL reads against the contained VDS.
- **Edit**: Modify VDS SQL queries or configuration settings.
- **Manage**: Alter access control lists (ACLs) and delete objects.

Permissions set on a Space automatically cascade to all child folders and VDS contained within it.

### 3. Space Allocation and Resource Isolation

Spaces help manage resources. Administrators can monitor query patterns and apply workload rules to prioritize queries originating from specific business spaces. For example, queries targeting the "Finance Reporting Space" can be routed to a high-priority queue, ensuring crucial financial dashboards are prioritized over ad-hoc queries from testing spaces.

## Spaces in Dremio Software vs. Dremio Cloud

The implementation of Spaces varies depending on the deployment environment:

- **Dremio Software (Self-Managed)**: Spaces are first-class, top-level constructs in the catalog UI. Data teams create them directly in the coordinator interface to group logical datasets.
- **Dremio Cloud (Fully Managed)**: The semantic organization is unified within **Dremio Arctic** or open REST Catalogs (powered by Apache Polaris). In this cloud environment, Spaces are represented by logical folders and namespaces within the unified Iceberg REST catalog structure, enabling consistent governance across all Iceberg-compatible query engines.
