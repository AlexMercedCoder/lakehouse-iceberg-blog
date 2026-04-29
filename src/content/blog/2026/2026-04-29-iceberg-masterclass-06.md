---
title: "Writing to an Apache Iceberg Table: How Commits and ACID Actually Work"
pubDatetime: 2026-04-29T12:05:00Z
date: "2026-04-29"
description: "Here is exactly how an engine writes to an Iceberg table, step by step, from data files through the atomic commit that makes ACID guarantees possible."
author: "Alex Merced"
category: "Data Engineering"
tags:
  - writing to Apache Iceberg
  - Iceberg ACID transactions
  - atomic commit
  - optimistic concurrency
slug: 2026-04-29-iceberg-masterclass-06
draft: false
---

## Apache Iceberg Masterclass - Table of Contents

1. [What Are Table Formats and Why Were They Needed?](/posts/2026-04-29-iceberg-masterclass-01/)
2. [The Metadata Structure of Modern Table Formats](/posts/2026-04-29-iceberg-masterclass-02/)
3. [Performance and Apache Iceberg's Metadata](/posts/2026-04-29-iceberg-masterclass-03/)
4. [Partition Evolution: Change Your Partitioning Without Rewriting Data](/posts/2026-04-29-iceberg-masterclass-04/)
5. [Hidden Partitioning: How Iceberg Eliminates Accidental Full Table Scans](/posts/2026-04-29-iceberg-masterclass-05/)
6. [Writing to an Apache Iceberg Table: How Commits and ACID Actually Work](/posts/2026-04-29-iceberg-masterclass-06/)
7. [What Are Lakehouse Catalogs? The Role of Catalogs in Apache Iceberg](/posts/2026-04-29-iceberg-masterclass-07/)
8. [When Catalogs Are Embedded in Storage](/posts/2026-04-29-iceberg-masterclass-08/)
9. [How Data Lake Table Storage Degrades Over Time](/posts/2026-04-29-iceberg-masterclass-09/)
10. [Maintaining Apache Iceberg Tables: Compaction, Expiry, and Cleanup](/posts/2026-04-29-iceberg-masterclass-10/)
11. [Apache Iceberg Metadata Tables: Querying the Internals](/posts/2026-04-29-iceberg-masterclass-11/)
12. [Using Apache Iceberg with Python and MPP Query Engines](/posts/2026-04-29-iceberg-masterclass-12/)
13. [Approaches to Streaming Data into Apache Iceberg Tables](/posts/2026-04-29-iceberg-masterclass-13/)
14. [Hands-On with Apache Iceberg Using Dremio Cloud](/posts/2026-04-29-iceberg-masterclass-14/)
15. [Migrating to Apache Iceberg: Strategies for Every Source System](/posts/2026-04-29-iceberg-masterclass-15/)

This is Part 6 of a 15-part [Apache Iceberg Masterclass](/posts/2026-04-29-iceberg-masterclass-01/). [Part 5](/posts/2026-04-29-iceberg-masterclass-05/) covered hidden partitioning. This article walks through the exact steps an engine takes when writing data to an Iceberg table, when the write becomes visible, and how concurrent writers are handled.

Understanding the write process is critical because it explains why Iceberg can provide ACID guarantees on top of object storage, something that seems impossible when you consider that S3, ADLS, and GCS have no built-in transaction support. The answer is that ACID lives entirely in the metadata layer, not in storage.

## The Six Steps of a Write

![The Iceberg write process from data file creation through the atomic catalog pointer swap](/assets/images/2026/apache-iceberg-masterclass/write-process-flow.png)

Every write operation (INSERT, DELETE, UPDATE, MERGE) follows the same six-step sequence:

### Step 1: Write Data Files

The engine writes new Parquet (or ORC/Avro) files to object storage. These files are placed in the table's data directory but are not yet referenced by any metadata. At this point, they are invisible to all readers. They are just orphan files sitting in storage.

### Step 2: Create Manifest Entries

For each new data file, the engine creates a manifest entry containing the file path, file size, row count, partition values (computed using the table's [partition transforms](/posts/2026-04-29-iceberg-masterclass-05/)), and column-level statistics (min, max, null count).

### Step 3: Create or Update Manifest Files

The engine bundles manifest entries into Avro-format manifest files. If the write affects only a single partition, it may create one new manifest. If it touches many partitions, it may create multiple manifests. Existing manifests from previous snapshots that were not modified are carried forward by reference, not copied.

### Step 4: Create a Manifest List

A new manifest list (Avro) is created that references all manifests for this snapshot: the new manifests from Step 3 plus the unchanged manifests inherited from the previous snapshot. This manifest list represents the complete state of the table after this write.

### Step 5: Create New Metadata File

A new `metadata.json` file is written, containing the table schema, partition spec, properties, and the snapshot list. The new snapshot (pointing to the manifest list from Step 4) is appended to the list. The previous `metadata.json` remains in storage, unchanged.

### Step 6: Atomic Commit (The Pointer Swap)

The engine asks the [catalog](/posts/2026-04-29-iceberg-masterclass-07/) to update its pointer from the old `metadata.json` to the new one. This is a compare-and-swap operation: the catalog checks that the current pointer matches what the engine expects, and only then updates it.

**This is the exact moment the transaction commits.** Before the swap, readers see the old snapshot. After the swap, readers see the new snapshot. There is no in-between state.

## Why This Provides ACID Guarantees

![How ACID works through the atomic metadata pointer swap](/assets/images/2026/apache-iceberg-masterclass/atomic-commit-pointer-swap.png)

The pointer swap mechanism delivers all four ACID properties:

**Atomicity.** The entire write is visible or invisible. If the engine crashes after writing data files but before the pointer swap, the data files are orphans. They exist in storage but no metadata references them. Readers never see partial writes. A cleanup process (covered in [Part 10](/posts/2026-04-29-iceberg-masterclass-10/)) can remove these orphans later.

**Consistency.** The new `metadata.json` contains a valid schema, valid partition specs, and consistent statistics. The catalog only accepts the swap if the metadata file is well-formed.

**Isolation.** Readers load a specific snapshot and operate on it for the duration of their query. Even if a new snapshot is committed while they are reading, their query continues to see the snapshot they started with. This is snapshot isolation, and it happens naturally because each snapshot is immutable.

**Durability.** Once the catalog confirms the pointer swap, the new state is persisted. The metadata file and all data files are already in durable object storage. The catalog's own persistence layer (a database for [REST catalogs](https://www.dremio.com/blog/what-is-the-iceberg-rest-catalog/), a metastore for Hive) provides the durability guarantee for the pointer itself.

## Concurrent Writes: Optimistic Concurrency Control

![How two concurrent writers are resolved through optimistic concurrency with retry on conflict](/assets/images/2026/apache-iceberg-masterclass/concurrent-write-conflict.png)

When two engines write to the same table simultaneously, Iceberg uses optimistic concurrency control (OCC):

1. **Both writers read the current metadata** (say `v1.metadata.json`) and begin their writes independently.

2. **Writer A finishes first** and successfully swaps the catalog pointer from `v1` to `v2`.

3. **Writer B attempts to commit** by swapping from `v1` to `v3`. The catalog detects that the current pointer is `v2`, not `v1`. The swap fails.

4. **Writer B retries.** It reads `v2.metadata.json` and checks whether its changes conflict with Writer A's changes:

   - **No conflict (different partitions):** Writer B's new files affect partition `region=west`, and Writer A's changes affected `region=east`. The changes are compatible. Writer B rebases its manifest list to include Writer A's manifests and creates a new `v3.metadata.json` that reflects both writes. The swap from `v2` to `v3` succeeds.

   - **Conflict (same files modified):** Both writers modified the same data files (e.g., both deleted rows from the same file). The changes cannot be automatically merged. Writer B's operation fails with a conflict error.

This model works well for append-heavy workloads (multiple jobs writing to different partitions), which is the dominant pattern in data lakes. [Dremio](https://www.dremio.com/blog/compaction-in-apache-iceberg-fine-tuning-your-iceberg-tables-data-files/) handles concurrent writes and automatic retries through its engine, and its [Open Catalog](https://www.dremio.com/platform/open-catalog/) provides the atomic compare-and-swap through the REST catalog protocol.

## Delete and Update Operations

Iceberg supports three strategies for modifying existing rows:

### Copy-on-Write (COW)

The engine reads the affected data files, removes or modifies the target rows, and writes entirely new files containing the result. The old files are removed from the manifest (marked as deleted), and the new files are added. This is simple but expensive for large files when only a few rows change.

### Merge-on-Read (MOR) with Position Delete Files

Instead of rewriting data files, the engine writes a small "position delete file" that lists the file path and row positions of deleted rows. At read time, the engine reads both the data file and the delete file, filtering out deleted rows during scan. This makes writes fast but adds read-time overhead.

### Merge-on-Read with Deletion Vectors (Iceberg v2+)

Deletion vectors are a compact bitmap representation of deleted rows within a file. They are more storage-efficient than position delete files and faster to evaluate during reads. Engines like [Dremio](https://www.dremio.com/blog/apache-iceberg-101-your-guide-to-learning-apache-iceberg-concepts-and-practices/) and Spark use deletion vectors for row-level updates in production.

| Strategy         | Write Cost              | Read Cost                 | Best For                   |
| ---------------- | ----------------------- | ------------------------- | -------------------------- |
| Copy-on-Write    | High (rewrite files)    | Low (clean files)         | Infrequent bulk updates    |
| Position Deletes | Low (small delete file) | Medium (merge at read)    | Frequent targeted deletes  |
| Deletion Vectors | Low (compact bitmap)    | Low-Medium (bitmap check) | High-frequency row updates |

## What Happens to Old Data?

After a commit, the previous snapshot's data files are not deleted. They remain in storage and are referenced by the old snapshot. This enables:

- **Time travel**: Query the table as of any retained snapshot
- **Rollback**: Revert the table to a previous snapshot if a bad write is detected
- **Incremental reads**: Process only the files that changed between two snapshots

Eventually, old snapshots are expired (removed from the metadata) and their orphan files are cleaned up. This maintenance is covered in [Part 10](/posts/2026-04-29-iceberg-masterclass-10/).

## The Catalog's Role in Commits

The catalog is the gatekeeper of consistency. Without a catalog providing atomic compare-and-swap, concurrent writers could overwrite each other's commits. The choice of catalog affects write reliability:

- **REST catalogs** ([Dremio Open Catalog](https://www.dremio.com/platform/open-catalog/), Polaris) provide server-side CAS operations
- **Hive Metastore** uses database-level locking for CAS
- **AWS Glue** provides CAS through its API
- **Hadoop Filesystem** catalogs use file-system rename atomicity (less reliable on object storage)

[Part 7](/posts/2026-04-29-iceberg-masterclass-07/) covers the catalog landscape in detail.

### Books to Go Deeper

- [Architecting the Apache Iceberg Lakehouse](https://www.amazon.com/Architecting-Apache-Iceberg-Lakehouse-open-source/dp/1633435105/) by Alex Merced (Manning)
- [Lakehouses with Apache Iceberg: Agentic Hands-on](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands-ebook/dp/B0GQL4QNRT/) by Alex Merced
- [Constructing Context: Semantics, Agents, and Embeddings](https://www.amazon.com/Constructing-Context-Semantics-Agents-Embeddings/dp/B0GSHRZNZ5/) by Alex Merced
- [Apache Iceberg & Agentic AI: Connecting Structured Data](https://www.amazon.com/Apache-Iceberg-Agentic-Connecting-Structured/dp/B0GW2WF4PX/) by Alex Merced
- [Open Source Lakehouse: Architecting Analytical Systems](https://www.amazon.com/Open-Source-Lakehouse-Architecting-Analytical/dp/B0GW595MVL/) by Alex Merced

### Free Resources

- [FREE - Apache Iceberg: The Definitive Guide](https://drmevn.fyi/linkpageiceberg)
- [FREE - Apache Polaris: The Definitive Guide](https://drmevn.fyi/linkpagepolaris)
- [FREE - Agentic AI for Dummies](https://hello.dremio.com/wp-resources-agentic-ai-for-dummies-reg.html?utm_source=link_page&utm_medium=influencer&utm_campaign=iceberg&utm_term=qr-link-list-04-07-2026&utm_content=alexmerced)
- [FREE - Leverage Federation, The Semantic Layer and the Lakehouse for Agentic AI](https://hello.dremio.com/wp-resources-agentic-analytics-guide-reg.html?utm_source=link_page&utm_medium=influencer&utm_campaign=iceberg&utm_term=qr-link-list-04-07-2026&utm_content=alexmerced)
- [FREE with Survey - Understanding and Getting Hands-on with Apache Iceberg in 100 Pages](https://forms.gle/xdsun6JiRvFY9rB36)
