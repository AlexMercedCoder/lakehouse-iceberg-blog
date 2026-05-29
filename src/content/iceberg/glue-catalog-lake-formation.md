---
term: "Glue Catalog Lake Formation"
description: "A security service layer built on the AWS Glue Data Catalog that enables fine-grained, column-level, row-level, and cell-level permissions for lakehouse tables."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "aws-glue-catalog"
  - "glue-catalog-iam-policies"
keywords:
  - glue lake formation
  - aws lake formation
  - lake formation permissions
  - cell level filtering lake formation
lastUpdated: 2026-05-29
---

## Glue Catalog Lake Formation

**Glue Catalog Lake Formation** is a security and governance layer built on AWS Glue. While standard IAM policies restrict access at the resource level (such as granting access to an entire database or table), Lake Formation allows security teams to enforce fine-grained, column-level, row-level, and cell-level access controls. This security applies to Iceberg tables queried by services like AWS Athena, EMR, and Glue ETL.

### Core Permission Capabilities

Lake Formation manages access rules using a grant/revoke model similar to standard SQL databases:

- **Column-Level Filtering**: Restricts users from querying specific columns (such as social security numbers or credit card details) while permitting access to the rest of the table.
- **Row-Level Filtering**: Restricts access to specific rows based on data values (e.g. allowing regional sales managers to see only rows where `region = 'US-East'`).
- **Cell-Level Filtering**: Combines row and column rules to mask or hide specific cells from unauthorized users.

### The Access Flow with Lake Formation

When a query engine requests access to an Iceberg table managed by Lake Formation, the credential vending flow changes:

1.  **Request Access**: The query engine (e.g. Athena) requests a table definition from Glue.
2.  **Evaluate Policies**: Lake Formation intercepts the request and verifies the user's granular permissions.
3.  **Vending Temporary Credentials**: Rather than returning direct S3 pointers, Lake Formation generates temporary, short-lived credentials that permit the engine to read only the specific data blocks containing the authorized rows and columns.
4.  **Enforcement**: The engine reads the vended data stream, preventing the direct scanning of forbidden storage files.

### Integration Requirements

To use Lake Formation with Iceberg tables, databases must be registered in Lake Formation, and IAM permission inheritance must be disabled. This ensures that Lake Formation, rather than standard IAM policies, has sole authority over catalog access.
