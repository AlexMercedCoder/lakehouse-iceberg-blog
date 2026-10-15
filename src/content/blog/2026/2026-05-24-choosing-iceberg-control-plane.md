---
title: "Polaris vs Unity Catalog vs Glue: Pick an Iceberg Catalog"
description: "Use Apache Polaris for open multi-engine Iceberg, Unity Catalog for mixed Delta and Iceberg, or AWS Glue for an AWS-only stack. Features and tradeoffs compared."
pubDatetime: 2026-05-24T10:00:00Z
modDatetime: 2026-10-15T12:00:00Z
author: "Alex Merced"
tags:
  [
    "Apache Iceberg Catalog",
    "Iceberg Rest Catalog",
    "Apache Polaris",
    "Unity Catalog Iceberg",
    "Lakehouse Interoperability",
  ]
category: "Data Engineering"
slug: 2026-05-24-choosing-iceberg-control-plane
draft: false
faqs:
  - question: "Should I choose Apache Polaris or Unity Catalog for Iceberg?"
    answer: "Choose Apache Polaris when Iceberg is your main format and you want a vendor-neutral Apache catalog with RBAC and credential vending for many engines. Choose Unity Catalog when you also manage Delta Lake tables, files, and models, especially alongside Databricks; open source Unity Catalog 0.7.0 added full Iceberg REST table support."
  - question: "What is an Iceberg control plane?"
    answer: "It is the catalog service that every engine talks to before touching data: it resolves table names to current metadata, makes commits atomic, enforces access rules, and vends short-lived storage credentials. In practice it is a server that implements the Iceberg REST catalog API."
  - question: "Is Snowflake Open Catalog still available?"
    answer: "Existing Open Catalog customers can keep using it and add accounts, but Snowflake no longer lets new customers create a first Open Catalog account. Snowflake directs new customers to Horizon Catalog, whose Iceberg REST endpoint integrates Apache Polaris and supports reads and writes from external engines."
  - question: "Does AWS Glue support the Iceberg REST catalog API?"
    answer: "Yes. Glue serves the Iceberg REST API at https://glue.{region}.amazonaws.com/iceberg with SigV4 authentication, and it can reach tables in both general purpose S3 buckets and S3 Tables. It suits stacks that run entirely on AWS."
  - question: "Is Apache Polaris a top-level Apache project?"
    answer: "Yes. Polaris graduated from the Apache Incubator to a top-level project in February 2026, and its current release is 1.8.0 from September 2026. Dremio Catalog is built on Apache Polaris."
---

_Reviewed October 15, 2026 against the [Apache Polaris docs](https://polaris.apache.org/), [Unity Catalog releases](https://github.com/unitycatalog/unitycatalog/releases), [Snowflake Horizon Catalog for external engines](https://docs.snowflake.com/en/user-guide/tables-iceberg-query-using-external-query-engine-snowflake-horizon), and the [AWS Glue Iceberg REST endpoint](https://docs.aws.amazon.com/glue/latest/dg/connect-glu-iceberg-rest.html)._

Modern data architecture is undergoing a quiet but fundamental shift. For years, teams focused on choosing the right open table format, debating the file-level mechanics of Delta Lake versus Apache Iceberg. Today, that format debate is largely settled by metadata interoperability.

Databricks launched managed Iceberg tables in Unity Catalog in June 2025 and has since made them generally available, Google Cloud serves Iceberg tables to open engines through its Lakehouse runtime catalog (formerly BigLake metastore), and Snowflake's Horizon Catalog now exposes an Iceberg REST endpoint that external engines can read and write. The real battleground has moved up the stack from file formats to the metadata control plane.

When multiple compute engines, such as Apache Spark for batch ETL, Apache Flink for real-time streaming, Trino for ad-hoc SQL, and Snowflake or BigQuery for enterprise BI, need to read and write to the same shared files simultaneously, they cannot rely on local file structures. They need a centralized authority to coordinate table updates, track snapshots, and enforce security policies.

This centralized coordinator is the Apache Iceberg catalog. Selecting the right catalog control plane is now the most critical design decision in lakehouse engineering, dictating your platform's security boundaries, cloud costs, and multi-engine interoperability.

To understand why this layer has become so strategic, you must look at how the data lakehouse has evolved. The first wave of lakehouse design separated compute from storage. You stored your data as Parquet files in an open S3 bucket and spun up compute engines dynamically to run queries.

However, this model created a metadata vacuum. Because S3 has no native understanding of schemas, transaction records, or table partitions, every engine had to maintain its own list of what files made up a table. The second wave of the lakehouse is about separating metadata from compute and storage. The catalog control plane is that decoupled metadata layer.

![Architecture diagram showing multiple engines like Spark, Flink, Trino, and Snowflake communicating with a unified Iceberg REST Catalog control plane which delegates to S3 storage](/assets/images/2026/choosing-iceberg-control-plane/control-plane-architecture.png)

---

## Decoupled Interoperability: The Iceberg REST Catalog Standard

In early data lake designs, engines interacted directly with physical storage catalogs. The query engine read metadata files directly from S3 or polled a Hive Metastore database to discover which Parquet files belonged to a table.

This tightly coupled design introduced several structural problems. Every engine had to implement its own lock management and metadata parsing logic, which frequently led to commit collisions, read-write drift, and vendor lock-in.

The Apache Iceberg REST Catalog specification decouples the compute engine from metadata management. It defines a standardized, language-agnostic OpenAPI specification for catalog operations.

Under this model, the query engine never inspects raw storage directories to determine table states. Instead, it sends standard HTTP requests to a REST Catalog endpoint:

```
Query Engine (Spark/Trino) ──► GET /v1/namespaces/db/tables/events ──► REST Catalog Server
Query Engine (Spark/Trino) ◄── [JSON Table Metadata & Storage Token] ◄── REST Catalog Server
```

The REST Catalog server handles the request, interacts with the underlying metadata database, and returns a JSON payload containing the table's schema, partition specifications, current snapshot details, and temporary security credentials to access the data files.

This API-first design provides several platform benefits. It standardizes catalog operations across diverse compute engines, allowing a Spark write commit and a Trino read request to use the exact same catalog interface.

It centralizes transaction management, allowing the REST server to handle commit conflicts and enforce Optimistic Concurrency Control (OCC) without relying on engine-specific file locking.

Finally, it secures storage access through credential vending. The catalog server issues temporary, scoped access tokens (such as AWS STS tokens) to the compute engine for a specific table path, avoiding the security risk of sharing root-level storage credentials with query clients.

Additionally, standardizing the JSON response schema for table metadata ensures that secondary metadata details (such as column statistics, sort orders, and partition specs) are interpreted identically by all reading engines.

Without this standard interface, differences in how engines (like Trino versus Spark) parsed physical metadata files often led to query plan mismatches. The REST catalog eliminates this discrepancy by acting as the single, authoritative interpreter of table state.

A standard Iceberg REST Catalog response for a table request contains structured sections detailing the table state:

```json
{
  "metadata-location": "s3://my-lakehouse/metadata/00001-abc.metadata.json",
  "metadata": {
    "format-version": 2,
    "table-uuid": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "location": "s3://my-lakehouse/data",
    "last-updated-ms": 1779629242000,
    "last-column-id": 3,
    "schemas": [
      {
        "type": "struct",
        "fields": [
          { "id": 1, "name": "id", "required": true, "type": "int" },
          { "id": 2, "name": "event_date", "required": true, "type": "date" },
          {
            "id": 3,
            "name": "metric_value",
            "required": false,
            "type": "double"
          }
        ]
      }
    ],
    "current-schema-id": 0,
    "partition-specs": [
      {
        "spec-id": 0,
        "fields": [
          {
            "source-id": 2,
            "field-id": 1000,
            "name": "event_date",
            "transform": "identity"
          }
        ]
      }
    ],
    "default-spec-id": 0,
    "last-partition-id": 1000,
    "snapshots": [
      {
        "snapshot-id": 987654321,
        "timestamp-ms": 1779629242000,
        "summary": {
          "operation": "append",
          "added-data-files": "4"
        },
        "manifest-list": "s3://my-lakehouse/metadata/snap-987654321.manifest.list.avro"
      }
    ],
    "current-snapshot-id": 987654321
  },
  "storage-credentials": [
    {
      "prefix": "s3://my-lakehouse/data",
      "config": {
        "s3.access-key-id": "<temporary key id>",
        "s3.secret-access-key": "<temporary secret>",
        "s3.session-token": "<temporary session token>"
      }
    }
  ]
}
```

This clean structure isolates the reading client from having to query physical directories or parse raw metadata files. The catalog server performs the lookups and serves the exact logical plan foundations in a unified JSON response.

---

## Independent and Open: Apache Polaris Architecture

Apache Polaris is an open-source, vendor-neutral metadata control plane designed for Apache Iceberg tables. Polaris graduated to a Top-Level Project (TLP) at the Apache Software Foundation (ASF) in February 2026, and its current release is 1.8.0 (September 2026). This independent status means Polaris operates under community-driven governance rather than a single vendor's roadmap. Managed services build on it as well: Dremio Catalog is built on Apache Polaris.

Architecturally, Polaris acts as a stateless REST Catalog server that communicates with a backend metadata store (PostgreSQL or CockroachDB through its relational JDBC backend, or MongoDB through its NoSQL backend). Polaris provides a unified namespace where you can manage Iceberg tables and register external catalog sources.

Polaris implements a zero-trust security model centered on temporary credential vending. When a client engine queries a table, Polaris does not share raw IAM keys. Instead, the Polaris server negotiates temporary tokens (such as AWS STS scoped sessions or Google Cloud Service Account impersonations) that allow the engine to access only the specific storage path linked to that table.

The v1.4 release of Apache Polaris (April 2026) introduced several updates designed for production deployments:

- **AWS STS Session Tag Customization:** Platform administrators can now choose which fields (realm, catalog, namespace, table, principal, roles, or trace ID) Polaris attaches as AWS STS session tags on vended credentials. When an engine reads storage, these tags propagate to AWS CloudTrail, providing audit logs that tie S3 file operations back to specific catalog tables and users.
- **KMS and Storage-Scoped Credentials:** Catalog storage configurations can now carry optional KMS settings for S3 data encryption, and Polaris can use different AWS credentials per named storage configuration instead of one set for the whole server.
- **Metrics Persistence:** Polaris now supports persisting Iceberg scan reports and commit reports directly to its catalog database. This enables teams to monitor read-write patterns, track catalog performance, and identify slow commits across multiple engines.
- **CockroachDB Backend Integration:** The database storage layer has been optimized to support CockroachDB, providing horizontally-scalable metadata storage for high-concurrency enterprise catalogs.
- **Gateway API Support:** Helm charts have been updated to support the Kubernetes Gateway API, simplifying ingress routing and certificate management in containerized environments.
- **UV Packaging:** The Python packaging and dependency infrastructure switched from Poetry to UV, significantly reducing the build and deployment times of custom Polaris clients and CLI tools.

To configure an Apache Spark session to connect to a Polaris server using the standard Iceberg REST Catalog API, you define the catalog properties in your configuration file or code:

```python
from pyspark.sql import SparkSession

# Initialize Spark Session with Apache Polaris REST Catalog configuration
spark = SparkSession.builder \
    .appName("PolarisCatalogConnection") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.polaris", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.polaris.type", "rest") \
    .config("spark.sql.catalog.polaris.uri", "http://polaris-server.data-platform.local:8181/api/catalog") \
    .config("spark.sql.catalog.polaris.credential", "client_id_123:client_secret_xyz") \
    .config("spark.sql.catalog.polaris.warehouse", "my_s3_warehouse") \
    .getOrCreate()

# Query an Iceberg table managed by Polaris
df = spark.read.table("polaris.db.sales_records")
df.show()
```

Releases since 1.4 have continued on the same track through 1.8.0, adding features such as semantic model privileges, more federation options, and safer commit error handling. This open architecture makes Polaris a strong default for organizations building multi-engine, multi-cloud platforms on open-source technologies.

---

## Managed by Snowflake: Horizon Catalog and Open Catalog

For teams that want the interoperability of Apache Polaris without running a metadata server themselves, Snowflake offers two managed options, and the recommended one has changed.

**Snowflake Open Catalog** is Snowflake's managed service for Apache Polaris. Existing Open Catalog customers can keep using it, but Snowflake's docs state that customers without an Open Catalog account can no longer create one; new customers are directed to **Snowflake Horizon Catalog**.

Horizon Catalog exposes Snowflake-managed Iceberg tables to external engines such as Spark, Trino, and DuckDB through an Iceberg REST endpoint (`https://<account_identifier>.snowflakecomputing.com/polaris/api/catalog`). Snowflake describes Apache Polaris as integrated into Horizon Catalog for this interoperability, and both reads and writes from external engines are supported with vended credentials. Snowflake's docs say billing for this access is scheduled to begin in the second half of 2026.

```
External Engine (Trino/Spark) ──► Horizon Iceberg REST endpoint
                                            │
                                            ▼
                              Snowflake Horizon Governance
                                            │
                                            ├─► Row-Level Security
                                            └─► Column Masking
```

You define access policies, such as row access policies and masking policies, inside Snowflake using standard SQL, and grant roles SELECT on the tables external engines will use.

External engines then connect in one of two ways. A plain Iceberg REST connection works for tables without Snowflake data protection policies and does not enforce them. For tables protected by row access and masking policies, Snowflake documents a separate Spark connection path that enforces those policies, so check that path before you rely on masking for Spark users.

This makes Horizon Catalog a fit when Snowflake is the system of record for Iceberg tables and other engines need governed access to them. It is a weaker fit when you want the catalog to stay independent of any one warehouse vendor.

---

## Multi-Format Security: Open-Source Unity Catalog

While Polaris and Snowflake's catalogs center on the Apache Iceberg format, Databricks has taken a multi-format approach by open-sourcing **Unity Catalog**. Licensed under the Apache 2.0 license and hosted as a sandbox project under the LF AI & Data Foundation, open-source Unity Catalog catalogs Delta Lake and Apache Iceberg tables (Hudi through UniForm), plus files, functions, and AI models.

Unity Catalog provides a metadata governance layer that extends beyond basic table files. It manages volumes (unstructured files), registers functions and machine learning models, and handles access control.

Key milestones for open-source Unity Catalog in 2026 include:

- **Catalog-managed Delta commits (0.5.0, June 2026):** The UC Delta API lets Delta clients create, load, and commit to catalog-managed Delta tables, with server-side commit validation and credential vending, so the catalog rather than each engine coordinates writes.
- **Metric views (0.5.0 preview, 0.6.0 full support, August 2026):** Metric views store reusable measures and dimensions in the catalog as a governed semantic layer. With Apache Spark 4.2 you define and query them in SQL.
- **Full Iceberg REST table support (0.7.0, October 2026):** Any engine that speaks the Iceberg REST protocol can now create, write, read, rename, and drop Iceberg tables in Unity Catalog, and native Iceberg tables are enabled by default.

To work with Iceberg tables in an open-source Unity Catalog server, point any Iceberg REST client at its Iceberg endpoint. For example, in PySpark:

```python
from pyspark.sql import SparkSession

# Connect Spark to open-source Unity Catalog through its Iceberg REST endpoint
# (Iceberg 1.11.0 is the version shown in the Unity Catalog 0.7.0 release notes)
spark = SparkSession.builder \
    .appName("UnityCatalogIcebergREST") \
    .config("spark.jars.packages", "org.apache.iceberg:iceberg-spark-runtime-4.1_2.13:1.11.0") \
    .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions") \
    .config("spark.sql.catalog.unity", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.unity.type", "rest") \
    .config("spark.sql.catalog.unity.uri", "http://unity-server.data-platform.local:8080/api/2.1/unity-catalog/iceberg") \
    .config("spark.sql.catalog.unity.warehouse", "unity") \
    .config("spark.sql.catalog.unity.token", "<uc_token>") \
    .getOrCreate()

spark.sql("SELECT * FROM unity.db.inventory").show()
```

For Delta tables, DuckDB's `unity_catalog` extension attaches a Unity Catalog server directly (`CREATE SECRET (TYPE unity_catalog, TOKEN ..., ENDPOINT ..., AWS_REGION ...)` followed by `ATTACH 'main' AS main (TYPE unity_catalog)`); it reads and inserts into Delta tables but does not cover Iceberg tables.

Unity Catalog's multi-format support makes it a strong option for teams managing mixed data environments containing both Delta Lake and Apache Iceberg tables.

Catalog-managed commits matter most for multi-engine architectures. When each engine writes its own commit files straight to object storage, a misbehaving or outdated writer can corrupt table state. With catalog-managed commits, the catalog validates each commit before it lands, which keeps tables consistent across Spark, DuckDB, and other writers.

![Stack diagram showing the security and catalog commit layers of modern Iceberg control planes including RBAC, credential vending, and multi-engine commits](/assets/images/2026/choosing-iceberg-control-plane/catalog-governance-comparison.png)

---

## Cloud Native Scoping: AWS Glue & Google Cloud Lakehouse

In addition to open-source and Snowflake options, the major cloud providers offer native managed REST endpoints for Iceberg catalogs.

### AWS Glue Iceberg REST Catalog

AWS Glue serves the Iceberg REST API at `https://glue.<region>.amazonaws.com/iceberg`, authenticated with AWS SigV4. This catalog integrates directly with the AWS security and metadata stack, including AWS IAM for authentication, AWS Lake Formation for fine-grained access control, and Amazon S3.

- _Implementation:_ Engines (such as Amazon Athena, Amazon EMR, AWS Glue jobs, or any Iceberg REST client) connect using IAM credentials. The same endpoint reaches Iceberg tables in general purpose S3 buckets and in Amazon S3 Tables, which add managed compaction, snapshot management, and unreferenced file removal.
- _Workload Fit:_ This option is ideal for AWS-centric data platforms. If your storage, computing, and BI tools are hosted entirely inside AWS, Glue provides a zero-maintenance, serverless control plane. Accessing it from other clouds means managing AWS credentials and SigV4 signing outside AWS.
- _Security Details:_ By linking AWS Glue to AWS Lake Formation, administrators can set security policies using tag-based access control (TBAC). This allows you to tag tables as "Confidential" or "Public" and grant access to IAM users or roles based on these tags.

### Google Cloud Lakehouse Runtime Catalog

On April 20, 2026, Google renamed BigLake to Lakehouse and BigLake metastore to the Lakehouse runtime catalog. Its Iceberg REST catalog tables are the option Google recommends for most open lakehouse workloads.

- _Implementation:_ The runtime catalog is the source of truth for table schemas and snapshots. Open-source engines (Spark, Flink, Trino) read and write these tables through the Iceberg REST endpoint, which Google lists as generally available. BigQuery reads them (GA), and BigQuery DML on them (INSERT, UPDATE, DELETE, MERGE) is in preview.
- _Workload Fit:_ This managed catalog suits platforms centered on Google Cloud Storage that want BigQuery and open-source engines working on the same Iceberg tables.

---

## Feature Matrix: Comparing Access Control and Credential Vending

Selecting a catalog requires comparing their support for key platform features:

| Capability             | Apache Polaris (1.8)         | Open-Source Unity Catalog (0.7) | Snowflake Horizon Catalog                 | AWS Glue REST Catalog             |
| ---------------------- | ---------------------------- | ------------------------------- | ----------------------------------------- | --------------------------------- |
| **Governance Body**    | Apache Software Foundation   | Linux Foundation (LF AI & Data) | Snowflake (integrates Apache Polaris)     | Proprietary (AWS)                 |
| **Primary Formats**    | Apache Iceberg               | Delta Lake, Iceberg             | Apache Iceberg                            | Apache Iceberg                    |
| **Credential Vending** | Native (AWS STS, GCP, Azure) | Temporary credential vending    | Vended credentials                        | IAM and Lake Formation            |
| **Access Control**     | Role-Based Access (RBAC)     | Grants on catalog objects       | Snowflake roles; masking and row policies | AWS Lake Formation                |
| **Metadata Commits**   | Iceberg REST commit protocol | Iceberg REST and UC Delta API   | Iceberg REST commit protocol              | Iceberg REST or Glue API          |
| **Billing Model**      | Free (Open Source)           | Free (Open Source)              | Billing scheduled for second half of 2026 | Serverless (Glue request pricing) |

---

## Decision Framework: Choosing the Right Catalog Control Plane

No single catalog control plane fits every data architecture. Your choice depends on your existing technology stack, cloud provider alignment, and format requirements.

Use this engineering decision framework to guide your selection:

1.  **Are you a Databricks-centric shop running Delta Lake tables?**
    - _Recommendation:_ Use **Unity Catalog**. It provides catalog-managed Delta commits, metric views, and governance for files and models. The open-source version and its Iceberg REST endpoint let non-Databricks engines work in the same catalog namespace.
2.  **Are you building an open-source, multi-engine lakehouse utilizing Apache Iceberg?**
    - _Recommendation:_ Use **Apache Polaris**, self-hosted or as a managed Polaris-based service such as Dremio Catalog. Its vendor-neutral ASF governance, credential vending across AWS, Azure, and GCS, and production features (STS session tags, KMS settings, metrics persistence) make it a strong default for open data platforms.
3.  **Do you use Snowflake as your primary query engine but want to query tables with external engines (like Spark or Flink)?**
    - _Recommendation:_ Use **Snowflake Horizon Catalog** and its Iceberg REST endpoint. Existing Snowflake Open Catalog customers can stay on Open Catalog, but new customers cannot create Open Catalog accounts.
4.  **Are you hosted entirely inside a single cloud provider (AWS or Google Cloud) and want a managed, serverless catalog?**
    - _Recommendation:_ Use **AWS Glue REST Catalog** (with S3 Tables if you want managed maintenance) or the **Google Cloud Lakehouse runtime catalog**. These options integrate with cloud-native security and IAM policies, reducing operational setup overhead.

For example, if your pipeline is built primarily on Spark and Trino running on AWS EMR, using self-hosted Apache Polaris or AWS Glue REST Catalog is the logical choice. However, if your business units query data using both Databricks and Snowflake, catalog federation or the Iceberg REST endpoints both platforms now expose provide the bridge to avoid data duplication.

![Flowchart decision tree helping engineers evaluate catalog requirements and select the correct Iceberg control plane](/assets/images/2026/choosing-iceberg-control-plane/catalog-selection-flowchart.png)

---

## Conclusion

The metadata control plane is the strategic layer of the modern data lakehouse. By decoupling query execution from metadata management, the Apache Iceberg REST Catalog specification enables true multi-engine interoperability and secure data access.

Whether you deploy the open-source Apache Polaris server, open-source Unity Catalog, Snowflake Horizon Catalog, or cloud-native managed REST endpoints, establishing a centralized catalog is the critical step to scale your data platform and secure your metadata.

---

## Frequently Asked Questions

### Should I choose Apache Polaris or Unity Catalog for Iceberg?

Choose Apache Polaris when Iceberg is your main format and you want a vendor-neutral Apache catalog with RBAC and credential vending for many engines. Choose Unity Catalog when you also manage Delta Lake tables, files, and models, especially alongside Databricks; open source Unity Catalog 0.7.0 added full Iceberg REST table support.

### What is an Iceberg control plane?

It is the catalog service that every engine talks to before touching data: it resolves table names to current metadata, makes commits atomic, enforces access rules, and vends short-lived storage credentials. In practice it is a server that implements the Iceberg REST catalog API.

### Is Snowflake Open Catalog still available?

Existing Open Catalog customers can keep using it and add accounts, but Snowflake no longer lets new customers create a first Open Catalog account. Snowflake directs new customers to Horizon Catalog, whose Iceberg REST endpoint integrates Apache Polaris and supports reads and writes from external engines.

### Does AWS Glue support the Iceberg REST catalog API?

Yes. Glue serves the Iceberg REST API at https://glue.{region}.amazonaws.com/iceberg with SigV4 authentication, and it can reach tables in both general purpose S3 buckets and S3 Tables. It suits stacks that run entirely on AWS.

### Is Apache Polaris a top-level Apache project?

Yes. Polaris graduated from the Apache Incubator to a top-level project in February 2026, and its current release is 1.8.0 from September 2026. Dremio Catalog is built on Apache Polaris.

---

### Master the Modern Lakehouse

To build your expertise in modern data architectures, open table formats, and semantic metadata design, consider the following next steps:

- **Read the Lakehouse Guide:** Order a copy of [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI: A Hands-On Practitioner's Guide to Modern Data Architecture, Open Table Formats, and Agentic AI](https://www.amazon.com/dp/B0GQNY21TD) for a detailed, hands-on exploration of building open data platforms.
- **Explore Other Technical Books:** Find listings of Alex Merced's other data engineering and analytics books at [books.alexmerced.com](https://books.alexmerced.com).
- **Test Polaris Locally:** Run a local Apache Polaris instance using Docker and connect a local DuckDB or PySpark session to experiment with REST catalog commits and credential vending.
- **Try Dremio Cloud:** To query your Iceberg tables with sub-second performance, automated reflection tuning, and unified catalog integration, try Dremio Cloud free for 30 days at [dremio.com/get-started](https://www.dremio.com/get-started).
