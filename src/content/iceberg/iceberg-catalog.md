---
term: "What is an Iceberg Catalog?"
description: "An Apache Iceberg catalog is the service responsible for tracking the current metadata file location for each Iceberg table, enabling engines to discover and access tables while supporting atomic table creation, updates, and deletion."
category: "Catalogs"
relatedTerms:
  - "iceberg-rest-catalog"
  - "iceberg-hive-metastore"
  - "apache-polaris-catalog"
  - "project-nessie"
  - "aws-glue-catalog"
  - "iceberg-metadata-file"
keywords:
  - iceberg catalog
  - apache iceberg catalog
  - what is an iceberg catalog
  - iceberg table catalog
  - iceberg catalog types
lastUpdated: 2026-05-14
---

## What is an Apache Iceberg Catalog?

An **Iceberg catalog** is the service that stores and manages the mapping between Iceberg table names and their current metadata file locations. It is the entry point that allows any query engine to discover and access Iceberg tables stored in object storage.

The catalog's role is deliberately minimal and well-defined: for each table, it stores exactly one piece of information: the path to the table's **current metadata file** in object storage. Everything else about the table's history, schema, partitioning, and data is encoded in the metadata file chain itself.

## Why a Catalog is Necessary

Apache Iceberg tables store all their structural metadata in object storage (metadata files, manifest lists, manifest files). But object storage has no concept of a "current" or "authoritative" version of a table. Without a catalog:

- There is no way to know which metadata file is the "current" one out of the many versioned metadata files created over time.
- Multiple engines can't coordinate concurrent writes without a shared source of truth for the current table state.
- Table discovery (listing available tables, databases, namespaces) is impossible.

The catalog provides the **atomic commit primitive**: only one metadata pointer update can succeed when multiple writers compete, which is how Iceberg achieves ACID semantics at the table level.

## What a Catalog Manages

At minimum, an Iceberg catalog must support:

- **Table creation**: Assign a name and create the initial metadata file pointer.
- **Table loading**: Return the current metadata file location for a given table name.
- **Table update (commit)**: Atomically swap the metadata pointer from old to new (only if the current pointer matches what the writer expected: compare-and-swap semantics).
- **Table deletion**: Remove the table entry from the catalog.
- **Namespace management**: Group tables into databases/schemas/namespaces.

## Types of Iceberg Catalogs

### Hive Metastore Catalog

The original Iceberg catalog implementation, using the Hive Metastore service to store metadata file pointers in a relational database (MySQL, PostgreSQL). Widely supported, but introduces a dependency on the JVM-based HMS service.

### Iceberg REST Catalog

A language-agnostic HTTP REST API specification for implementing Iceberg catalogs. Any service that implements the Iceberg REST Catalog spec can serve as an Iceberg catalog, decoupling clients from specific catalog implementations. This is the modern standard.

### Apache Polaris (formerly Snowflake's open-source Polaris)

An Apache-governed, open-source implementation of the Iceberg REST Catalog specification. Co-created by Dremio and Snowflake and donated to the Apache Foundation. Dremio's Open Catalog capability is powered by Apache Polaris.

### Project Nessie

A transactional metadata catalog with Git-like branch-and-merge semantics, implementing the Iceberg REST Catalog interface. Enables branch-based ETL development and zero-copy experiments.

### AWS Glue Data Catalog

Amazon's managed metadata catalog service, with native Iceberg REST Catalog support (as of 2023). Tightly integrated with AWS analytics services (Athena, EMR, Glue ETL).

### JDBC Catalog

A generic catalog backed by any JDBC-compatible relational database. Useful for development and small deployments.

### In-Memory / Hadoop Catalog

Catalogs that store pointer information in a local filesystem or HDFS path. Primarily used for testing and single-engine deployments.

## The Iceberg REST Catalog Specification

The **Iceberg REST Catalog** is the most important catalog development in the Iceberg ecosystem since the table format itself. By defining a standard HTTP API for catalog operations, it enables:

- **Engine neutrality**: Any engine that speaks the REST API can work with any compliant catalog.
- **Language neutrality**: Python clients (PyIceberg), JVM engines (Spark, Flink), and native engines (Dremio, Trino) all use the same protocol.
- **Catalog substitutability**: Swap from one catalog implementation to another without changing engine configuration.

See [Iceberg REST Catalog](/iceberg/iceberg-rest-catalog/) for the full deep dive.

## Catalog and Governance

Modern catalogs like Apache Polaris extend the basic catalog contract with governance capabilities:

- **Fine-grained access control**: Table-level, namespace-level, and catalog-level permissions.
- **Multi-tenancy**: Multiple principals with isolated namespaces and credentials.
- **Credential vending**: The catalog provides short-lived object storage credentials scoped to specific tables, enabling engines to access data without holding long-lived cloud credentials.

This governance layer is what makes the catalog the appropriate integration point for enterprise lakehouse security.
