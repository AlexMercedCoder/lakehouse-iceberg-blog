---
term: "Glue Catalog Lake Formation"
metaTitle: "AWS Lake Formation for Glue Iceberg Tables: Access Control"
description: "AWS Lake Formation adds column, row, and cell-level permissions to Glue Data Catalog tables, enforced by Athena, EMR, and Redshift Spectrum for Iceberg tables."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "aws-glue-catalog"
  - "glue-catalog-iam-policies"
keywords:
  - glue lake formation
  - aws lake formation
  - lake formation permissions
  - cell level filtering lake formation
lastUpdated: 2026-10-15
---

## Glue Catalog Lake Formation

AWS Lake Formation adds fine-grained permissions (column, row, and cell-level data filters) on top of AWS Glue Data Catalog tables, including Iceberg tables. Integrated engines such as Athena, Amazon EMR, and Redshift Spectrum enforce those filters when they query the table.

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
3.  **Vending Temporary Credentials**: Lake Formation assumes the role used to register the table's S3 location and hands the engine temporary, short-lived credentials scoped to that table's data location, so the querying principal needs no direct S3 permissions.
4.  **Enforcement**: The integrated engine reads the files and applies the column, row, and cell filters before returning results. Filters apply only to reads (`SELECT`).

### Integration Requirements

To use Lake Formation with Iceberg tables, register the table's Amazon S3 location as a data lake location, then remove the default `IAMAllowedPrincipals` grants (or use hybrid access mode to opt in specific principals gradually). This ensures that Lake Formation, rather than standard IAM policies alone, governs catalog access.

Known limits with Athena: Athena does not support DDL on Iceberg tables registered with Lake Formation, Lake Formation cannot govern `VACUUM`, `MERGE`, `UPDATE`, or `OPTIMIZE`, and metadata tables such as `$files` and `$snapshots` fail when row or cell filters apply.
