---
term: "Decoupled Compute and Storage"
description: "An architecture separating the compute resources used to execute queries from the storage systems where data files reside."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "iceberg-table-format"
  - "dremio-sabot-engine"
keywords:
  - decoupled compute storage
  - compute storage separation
  - cloud data architecture
lastUpdated: 2026-05-29
---

## Decoupled Compute and Storage

**Decoupled Compute and Storage** is a foundational architectural pattern in cloud-native data platforms. In traditional databases and Hadoop clusters, data files are stored on the same physical disks as the execution engine. Decoupling separates these layers, storing files in inexpensive object storage (such as Amazon S3, Google Cloud Storage, or Azure Blob Storage) while executing queries on independent clusters of virtual machines.

### Architectural Blueprint

Separating these layers splits the system responsibilities:

- **Storage Layer**: Handles persistent storage of Parquet, ORC, or Avro data files and Iceberg metadata JSON files. This layer is passive, stateless, and optimized for durability and low cost.
- **Compute Layer**: Active query engines (such as Dremio, Spark, or Trino) that spin up compute resources to run queries. These engines are stateless, pulling metadata and data files on demand.

### Advantages of Decoupled Architectures

- **Independent Scaling**: Organizations scale compute capacity based on query workloads and scaling needs, while scaling storage capacity independently based on data ingestion rates.
- **Cost Efficiency**: Storage is inexpensive, allowing teams to keep historical data without paying for idle compute resources. Compute engines can scale down or pause during low-activity periods.
- **Multi-Engine Interoperability**: Since files reside in open formats on shared storage, multiple query engines can read the exact same data simultaneously without lock-in. For example, a Spark cluster can run ingestion writes while a Dremio engine runs BI queries on the same tables.
