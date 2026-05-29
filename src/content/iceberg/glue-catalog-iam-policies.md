---
term: "Glue Catalog IAM Policies"
description: "AWS Identity and Access Management policies that regulate user and compute engine access to AWS Glue Data Catalog databases, tables, and connections."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "aws-glue-catalog"
  - "glue-catalog-lake-formation"
keywords:
  - glue catalog iam
  - glue catalog policies
  - aws glue catalog iam
  - glue resource policies
lastUpdated: 2026-05-29
---

## Glue Catalog IAM Policies

**Glue Catalog IAM Policies** are AWS Identity and Access Management (IAM) permissions used to secure metadata stored in the AWS Glue Data Catalog. Because AWS Glue acts as the catalog provider for many cloud engines (such as AWS Athena, EMR, Redshift, and Spark), securing the catalog requires configuring standard IAM identity-based and resource-based policies.

### Types of Policies

Access to Glue resources is governed by two main policy types:

1.  **Identity-Based Policies**: Attached directly to IAM users, groups, or execution roles. They specify what actions the identity can perform on Glue resources.
2.  **Resource-Based Policies**: Attached directly to the Glue Data Catalog. These policies allow cross-account access, permitting IAM roles from separate AWS accounts to read or modify catalog metadata.

### Example IAM Policy

To query Iceberg tables registered in Glue, an engine requires permissions to both the Glue API and the underlying S3 buckets. The following IAM policy shows a typical set of metadata privileges:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "glue:GetDatabase",
        "glue:GetDatabases",
        "glue:GetTable",
        "glue:GetTables",
        "glue:GetTableVersions"
      ],
      "Resource": [
        "arn:aws:glue:us-east-1:123456789012:catalog",
        "arn:aws:glue:us-east-1:123456789012:database/prod_db",
        "arn:aws:glue:us-east-1:123456789012:table/prod_db/*"
      ]
    }
  ]
}
```

### The S3 Access Requirement

Having Glue IAM permissions is not enough to read or write data. Since Iceberg metadata references physical S3 paths directly, the query engine's IAM execution role must also have permission to read and write files in the target S3 bucket (e.g. `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject`). Without these storage-level permissions, queries fail during the physical file scan stage even if metadata access is permitted.
