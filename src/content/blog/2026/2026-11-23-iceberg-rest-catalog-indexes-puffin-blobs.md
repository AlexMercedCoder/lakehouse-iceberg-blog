---
title: "Indexes in the Iceberg REST Catalog: Table-Nested Endpoints and Pluggable Puffin Blobs"
description: "Two Apache Iceberg proposals for secondary indexes: REST routes nested under each table, and pluggable Puffin blob types with delete and compaction rules."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Apache Iceberg"
tags:
  - Apache Iceberg
  - REST catalog
  - secondary indexes
  - Puffin
  - spec proposals
slug: "iceberg-rest-catalog-indexes-puffin-blobs"
draft: false
canonicalURL: https://datalakehousehub.com/blog/iceberg-rest-catalog-indexes-puffin-blobs/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/iceberg-rest-catalog-indexes-puffin-blobs/).

Iceberg is designing secondary indexes in two places at once. An October 29, 2026 summary proposes REST routes nested under each table at /tables/{table}/indexes. A November 2 proposal adds pluggable Puffin blob types that declare how each index behaves under deletes and compaction. Together they define where indexes are listed and how they stay valid.

Picture a table with a few billion rows and a `user_id` column that nobody partitions on. A change-data-capture job needs to find fifty specific users so it can apply updates. The planner has partition values and per-file min and max statistics, and neither helps. Every file's `user_id` range spans most of the key space, so every file survives pruning. The job opens thousands of Parquet footers to find rows that live in a handful of files.

Now add an index for that lookup. A week later, a compaction job rewrites half the table. Some index entries now point at files that no longer exist. No standard catalog call lists the index. An engine that has never heard of it runs orphan file cleanup and deletes it.

Those problems are the subject of two threads on the Apache Iceberg dev list this fall. Both are proposals. Neither is part of a released spec as of November 23, 2026, and both are still being reviewed. I will separate what ships today from what is proposed at every step, because mixing the two is how teams end up building against an API that changes under them.

## Why Table Formats Are Adding Indexes Now

Iceberg already prunes data well when the query matches the table's layout. Partition transforms remove whole partitions. Manifest-level column bounds remove files whose min and max range excludes the predicate. Inside each Parquet file, row group statistics and page indexes cut reads further, which I covered in [Parquet Page Indexes and the Last Mile of Pruning](https://iceberglakehouse.com/posts/parquet-page-index-pruning-iceberg/).

All of that pruning depends on correlation between the predicate column and the physical layout. When the column is a high-cardinality key with no relationship to how files were written, min and max bounds stop excluding anything. A random UUID column has bounds close to the full UUID range in every file. Pruning collapses to a full scan of the file list.

The community has a v4 secondary index specification under review in apache/iceberg pull request 16961, with REST endpoints in pull request 16963. The sync summaries on the dev list describe its structure. An index has its own metadata file. Each index snapshot (the summaries call it an extract) points to a tracking file, which lists region files, much like a manifest lists data files. Region files hold the index rows, sorted by index keys. The defined index type is `scalar`, and an early summary named equality deletes as the primary use case the group was targeting. For broader context on what else is moving in v4, see [The State of Apache Iceberg v4 in July 2026](https://iceberglakehouse.com/posts/iceberg-v4-state-july-2026/).

Indexes belong in the format for interoperability. An index that only one engine can read is a private cache. An index described in the format and listed by the catalog is a shared asset that any compliant engine can use or safely ignore. The REST routes decide how an engine finds an index. The Puffin blob proposal decides whether an engine can still trust it.

## What Puffin Holds Today

Puffin is Iceberg's container for information that does not fit in a manifest, such as statistics and indexes. I walked through the file layout and both existing blob types in [Inside the Puffin File Format](https://iceberglakehouse.com/posts/inside-the-puffin-file-format/), and the [Iceberg Puffin Files](https://iceberglakehouse.com/iceberg/iceberg-puffin-files/) knowledge base entry covers the basics. Here I only need the parts the new proposal builds on.

A Puffin file is a magic number, a sequence of blobs, and a JSON footer. The footer lists each blob's metadata. According to the [Puffin spec](https://iceberg.apache.org/puffin-spec/), each `BlobMetadata` entry has a required `type`, a `fields` list of field IDs, a `snapshot-id`, a `sequence-number`, an `offset` and a `length`. It also has an optional `compression-codec` and an optional `properties` map whose values are strings.

The spec defines two blob types:

- `apache-datasketches-theta-v1` holds a Theta sketch for estimating distinct values, with an optional `ndv` property.
- `deletion-vector-v1` holds a Roaring bitmap of deleted row positions for one data file.

The deletion vector is the important precedent. Its `properties` must include `referenced-data-file`, set to the data file's location in table metadata. Its `snapshot-id` and `sequence-number` must be set to -1, because the writer does not know them when it creates the Puffin file. That makes a deletion vector a blob whose life is tied to one data file rather than to one snapshot.

Theta sketches take the other route. They live in statistics files that table metadata lists per snapshot, so a compaction leaves them behind on the old snapshot.

Nothing in the spec tells an engine what an unfamiliar blob type means, how it reacts to deletes, or what a compactor owes it. The Alex Cruise proposal starts from that gap.

## Table-Nested Routes vs. Namespace-Level Routes

The REST catalog spec already has a clear pattern for resources that belong to one table. They hang off the table path. The current OpenAPI document defines `/v1/{prefix}/namespaces/{namespace}/tables/{table}/plan`, `/credentials` and `/metrics`, among others. The [Iceberg REST Catalog API Endpoints](https://iceberglakehouse.com/iceberg/iceberg-rest-catalog-api/) reference lists the full set, and the [Iceberg REST Catalog](https://iceberglakehouse.com/iceberg/iceberg-rest-catalog/) entry explains the protocol itself.

The first draft of the index REST spec put index routes at the namespace level instead. At the October 26 index sync, the group called that the main open question. Huaxin Gao's October 27 summary noted that prior art differs, and Huaxin took an action item to research how databases and REST APIs model, list and name indexes.

The follow-up, posted to the list on October 29, is the news hook for this article. Huaxin grouped the findings into three questions.

**Where an index lives.** Catalog and REST APIs scope indexes to the table, and none of the surveyed ones makes an index a top-level namespace object. Lance uses `/v1/table/{id}/index/{index_name}`, and Firestore also puts the index under the table in the URL. Glue addresses an index with database name, table name and index name. Hive Metastore exposes `get_indexes(db, tbl)`. SQL databases split. MySQL, SQL Server, Snowflake and BigQuery make index names unique per table. Postgres, Oracle and SQLite treat an index as a schema object, though Postgres always creates the index in its table's schema.

**Listing across tables.** Most SQL databases also let you list indexes across tables, separately from where an index lives. Snowflake has `SHOW INDEXES IN SCHEMA`, `DATABASE` and `ACCOUNT`. MySQL exposes `information_schema.STATISTICS` and Postgres exposes `pg_indexes`. Those views cover the maintenance case of finding every index in a schema without walking table by table.

**Rename.** MySQL, SQL Server, Postgres and Oracle support renaming an index, mostly for naming cleanup and migration tools. Glue, Lance, Firestore and BigQuery do not. Huaxin read that as support for leaving rename out of the first version.

From that research came a three-part proposal:

1. Nest index routes under the table at `/v1/{prefix}/namespaces/{namespace}/tables/{table}/indexes[/{index}]`.
2. Make index names unique per table, so an index identifier is the table identifier plus the index name.
3. Add a second, optional endpoint, `GET /v1/{prefix}/namespaces/{namespace}/indexes`, that lists every index in a namespace. Each entry returns the index name and the table it belongs to. Catalogs do not have to support it.

The optional listing endpoint is the interesting design choice. It splits two concerns that SQL databases also split. Addressing an index always goes through its table. Discovering indexes for maintenance goes through the namespace. A catalog that does not want to build a namespace-wide index view can skip the endpoint, and clients fall back to walking tables.

Daniel Weeks replied the same day with a +1, writing that approaches to managing indexes vary across implementations but the proposal fits best with Iceberg and the REST spec. On November 4, Péter Váry, who drives the index spec, said he slightly preferred nesting under the table because it matches how indexes are used today. He had moved routes to the namespace level only because he thought he was the lone voice for nesting. He named one drawback. Multi-table indexes become awkward under a table path. He judged them unlikely and said the group can revisit the structure if needed.

The November 9 sync settled the question for the current draft. Huaxin's November 10 summary lists the nested routes, per-table unique names, and the optional namespace listing as agreed. Pull request 16963 is being updated to match. Agreement at a sync is not a merged spec, so treat these paths as the direction of the draft, not a published contract.

## The Agreed Rule: An Index Lives in Its Table's Namespace

Before the route debate, the group had already settled a simpler rule. The October 27 summary records it as agreed: an index must be in the same namespace as its table. Cross-namespace indexes were dropped from the design.

That rule does quiet work. An index in a different namespace from its table forces a catalog to handle a caller who can see one namespace but not the other. Keeping them together removes that case.

The same sync left rename and register out of the first version to reduce complexity. The summary says both can come later if users ask for them.

The November 10 summary added the lifecycle rules that follow from nesting:

- Indexes are sub-resources of their table.
- Renaming a table moves its indexes with it.
- Dropping a table drops its indexes. The catalog decides how it removes them.
- Multi-table indexes are out of scope.

Authorization got one explicit sentence. The spec does not define how catalogs authorize index access. The group did agree that the spec's read restrictions section should state that read restrictions apply whether a client reads the table, the index, or both. An index must never expose data the caller cannot otherwise see. A scalar index stores indexed values next to row identity columns, so this rule keeps the index from leaking keys that row-level filters hide.

One question stayed open after November 9: whether `loadTable` returns indexes. Returning them with the table saves a round trip when an engine loads the table to read it. Most loads, such as catalog federation and UI browsing, do not need full index metadata, and building it on every load adds cost. The options on the table were to return indexes by default, return them only when the client asks (possibly with just names by default), or distinguish read-path loads from metadata-only loads. Clients that do not understand indexes can ignore the extra field in any of those designs.

## What You Can Run Today, and What Is Only Proposed

No index endpoint exists in the published REST spec yet. What does exist is the path Puffin statistics take into a table through the catalog. It is worth walking through, because both proposals react to its limits.

The first step uses a shipped Spark procedure. `compute_table_stats` computes distinct-value statistics as Theta sketches and writes them to a Puffin file.

```sql
-- Shipped: Spark procedure in Apache Iceberg
CALL catalog_name.system.compute_table_stats(
  table => 'db.orders',
  columns => array('customer_id', 'sku')
);
```

The procedure returns a `statistics_file` path. By default it uses the current snapshot and all top-level primitive columns. Passing `columns` limits the work to the columns you name, and `snapshot_id` targets an older snapshot.

The second step is how a statistics file gets attached to table metadata through a REST catalog. A client posts a `CommitTableRequest` to the existing table route with a `set-statistics` update. The field names below come from the REST catalog OpenAPI document.

```json
POST /v1/{prefix}/namespaces/db/tables/orders

{
  "requirements": [
    { "type": "assert-ref-snapshot-id", "ref": "main", "snapshot-id": 8411205937311021 }
  ],
  "updates": [
    {
      "action": "set-statistics",
      "statistics": {
        "snapshot-id": 8411205937311021,
        "statistics-path": "s3://bucket/warehouse/db/orders/metadata/stats-8411205937311021.puffin",
        "file-size-in-bytes": 41208,
        "file-footer-size-in-bytes": 1290,
        "blob-metadata": [
          {
            "type": "apache-datasketches-theta-v1",
            "snapshot-id": 8411205937311021,
            "sequence-number": 57,
            "fields": [3],
            "properties": { "ndv": "1840221" }
          }
        ]
      }
    }
  ]
}
```

Read it from the inside out. Each `blob-metadata` entry mirrors a Puffin footer entry, with the required `type`, `snapshot-id`, `sequence-number` and `fields`. The `properties` values are strings, which is why `ndv` is quoted. The wrapping `statistics` object names the Puffin file, its size, and its footer size, so a reader can fetch the footer without scanning. The `requirements` array guards the commit. The catalog rejects it if `main` no longer points at the expected snapshot. The snapshot IDs, paths and sizes here are illustrative values, not output from a real table.

Notice two things. The statistics file is keyed to one snapshot, so a compaction commit leaves the new snapshot with no statistics at all. And attaching it is a table commit, which competes with every writer to the table.

The proposed index routes take a different shape. As of the November 10 summary, the draft paths look like this:

```text
# Proposed in apache/iceberg PR 16963 (under review, not released)
/v1/{prefix}/namespaces/{namespace}/tables/{table}/indexes
/v1/{prefix}/namespaces/{namespace}/tables/{table}/indexes/{index}

# Proposed optional maintenance listing (catalogs need not support it)
GET /v1/{prefix}/namespaces/{namespace}/indexes
```

I left out verbs and bodies for these routes on purpose. The dev list emails describe only the paths and the listing behavior. Until pull request 16963 merges, any request body you see in a blog post is a guess.

The contrast explains why the index spec keeps index metadata out of table metadata. An index commit through its own route does not compete with data writers. Alex Cruise's proposal makes the same choice for a different kind of index, and it adds rules about what happens to that index when the data under it changes.

## Pluggable Blob Metadata: Configuration, Scope, Delete and Compaction Behavior

On November 2, Alex Cruise opened a `[DISCUSS]` thread titled "Pluggable Puffin blob types and a compaction-aware lifecycle for data-file-scoped indexes." The full design lives in a long document in his `iceberg-indexing-ecosystem` repository, dated November 1 and marked as a draft for discussion. The document states that nothing in it is accepted Iceberg behavior. Its identifiers, property keys and class names are placeholders. Read every name below in that light.

His motivation is what he calls progressive indexing. Weeks or months after a file is written, you learn that a different index speeds up reads. Rewriting large, old files to add it is a non-starter. A Puffin blob added next to the file sidesteps the rewrite. Once anyone can add any index type, the ecosystem needs guardrails, and the email frames this proposal as that prerequisite.

The design rests on one promise. The worst a blob can do is make a query slower. An unknown type, an unreadable configuration, a corrupt payload, or a blob dropped by an unaware compactor all fall back to the plain scan. The query answer stays the same.

The document proposes five additions to the format.

**1. Namespaced type identifiers.** A blob type becomes a string with a reverse-DNS namespace and the major version built in, such as `com.example.f16-presence-v1`. Identifiers without a namespace stay reserved for types the Iceberg spec defines, so the two existing types keep their names. An incompatible change requires a new major version, which old readers treat as an unknown type and ignore. A two-tier registry lists spec-defined types in the Puffin spec and third-party types in a community file in the Iceberg repository, with additions by pull request under lazy consensus.

**2. A machine-readable descriptor per type.** This is a small JSON document that tells an engine how a type behaves without decoding it. The proposed fields include `scope` (what the blob is bound to), `compaction` (what a rewrite owes it), `merge-precision`, `deletes` (how row deletes change its meaning), `inference` (what a reader is allowed to conclude), `compression`, and `config` (its build-configuration contract).

**3. Data-file-scoped blobs.** This generalizes the deletion vector binding. A data-file-scoped blob sets `snapshot-id` and `sequence-number` to -1 and names one data file in `referenced-data-file`. It is valid for a snapshot if and only if that data file is live in the snapshot. One blob serves every snapshot that contains its file, with no rebuild after unrelated commits.

**4. Build configuration references.** Every blob records a digest of the configuration it was built under, in a reserved `config-digest` property. A reader resolves that configuration from an in-band blob in the same Puffin file or from a shared store, and evaluates the blob under it. If the configuration cannot be resolved, the reader does not use the blob. A table property lists revoked digests, so one metadata commit takes every blob built under a bad configuration out of service.

**5. Candidate compaction text.** Each type declares one of four compaction modes, and a rewrite must honor it.

The proposal's own example descriptor, for a character n-gram Bloom filter over a string column, shows how the pieces fit:

```json
{
  "type": "com.example.ngram-bloom-v1",
  "title": "Character n-gram Bloom filter",
  "definition": "https://example.com/specs/ngram-bloom-v1",
  "scope": "data-file",
  "input-fields": { "count": 1, "types": ["string"] },
  "properties": {},
  "compaction": "merge",
  "merge-precision": "exact",
  "deletes": "conservative",
  "compression": ["none", "zstd"],
  "config": {
    "schema": "https://example.com/specs/ngram-bloom-v1/config.schema.json",
    "schema-digest": "sha-256:c0ffee1a9b8c7d6e5f40312233445566778899aabbccddeeff00112233445566",
    "evaluation": [
      "normalization",
      "unicode-version",
      "gram-length",
      "hash",
      "seed",
      "hash-count"
    ],
    "composition": [
      "normalization",
      "unicode-version",
      "gram-length",
      "hash",
      "seed",
      "hash-count",
      "bits"
    ]
  }
}
```

This block is proposed, not shipped. No Iceberg release reads descriptors. The `scope` of `data-file` binds each blob to one file. The `compaction` mode of `merge` with `exact` precision says two filters built with identical hashing and size combine by bitwise OR into the same filter a rebuild produces. The `deletes` value of `conservative` says deleted rows only add false positives, so the filter stays safe. The `evaluation` list names the settings a reader must reproduce to probe the filter. The `composition` list adds `bits`, because two filters of different sizes cannot be merged.

The configuration record exists to stop silent wrong answers, and the document gives a sharp example. Suppose a filter was built with no normalization, and a reader assumes case folding. It folds the literal `'ABC-100'` to `'abc-100'`, finds those grams missing, and skips a file that holds the row. That is a wrong answer, not a slow one. Making the configuration mandatory for this type, and refusing to guess, closes that hole.

The four compaction modes, as drafted:

| Mode      | What a rewrite does with an input's blob                                              |
| --------- | ------------------------------------------------------------------------------------- |
| `drop`    | Produces no blob of this type for any output                                          |
| `rebuild` | Is allowed to compute a fresh blob from the output data                               |
| `merge`   | Composes the sources' blobs when their composition settings agree, otherwise rebuilds |
| `retain`  | Leaves the blob alone, for scopes other than `data-file` only                         |

One rule ties the table together. A writer with no implementation of a blob type treats it as `drop`. That matches what every compactor already does today, so an unaware engine stays correct. It just destroys coverage. The document is blunt about that cost. In a fleet of mixed engines, coverage is whatever a background indexer rebuilds between rewrites.

The document also covers how readers find these blobs. It describes a discovery chain outside table metadata, rooted at a location named by a table property and kept away from the table location so orphan cleanup never lists it. It leaves the final choice open, and it suggests hosting file-scoped blobs as a second index type under the v4 index specification. The draft says plainly that this hosting idea had not yet been put to the index spec's authors.

## Negative Filter Indexes vs. the v4 Scalar Index

The Cruise email calls the two designs complementary, with significant overlap in scope. The difference he draws is the direction of the inference each index supports, and it is the single most useful idea to take from either thread.

A **negative** index can only say "this file has no matching rows." Bloom filters, n-gram filters, presence maps and zone maps all work this way. If a negative index is stale, it costs efficiency and nothing else. A file that holds no match gets scanned anyway. The answer stays right.

A **positive** index says "the matching rows are here." The v4 `scalar` index is positive. A reader that finds no entry for a key concludes the key does not exist and skips the scan. That conclusion only holds if the index describes exactly the rows of the snapshot being read. A stale positive index returns wrong results, not slow ones. That is why the index spec pins each extract to one snapshot of the source table, and why the Cruise document says much more care is needed to keep mutations from corrupting a positive index.

Staleness means different things in the two designs:

- **Row deletes.** Deleting rows from a file cannot break a negative filter, because fewer rows cannot match a predicate that no row matched. The filter just admits a few more files than it needs to. For a positive index, the reader has to reconcile deletes or stop trusting it.
- **Late builds.** A negative blob built months after its file was written is exactly as correct as one built at write time, because the file never changed. That is what makes progressive indexing possible.
- **Compaction.** A rewrite replaces every file. A file-scoped blob for a replaced file simply stops being valid, since its file is no longer live. A table-wide positive index now points at files and positions that are gone. The Cruise document reports that the spec's Spark reference implementation, pull request 18187, declines to use an index when any non-append snapshot sits between the extract's snapshot and the snapshot being read. That is the safe, coarse answer for a table-wide positive structure.

The document adds a nuance. It argues the deeper split is scope, not direction. A table-wide structure must be pinned to a snapshot, while a structure for one immutable file stays valid while the file is live. So the draft admits per-file "locating" and "aggregating" blobs under extra rules, though it leans toward leaving them out of a first version.

The two cost shapes suit different jobs. The Cruise document says so directly, and I agree with its split.

- A change-data-capture merge that looks up fifty keys across the table, or an erasure request that must find every row for a few customers, wants the scalar index. One region file read and no false positives beat fifty probes into per-file Bloom filters, where each extra key gives every file another chance to pass.
- Files that live only minutes before compaction, and columns whose predicates have drifted toward ranges or substrings, are where a per-file filter built later is the only index that will ever exist. No key index serves `LIKE '%abcd%'`.

## Open Questions to Watch

Both threads are live. Here is what I am tracking, without guessing at outcomes.

**Indexes in `loadTable`.** The November 9 sync left this open. The answer decides whether a read-path engine gets index metadata for free or pays an extra round trip, and whether federation and UI calls pay for metadata they never use.

**Table maintenance and reachability.** The Cruise document's strongest warning applies to both designs. Orphan file removal deletes files under the table location that it cannot reach from structures it knows how to read. Index files listed only through the catalog, or only through a new structure, look like orphans to an older engine. The document argues the fix is cheapest before v4 is published, and proposes a list of index roots in v4 table metadata so maintenance knows to spare them. That proposal has not been agreed.

**Catalogs without index endpoints.** The v4 index spec leaves discovery to the catalog. In practice that means REST catalogs that implement pull request 16963. The Cruise document points out that Hive Metastore, AWS Glue and JDBC catalogs have no such path, and that the spec's review has not yet weighed that trade.

**A liveness mode for extracts.** Hosting per-file blobs under the index spec needs extracts whose validity follows data file liveness rather than a snapshot. The idea is in the draft. The index spec authors have not responded to it on the list.

**Encryption and governance.** The index spec requires index files to be encrypted when the source snapshot is. The Puffin draft has no encryption story yet, and an n-gram filter over a string column leaks real information about that column. Where the community blob registry lives, and who governs it, is also open.

## Conclusion

The two threads answer different halves of one question. The REST work decides where an index is addressed: under its table, in its table's namespace, with a lifecycle that follows the table and an optional namespace listing for maintenance. The Puffin work decides when a blob can be trusted: bound to one data file, built under a recorded configuration, with a declared compaction mode and a rule that an unknown type drops safely.

If you run Iceberg today, nothing here changes your tables yet. Use Puffin statistics and Parquet page indexes for pruning, and watch pull requests 16961 and 16963 plus the Cruise discussion. When you evaluate any index feature from any engine, ask one question first. Is the index negative or positive? The answer tells you what staleness will cost you.

## Keep Going

If this piece was useful, I have written a lot more on Apache Iceberg table internals. _Apache Iceberg: The Definitive Guide_ (O'Reilly) covers the metadata structures, catalogs and maintenance operations these proposals build on. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [dev@iceberg: Dedicated sync for Iceberg Index Support (Huaxin Gao, October 29, 2026, and replies)](https://lists.apache.org/thread/lgzcj734x9fopo2t6fnx5pb1lgc8jbr4)
- [dev@iceberg: Pluggable Puffin blob types and a compaction-aware lifecycle for data-file-scoped indexes (Alex Cruise, November 2, 2026)](https://lists.apache.org/thread/sl67qzcqqnqpdk25c90wq7xyqfq1ogmy)
- [Pluggable Puffin Blob Types and a Compaction-Aware Blob Lifecycle (draft proposal)](https://github.com/acruise/iceberg-indexing-ecosystem/blob/main/docs/proposals/puffin-blob-types-and-compaction.md)
- [Apache Iceberg Puffin spec](https://iceberg.apache.org/puffin-spec/)
- [Apache Iceberg REST catalog OpenAPI spec](https://github.com/apache/iceberg/blob/main/open-api/rest-catalog-open-api.yaml)
- [Apache Iceberg Spark procedures: compute_table_stats](https://iceberg.apache.org/docs/latest/spark-procedures/)
