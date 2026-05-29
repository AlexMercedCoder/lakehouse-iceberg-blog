---
term: "REST Catalog Credential Vending"
description: "A security architecture where the Iceberg REST catalog dynamically issues short-lived, scoped storage credentials to query engines, eliminating static bucket credentials."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "iceberg-rest-catalog"
  - "polaris-rbac-model"
keywords:
  - credential vending
  - token vending
  - rest catalog security
lastUpdated: 2026-05-29
---

## REST Catalog Credential Vending

**REST Catalog Credential Vending** is a security pattern defined in the Apache Iceberg REST Catalog specification. In traditional data lakes, every query engine (such as Spark, Trino, or Dremio) requires long-lived read and write access credentials configured locally to read files from object storage. With credential vending, the REST catalog server acts as the single source of security truth. It generates temporary, tightly scoped credentials and sends them to the query engines at runtime.

### How Credential Vending Works

When an engine wants to read or write to an Iceberg table, it follows a multi-step communication flow:

1.  **Table Request**: The query engine sends a request to the REST catalog to load a table (e.g. `/v1/namespaces/{ns}/tables/{table}`).
2.  **Access Verification**: The catalog server verifies that the client has the appropriate permissions to access that table.
3.  **Credential Generation**: If authorized, the catalog requests temporary credentials from the underlying cloud provider (such as AWS STS for S3, GCP IAM for GCS, or Azure Entra ID for ADLS). These credentials are restricted to the exact bucket path where the table data and metadata reside.
4.  **Metadata and Credential Response**: The catalog returns the table metadata location along with the temporary credentials in the HTTP response.
5.  **Direct Storage Scan**: The query engine uses the temporary credentials to access the object storage directly, completely bypassing the catalog server for the heavy lifting of data scanning.

### Security and Architectural Benefits

This approach addresses several common security challenges in lakehouse environments:

- **No Shared Secrets**: Developers do not need to distribute static IAM keys or storage account secrets to the configuration files of multiple query engines.
- **Path-Level Isolation**: Engines only receive access keys to the files they are querying, preventing them from reading other directories in the same storage bucket.
- **Centralized Auditing**: Since the catalog server controls all credential generation, security teams can audit all storage access requests in one place.
- **Client Independence**: Any engine that implements the standard REST catalog client protocol can use vended credentials without needing custom cloud storage plugins.
