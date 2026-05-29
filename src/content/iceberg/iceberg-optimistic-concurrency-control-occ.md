---
term: "Iceberg Optimistic Concurrency Control (OCC)"
description: "A concurrency model in Apache Iceberg that assumes low conflict rates, allowing concurrent writers to prepare changes in isolation and retry commits if conflicts occur."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-concurrent-writes"
  - "iceberg-lock-manager"
keywords:
  - optimistic concurrency control
  - iceberg occ
  - concurrent table writes
lastUpdated: 2026-05-29
---

## Iceberg Optimistic Concurrency Control (OCC)

**Iceberg Optimistic Concurrency Control (OCC)** is the concurrency model defined by the Apache Iceberg specification to manage concurrent write operations. Rather than placing locks on tables during the entire write transaction (pessimistic locking), OCC assumes that conflicts between concurrent writers are rare. It allows multiple writers to plan, write, and stage data files in isolation, coordinating conflicts only during the final commit phase.

### The OCC Workflow

When a writer initiates a transaction on an Iceberg table, it follows a structured sequence:

1.  **Read Table State**: The writer reads the current table metadata, establishing a base snapshot ID.
2.  **Write and Stage Files**: The writer writes new data or delete files and generates manifest files in isolation.
3.  **Attempt Commit**: The writer attempts to swap the catalog's pointer from the base metadata file to a new metadata file containing the updated snapshot.
4.  **Conflict Validation**:
    - If no other writer committed changes since the base snapshot was read, the pointer swap succeeds.
    - If another writer committed a new snapshot in the meantime, the commit fails, and the writer initiates a retry loop.

### Conflict Resolution and Commit Retries

When a commit fails due to a concurrent write, Iceberg query engines attempt to resolve the conflict automatically without failing the user query:

```sql
/* Query engines execute retry loops transparently behind the scenes */
INSERT INTO sales.transactions VALUES (101, 'US', 250.00);
```

During a retry, the engine reads the newly committed snapshot, checks if the changes overlap with the staged files, and, if safe (e.g. they write to different partitions), writes a new metadata file incorporating both changes and retries the pointer swap. If the conflict is irreconcilable (such as two transactions updating the same row), the transaction fails, preventing data corruption.
