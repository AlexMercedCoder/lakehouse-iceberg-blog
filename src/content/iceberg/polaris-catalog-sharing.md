---
term: "Polaris Catalog Sharing"
description: "A secure metadata sharing feature in Apache Polaris that allows external accounts and partner engines to access catalog namespaces without copying data."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "apache-polaris-catalog"
  - "polaris-rbac-model"
keywords:
  - polaris catalog sharing
  - share catalogs
  - data sharing polaris
  - multi account share
lastUpdated: 2026-05-29
---

## Polaris Catalog Sharing

**Polaris Catalog Sharing** is a data governance feature in Apache Polaris designed to facilitate secure, read-only access to Iceberg tables across different organizational units, cloud accounts, or partner networks. Traditional data sharing requires copying physical files to external storage buckets or running extract, transform, and load (ETL) pipelines. Polaris simplifies this by sharing the metadata pointers directly.

### Sharing Mechanism

Catalog sharing leverages the Iceberg REST Catalog specification:

1.  **Share Configuration**: An administrator creates a "Share" object in Polaris and links it to specific namespaces or tables.
2.  **Recipient Registration**: The administrator registers external recipients, creating a dedicated set of credentials (client ID and client secret) for each recipient.
3.  **Read-Only Boundary**: Polaris restricts recipient access exclusively to read-only metadata endpoints. Recipient engines cannot create new tables, modify schemas, or append data to shared namespaces.
4.  **On-Demand Credential Vending**: When the recipient's query engine reads a shared table, Polaris vends temporary read-only storage credentials. This allows the recipient engine to read the physical data files directly from the owner's cloud storage bucket without seeing other files in the bucket.

### Benefits over Traditional ETL

This sharing model has several business and technical advantages:

- **Zero Storage Copying**: Eliminates storage duplication costs since data is read from the source bucket.
- **Real-Time Data**: External users query live data. Any updates committed to the source table are immediately visible to recipients, without batch latency.
- **Centralized Access Revocation**: Administrators can disable a share or revoke recipient credentials instantly in the Polaris console, cutting off access to both the metadata and the underlying storage files.
