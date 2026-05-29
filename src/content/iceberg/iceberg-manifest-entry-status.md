---
term: "Iceberg Manifest Entry Status"
description: "An integer status code in the Iceberg manifest entry schema that defines the state of a file in a snapshot: 0 (EXISTING), 1 (ADDED), or 2 (DELETED)."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-manifest-entry-schema"
  - "iceberg-manifest-file"
keywords:
  - manifest entry status
  - iceberg file status
  - status codes manifest
lastUpdated: 2026-05-29
---

## Iceberg Manifest Entry Status

The **Iceberg Manifest Entry Status** is an integer field in the manifest entry schema that specifies the lifecycle state of a data or delete file within a snapshot. It is represented as the `status` column in the Avro manifest file. This design allows Iceberg to track files incrementally, enabling query engines to determine which files are active, which are newly introduced, and which have been marked for deletion.

### Status Code Values

The Iceberg table specification defines three distinct status codes:

- **`0` (EXISTING)**: Indicates that the file was written in a previous snapshot and is carried over into the current snapshot. The query engine continues to read this file as part of the active table state.
- **`1` (ADDED)**: Indicates that the file is newly introduced to the table in the active snapshot (e.g. via an `INSERT`, `COPY`, or `spark.write` append operation).
- **`2` (DELETED)**: Indicates that the file is no longer active in the current snapshot (e.g. due to a `DELETE`, `UPDATE`, or table compaction job). The file is omitted from queries targeting this snapshot, but physical deletion of the file is deferred until snapshot expiration.

### Metadata Efficiency and Manifest Reuse

By tracking file status inline, Iceberg avoids rewriting the entire set of manifest entries when committing updates. For example, during a write operation that appends data, Iceberg can create a new manifest file containing only entries with a status of `1` (ADDED).

When compiling a snapshot's manifest list, Iceberg references this new manifest alongside existing manifests containing entries with a status of `0` (EXISTING). This incremental design limits write amplification and allows table metadata files to scale efficiently even as tables grow to petabyte capacity.
