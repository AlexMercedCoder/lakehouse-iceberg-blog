---
term: "Iceberg Sequence Number Inheritance"
description: "The mechanism in Apache Iceberg where data and delete files inherit their commit sequence numbers dynamically from the manifest list at read time."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-sequence-number"
  - "iceberg-manifest-list-schema"
keywords:
  - sequence number inheritance
  - manifest sequence number
  - iceberg spec v2
lastUpdated: 2026-05-29
---

## Iceberg Sequence Number Inheritance

**Iceberg Sequence Number Inheritance** is a metadata management strategy introduced in version 2 of the Apache Iceberg table specification. It allows newly written data or delete files to dynamically inherit their commit sequence numbers from the manifest list. This design permits manifest files to remain write-once, allowing them to be shared across commit retries and snapshots without rewriting their entries.

### How Inheritance Works

When an engine writes a new batch of data files, the sequence number for the snapshot is not yet known because the transaction has not committed. To handle this, Iceberg uses an inheritance workflow:

1.  **Writing Manifest Entries**: The write engine writes the data files and logs them as manifest entries with a status of `1` (ADDED) and sets their sequence number to `null`.
2.  **Manifest List Registration**: The coordinator creates the manifest list file for the new snapshot. It assigns the snapshot's committed sequence number to the manifest's record within the manifest list.
3.  **Read-Time Resolution**: When a query engine reads the table, it parses the manifest list, retrieves the sequence number for the manifest, and applies it to all entries where the sequence number is `null`.

### Reusing Manifests and Handling Retries

If a write transaction encounters a conflict (e.g. due to concurrent commits) and must be retried, the coordinator does not need to rewrite the physical manifest files. It only rewrites the manifest list with a new sequence number. The entries inside the manifest continue to point to `null` and successfully inherit the updated sequence number when the commit succeeds.

For files carried forward as `0` (EXISTING), their sequence numbers are written statically inside the manifest. This guarantees that the sequence numbers remain constant once committed, ensuring that delete files only apply to older records as intended.
