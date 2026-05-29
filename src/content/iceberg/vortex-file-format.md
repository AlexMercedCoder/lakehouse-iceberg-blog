---
term: "Vortex File Format"
description: "A high-performance columnar storage format succeeding Parquet, optimized for GPU-native decompression, in-memory Arrow compatibility, and fast random access."
category: "Modern Lakehouse Concepts & Interoperability"
relatedTerms:
  - "iceberg-parquet"
  - "columnar-memory-layouts"
keywords:
  - vortex
  - vortex file format
  - parquet replacement
  - gpu native storage
lastUpdated: 2026-05-29
---

## Vortex File Format

The **Vortex File Format** is a next-generation columnar storage format designed as a modern successor to Apache Parquet. Optimized for high-throughput analytics and AI/ML workloads, Vortex offers faster random access and scan speeds (typically 10x to 100x faster than Parquet) while supporting native GPU decompression to eliminate CPU bottlenecks.

### Integration with Apache Iceberg

In data lakehouse environments, Vortex and Apache Iceberg are complementary:

- **Pluggable Storage Layer**: Iceberg functions as the table format layer that manages schemas, snapshots, and transactions, while Vortex functions as the physical file format that stores raw data on disk.
- **File Format API Extension**: The Apache Iceberg community has introduced a pluggable file format API (implemented via PRs in the core specification) that allows Iceberg to support alternative formats beyond Parquet, Avro, and ORC. Under this API, Vortex acts as a drop-in replacement for Parquet.
- **Arrow-Native Interoperability**: Since Vortex is designed around Apache Arrow memory layouts, reading Vortex files into query engines requires zero-copy serialization, accelerating the processing of data splits during query execution.
- **Vectorized Planning**: By utilizing Vortex files under the Iceberg metadata layer, lakehouse query engines can combine Iceberg's metadata-driven split planning with Vortex's fast physical scan speeds.
