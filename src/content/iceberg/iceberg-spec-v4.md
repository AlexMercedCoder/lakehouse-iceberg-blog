---
term: "Apache Iceberg Spec v4 (Current State)"
description: "Apache Iceberg Spec v4 is in early community discussion and proposal stages as of 2025, with potential features including extended geospatial capabilities, enhanced variant type operations, improved row lineage, catalog-level transaction semantics, and multi-table ACID operations: building on the Spec v3 foundation."
category: "Core Concepts"
relatedTerms:
  - "iceberg-spec-v3"
  - "iceberg-spec-v1-vs-v2"
  - "iceberg-table-format"
  - "iceberg-concurrent-writes"
  - "what-is-apache-iceberg"
keywords:
  - iceberg spec v4
  - iceberg format version 4
  - iceberg v4 roadmap
  - iceberg future features
  - iceberg community roadmap
lastUpdated: 2026-05-14
---

## Apache Iceberg Spec v4: Current State

**Apache Iceberg Spec v4** represents the next horizon of the Iceberg format specification, with early discussions, proposals, and design explorations happening in the Apache Iceberg community in 2025. As of now, Spec v4 is **not formally released or finalized**: it exists in the form of design documents, GitHub issues, community discussions, and early-stage proposals (IEPs: Iceberg Enhancement Proposals).

Understanding what's being discussed for Spec v4 is valuable for architects planning long-term lakehouse strategies and for teams tracking where the Iceberg ecosystem is heading.

> **Important context**: Spec v3 itself is still being broadly adopted across engines as of 2025. Spec v4 features are exploratory and subject to significant change. Follow the [Apache Iceberg GitHub](https://github.com/apache/iceberg) and the community mailing lists for the most current status.

## What Spec v3 Established (The Foundation for v4)

Before discussing v4, it's important to understand what Spec v3 delivered:

- **Deletion vectors**: Compact bitmap-based row deletion (replacing positional delete files).
- **Variant type**: Semi-structured data storage with Parquet shredding.
- **Geometry types**: Native geospatial data types.
- **Row lineage**: Persistent row IDs across compaction.
- **Type widening**: Metadata-only type promotions.
- **Default column values**: Required column additions without rewrites.

Spec v4 discussions start from this foundation and address capabilities that v3 didn't fully solve.

## Areas Being Discussed for Spec v4

### 1. Multi-Table Transactions

One of the most requested capabilities in the Iceberg community: **atomic commits across multiple tables**. Currently, each Iceberg table has its own isolated snapshot: there's no mechanism to atomically commit to tables A, B, and C simultaneously with ACID guarantees.

Proposed approaches:

- **Catalog-level transaction log**: A shared transaction coordinator that orchestrates multi-table commits.
- **Integration with Nessie-style branching**: Extending Project Nessie's catalog-level branching into the Iceberg spec itself.
- **Two-phase commit protocol**: Engines coordinate a distributed commit that either succeeds for all tables or fails cleanly.

This would enable operations like "atomically move data from `staging.orders` to `prod.orders` and update `prod.order_summary` in one transaction."

### 2. Enhanced Variant Type Operations

Spec v3's Variant type provides storage; v4 discussions explore:

- **Partial update semantics for Variant columns**: `UPDATE` only a nested field within a Variant without replacing the entire value.
- **Variant indexing**: Puffin-based path indexes that enable efficient filtering on deeply nested Variant fields without full deserialization.
- **Schema inference and anchoring**: Tools to "promote" frequently-accessed Variant paths to typed columns.

### 3. Extended Geospatial Capabilities

Building on v3's geometry types:

- **Spatial indexes in Puffin**: R-tree or space-filling curve (Hilbert) indexes for efficient spatial range queries.
- **Spatial partitioning**: Native support for geohash or H3 spatial partition transforms.
- **Additional geometry operations**: Coverage types, topology relationships stored in metadata for query planning.

### 4. Improved Row Lineage

Spec v3 introduces row lineage tracking; v4 may formalize:

- **Row-level change propagation**: Using row IDs to precisely track which specific rows changed between snapshots (vs. file-level diff in v2).
- **Streaming CDC with row IDs**: Row IDs enable streaming consumers to deterministically identify changed rows without full re-scans.
- **Lineage across table merges**: Tracking row origin across `MERGE INTO` operations.

### 5. Catalog-Level Extensions to the Spec

Discussion around whether catalog behaviors (multi-catalog transactions, cross-catalog references) should be formalized in the Iceberg spec rather than being catalog-specific:

- **Catalog-spec for credential vending**: Standardizing credential vending beyond the REST Catalog spec.
- **Cross-catalog view references**: Views that span multiple catalog namespaces.
- **Catalog-level retention policies**: Standardized way to express snapshot retention in the spec (not just table properties).

### 6. Compute Statistics Integration

While Puffin already provides the blob format for statistics, v4 may formalize:

- **Standard statistics types**: Mandatory statistics (NDV, histograms) that all Spec v4-compliant writers must produce.
- **Column correlation statistics**: Multi-column correlation data for better join ordering.
- **Automatic statistics freshness tracking**: Metadata indicating when statistics were last computed and their confidence level.

## How to Track Spec v4 Progress

The Iceberg community uses several channels for spec evolution:

- **GitHub Issues and PRs**: [github.com/apache/iceberg](https://github.com/apache/iceberg): search for "spec-v4" or "IEP" labels.
- **Iceberg Enhancement Proposals (IEPs)**: Formal design proposals for significant changes.
- **Community mailing list**: `dev@iceberg.apache.org`: subscribe to track proposals in real time.
- **Iceberg Project Meetings**: Recorded community meetings where proposals are discussed.
- **Iceberg Summit and Data + AI Summit**: Annual conferences where Iceberg roadmap is presented.

## The Spec Evolution Philosophy

A key principle of the Iceberg spec governance:

1. **Backward compatibility**: Every new spec version must be able to read all previous versions.
2. **Engine negotiation**: Engines declare which spec version they support; tables can only be upgraded to versions all reading engines support.
3. **Community consensus**: Spec changes require broad community agreement: no single vendor controls the spec direction.

This governance model is what makes Iceberg uniquely trustworthy for long-term architecture decisions: no single vendor can unilaterally break compatibility or change the spec in ways that disadvantage others.

## Planning for Spec v4

For architects today:

1. **Adopt Spec v2 immediately**: The current production standard for all new tables.
2. **Plan for Spec v3**: Evaluate deletion vectors and Variant type for tables where these features provide clear value. Expect broad engine support in 2025–2026.
3. **Monitor Spec v4**: Follow community discussions for multi-table transaction proposals: this will be important when it arrives.
4. **Don't over-anticipate**: Build on what's stable (v2) and tested (v3 in progress) rather than waiting for v4 features that don't have committed timelines.
