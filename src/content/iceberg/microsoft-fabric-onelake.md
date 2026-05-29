---
term: "Microsoft Fabric OneLake"
description: "A unified SaaS data lake for Microsoft Fabric that supports Apache Iceberg through metadata shortcuts and table format virtualization."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "delta-lake-uniform-metadata"
  - "apache-xtable-translations"
keywords:
  - onelake
  - microsoft fabric onelake
  - onelake iceberg
  - onelake virtualization
  - onelake shortcuts
lastUpdated: 2026-05-29
---

## Microsoft Fabric OneLake

**Microsoft Fabric OneLake** is a unified, logical SaaS data lake for Microsoft Fabric. Often described as "OneDrive for data," OneLake stores all data in a single virtual repository. While Delta Lake is Fabric's native default storage format, OneLake provides robust virtualization capabilities for Apache Iceberg tables to ensure cross-format interoperability.

### Iceberg Integration Scope

OneLake supports Apache Iceberg through several virtualization features:

- **Table Format Virtualization**: OneLake utilizes a virtualization layer (often powered by metadata translators like Apache XTable) to expose existing Delta Lake tables as Iceberg tables, or vice versa, without rewriting the physical data files or copying data.
- **OneLake Shortcuts**: Users can create shortcuts in a Fabric Lakehouse pointing to Iceberg tables stored in external locations (like AWS S3 or ADLS Gen2). When configured, OneLake virtualizes the Iceberg metadata, allowing Fabric's SQL and Spark engines to query the shortcut folder as if it were a native Delta Lake table.
- **Iceberg REST Catalog API Support**: OneLake exposes an Iceberg REST Catalog (IRC) API endpoint. This allows external query engines (such as Snowflake, Dremio, or Trino) to query Fabric tables using standard Iceberg catalog connection strings.
- **Snowflake Interoperability**: Fabric supports a native metadata integration with Snowflake. Snowflake-managed Iceberg tables written directly into OneLake can be queried instantly by Fabric engines, and Fabric Delta tables can be read by Snowflake as virtual Iceberg tables, enabling multi-vendor data sharing.
