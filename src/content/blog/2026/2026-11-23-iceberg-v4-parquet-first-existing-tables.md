---
title: "ORC and Avro Data Files in Iceberg v4: What a Parquet-First Spec Means for Existing Tables"
description: "The Iceberg dev list is debating whether v4 stops writing ORC and Avro data files. Here are the feature gaps, plus SQL to audit and migrate tables to Parquet."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Apache Iceberg"
tags:
  - Apache Iceberg
  - Parquet
  - ORC
  - Avro
  - format migration
slug: "iceberg-v4-parquet-first-existing-tables"
draft: false
canonicalURL: https://datalakehousehub.com/blog/iceberg-v4-parquet-first-existing-tables/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/iceberg-v4-parquet-first-existing-tables/).

A November 2, 2026 discussion asks whether Iceberg v4 should stop writing new ORC and Avro data files while existing files stay readable. The reason is feature gaps: ORC lacks default values, geo, variant and vector support, and Avro data files carry no column metrics. Tables that use either format need a rewrite plan.

Picture a table that has been running since 2021. Someone set `write.format.default` to `orc` because the Hive warehouse it replaced was all ORC, and the team wanted the same files and the same tooling. The table works. Nobody has thought about its file format in years. Then a product team asks for a `variant` column to hold semi-structured event payloads, and the write fails in Spark. Another team wants to turn on table encryption and finds that the ORC integration rejects encrypted files.

That table is the subject of this article. The Apache Iceberg dev list is now openly asking whether the next spec version should keep accepting new writes in ORC and Avro at all. No decision has been made, and nothing in this piece predicts one. What you can do today is find out which of your tables are exposed, understand which features they already cannot use under v3, and know the exact steps to move them to Parquet if and when you choose to.

## What the Thread Proposes, and What It Leaves Alone

On November 2, 2026, Kevin Liu opened a [DISCUSS] thread on the Iceberg dev list titled "Should V4 stop writing ORC and Avro data files?" ([dev@iceberg thread](https://lists.apache.org/thread/5jfzckl0cc9z683kz9vfv41pmhrm1tdb)). The thread follows an earlier dev list discussion about making v4 manifests Parquet-only. That earlier discussion is about metadata files. This one is about data files, the files that hold your rows.

The scope is narrow and worth reading carefully. The proposal covers new writes only. The thread states that existing ORC and Avro files in upgraded tables stay readable. Nobody is proposing that a v4 reader refuse to open an ORC file that a v2 writer produced in 2022. The question is whether a v4 writer keeps producing new ones.

Kevin framed four questions for the community:

1. Should v4 stop writing new ORC and Avro data files?
2. If v4 keeps them, what does "support" mean, given that some v3 features already do not work with them?
3. If v4 stops writing them, what bar does a format have to clear to become writable again in a later version?
4. Who uses ORC or Avro data files today, and how do they see those formats in v4 versus Parquet?

As of this writing, the thread holds the opening message and no replies. There is no vote, no pull request against the spec, and no change to the v4 draft. The [Iceberg table spec](https://iceberg.apache.org/spec/) itself says plainly that version 4 is under active development and has not been formally adopted. Treat everything below the status line as preparation, not as a reaction to a settled decision.

It also helps to be clear about what the proposal does not touch:

- **Reads of old files.** The thread is explicit that existing ORC and Avro data files remain readable after an upgrade.
- **Delete file formats.** Delete files have their own property, `write.delete.format.default`, and the thread does not discuss it.
- **Metadata files.** Manifests and manifest lists are a separate track. If you want the metadata side of the story, I covered the reasons behind columnar manifests in [Parquet-Only Manifests in Iceberg v4](https://iceberglakehouse.com/posts/parquet-manifests-iceberg-v4/), including the cost of row-oriented Avro metadata during scan planning.
- **v1, v2 and v3 tables.** A table stays on its format version until someone upgrades it. The proposal is about what a v4 table accepts on write.

The [Iceberg data files](https://iceberglakehouse.com/iceberg/iceberg-data-files/) reference page explains how a table tracks each file and records its format. That per-file record is what makes this proposal workable. Every data file entry in a manifest has a required `file_format` field, and the spec lists its values as `avro`, `orc`, `parquet` or `puffin`. A reader looks at that field and picks the right decoder for each file. A table with a mix of ORC and Parquet files is already a legal Iceberg table, and that is exactly the state a migrated table passes through.

## The Feature-Gap Table, Taken From the Thread

The strongest part of the proposal is a list. Kevin did not argue from taste. He pointed to Iceberg's own format test kit, the shared read tests in the Java `data` module (`ReadFormatModelTests`), which already records what each format cannot do. He then mapped each gap to the spec feature it blocks. Here is that list as a table. Every row comes from the thread, except the ORC metrics cell, which I checked in the Iceberg source.

| Feature                      | Spec version    | ORC data files                                                               | Avro data files                                     |
| ---------------------------- | --------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| Column default values        | v3              | Iceberg's ORC integration cannot read them                                   | Not listed as a gap                                 |
| Geometry and geography types | v3              | Iceberg's ORC integration cannot read or write them                          | Types are stored, but no bounding boxes for pruning |
| Variant type                 | v3              | Writes fail in Spark, and the pending fix turns the crash into a clear error | Not listed as a gap                                 |
| Variant shredding            | v3              | Not supported per the spec, so no variant bounds                             | Not supported per the spec, so no variant bounds    |
| Table encryption             | v3              | Iceberg's ORC integration rejects the encrypted files                        | Not listed as a gap                                 |
| Vector type                  | Proposed for v4 | Marked as not supported in the draft vector spec                             | Not listed as a gap                                 |
| Column metrics               | All versions    | Written (bounds and null counts)                                             | Only the row count (a TODO since 2021)              |

A few of these rows deserve more than a cell.

**ORC and v3 types.** Version 3 of the spec added nanosecond timestamps, the `unknown` type, `variant`, `geometry` and `geography`, along with column default values and table encryption keys. Of that list, ORC in Iceberg today misses default values, both geo types, working variant writes and encryption. A v3 table that writes ORC gets the version number without most of the new features.

**Variant shredding.** The spec's Appendix A, which covers format-specific requirements, says it directly: "Shredding is not supported in Avro" and "Shredding is not supported in ORC." Shredding is the technique that stores frequently seen fields inside a variant value as typed columns. Without it, a reader has to decode the whole variant blob to filter on one field, and the writer produces no per-field bounds for pruning. Parquet is the only one of the three where the spec defines a shredded variant encoding.

**Avro and metrics.** Iceberg's Avro data file writer does not collect per-column metrics. The thread links a TODO in `AvroMetrics.java` that has sat there since 2021, and the method returns a record count with every other metric set to null. Column metrics are the lower bounds, upper bounds, null counts and value counts stored in manifests. Engines use them to skip files during planning. An Avro data file with no metrics gets read whenever its partition matches. For geo columns, that means no bounding boxes for spatial pruning.

**A precedent from 2025.** The thread also points back to pull request #13060 from May 2025, which proposed validating file format compatibility for v3 tables. That pull request stated that "Parquet is currently the only file format that supports all the required capabilities for v3 compatibility." According to the thread, it was approved but never merged, and Avro has since closed some of those gaps, geo types among them. So the community has looked at this question before and chose not to enforce it at the v3 boundary. Kevin's second question follows from the table: keeping both formats in v4 means adding the proposed vector type to the list of things they cannot do.

## Why Upstream Activity Is Part of the Argument

A gap list on its own does not settle much. Gaps close when someone does the work. The second half of the thread asks who is doing that work, and the evidence points back at Iceberg's own contributors.

The thread summarizes the last 12 months of activity on each format project:

- **ORC.** The dev list carried release votes and administrative threads, with no technical discussion. The format specification has not changed since Gang added geo types in April 2025.
- **Avro.** The technical threads on the dev list were about language SDKs, not the format. Two questions about the format itself got no replies, including one about standardizing a vector type that came out of Iceberg's vector work. The specification has not changed since December 2024. The last Iceberg-driven changes were Fokko's nanosecond timestamps in December 2023 and fixed-size UUIDs in January 2024.
- **Parquet.** The dev list carried roughly 100 technical threads. The format added a FILE type, ALP encoding (in preview) and NaN counts, and a vector type is under discussion.

Kevin's reading is that both projects are maintained, but the features Iceberg needs are not being worked on upstream, so he does not expect the gaps to close on their own. That is a fair inference from the numbers he linked, and it is the part of the argument that matters most for planning. A feature gap with an active upstream is a timing problem. A feature gap with a quiet upstream is a permanent constraint unless your team is the one that fills it.

The vector type, still a draft for v4, is the first new type where the draft spec says ORC is out from the start.

ORC and Avro are good formats with long track records, and neither project is abandoned. The thread's claim is narrower and easier to check: the specific features Iceberg's spec now depends on have not landed upstream, and nobody outside the Iceberg community is pushing them.

## Auditing a Table's File Formats Through Metadata Tables

Before you plan anything, find out where ORC and Avro data files actually live. Table properties tell you what a table writes by default. They do not tell you what the table contains. A table created as ORC in 2021 and switched to Parquet in 2024 still holds every ORC file nobody rewrote. The reverse happens too. A job that passes a per-write format option produces ORC files in a table whose default says Parquet.

Iceberg exposes the truth through metadata tables, documented on the [Spark queries page](https://iceberg.apache.org/docs/latest/spark-queries/). In Spark, you query them by appending the metadata table name to the table identifier. The `files` table lists the current snapshot's data and delete files, `data_files` lists only data files, and `all_data_files` lists data files across every snapshot the table still tracks. Each row carries a `file_format` column with values such as `PARQUET`, `ORC` or `AVRO`, plus `record_count`, `file_size_in_bytes` and the `partition` struct.

Start with the shape of one table:

```sql
-- 1. What the current snapshot reads, by format
SELECT file_format,
       COUNT(*)                AS file_count,
       SUM(record_count)       AS row_count,
       SUM(file_size_in_bytes) AS total_bytes
FROM prod.db.events.data_files
GROUP BY file_format
ORDER BY total_bytes DESC;

-- 2. Where the non-Parquet files sit, by partition
SELECT partition,
       file_format,
       COUNT(*)                AS file_count,
       SUM(file_size_in_bytes) AS total_bytes
FROM prod.db.events.data_files
WHERE file_format <> 'PARQUET'
GROUP BY partition, file_format
ORDER BY total_bytes DESC;

-- 3. Files still referenced by older snapshots (time travel, branches, tags)
SELECT file_format,
       COUNT(DISTINCT file_path) AS file_count
FROM prod.db.events.all_data_files
GROUP BY file_format;

-- 4. Delete files, which have their own default format property
SELECT content, file_format, COUNT(*) AS file_count
FROM prod.db.events.delete_files
GROUP BY content, file_format;
```

Each query answers a different planning question.

**Query 1** gives the headline. If it returns one row and that row says `PARQUET`, the table is done, and you only need to confirm the default (more on that below). If it returns `ORC` or `AVRO` rows, the `total_bytes` column tells you how much data a rewrite has to read and write. That number drives cost more than the file count does.

**Query 2** tells you where the old files are. In a table whose default changed at some point, the non-Parquet files cluster in older partitions, because only new data picked up the new default. If most of the ORC bytes sit in partitions nobody queries, rewrite the hot range first and leave cold history for a later window. The `partition` column is a struct, and Spark groups by it directly.

**Query 3** catches files the current snapshot no longer reads but older snapshots still reference. After a migration, the current snapshot is all Parquet, while `all_data_files` still lists the ORC files until those snapshots expire. That is expected, and it is the reason to look at both tables.

**Query 4** separates delete files. The `content` column uses 0 for data, 1 for position deletes and 2 for equality deletes. The v4 thread is about data files, so treat this query as information, not as a migration target. It is still useful to know if a merge-on-read job is writing Avro or ORC delete files, because those follow `write.delete.format.default`, a different property from the one you change for data files.

Then check what the table will write next. In Spark SQL, `SHOW TBLPROPERTIES prod.db.events` lists the properties set on the table. The [Iceberg configuration docs](https://iceberg.apache.org/docs/latest/configuration/) define `write.format.default` with a default of `parquet` and allowed values `parquet`, `avro` or `orc`. If the property is absent, the table writes Parquet. If it says `orc` or `avro`, new files keep arriving in that format no matter how many times you compact.

The per-write override deserves a mention. The [Spark configuration docs](https://iceberg.apache.org/docs/latest/spark-configuration/) list a `write-format` write option, which defaults to the table's `write.format.default` and accepts the same three values. A pipeline that sets `write-format` to `orc` on its DataFrame writes ORC files into a table whose properties say Parquet. Query 1 is how you catch that. If ORC files keep appearing after you changed the property, search your job code for that option.

To run this across a whole catalog, loop over namespaces and tables in a small driver script (Spark's `SHOW NAMESPACES` and `SHOW TABLES` give you the list) and run query 1 against each. Write the results to a small audit table with columns for table name, format, file count, row count and bytes. Metadata tables read manifests, not data files, so each query is cheap next to a table scan. That audit table becomes your migration backlog, sorted by bytes.

## Migrating: Change the Default Write Format, Then Rewrite Data Files

Everything in this section uses syntax that ships in Iceberg today. None of it depends on the v4 proposal. Moving an ORC or Avro table to Parquet is a v1, v2 or v3 operation, and you can do it on your own schedule whatever the dev list decides.

The order matters. Change the default first, then rewrite. If you rewrite first, every new commit between the rewrite and the property change adds more ORC files, and the property change does nothing for files that already exist.

```sql
-- Step 1: new writes go to Parquet
ALTER TABLE prod.db.events SET TBLPROPERTIES (
    'write.format.default' = 'parquet'
);

-- Step 2: rewrite one range of partitions, forcing every file in it to be rewritten
CALL prod.system.rewrite_data_files(
    table   => 'db.events',
    where   => 'event_date >= "2026-01-01"',
    options => map(
        'rewrite-all', 'true',
        'partial-progress.enabled', 'true',
        'partial-progress.max-commits', '10'
    )
);

-- Step 3: confirm the current snapshot is all Parquet
SELECT file_format, COUNT(*) AS file_count
FROM prod.db.events.data_files
GROUP BY file_format;

-- Step 4: once the retention window allows, drop snapshots that reference old files
CALL prod.system.expire_snapshots(
    table      => 'db.events',
    older_than => TIMESTAMP '2026-12-01 00:00:00.000'
);
```

Here is what each part does and why it is set that way.

**Step 1** uses the `ALTER TABLE ... SET TBLPROPERTIES` syntax from the [Spark DDL docs](https://iceberg.apache.org/docs/latest/spark-ddl/). It changes table metadata only. No data moves. From the next commit on, writers that respect the table default produce Parquet. Writers that pass an explicit `write-format` option keep doing what they did, so fix those jobs in the same change window. `UNSET TBLPROPERTIES ('write.format.default')` has the same effect, because the documented default is `parquet`. I set it explicitly so the intent shows up in `SHOW TBLPROPERTIES`.

**Step 2** calls the `rewrite_data_files` procedure, documented on the [Spark procedures page](https://iceberg.apache.org/docs/latest/spark-procedures/). The procedure is built for compaction, so by default it only picks files that are too small, too large or carry too many deletes. A table full of well-sized ORC files passes those checks, and the procedure skips them. The `rewrite-all` option set to `true` overrides that selection and rewrites every file the call covers. The rewritten files come out through the table's normal write path, which now says Parquet.

The `where` argument narrows the rewrite to files whose partitions or column bounds overlap the predicate. It filters on data columns, not on `file_format`, so you cannot write `where => 'file_format = "ORC"'`. Use the partition ranges from audit query 2 instead. Rewriting partition range by partition range keeps each run bounded and lets you put the hot data first.

The two `partial-progress` options let the procedure commit groups of rewritten files before the whole job finishes. On a large table, a single giant commit is fragile. If the job fails at 95 percent, nothing lands. With partial progress on, completed groups commit as they finish, up to `partial-progress.max-commits` commits (the documented default is 10). A failed run leaves you with fewer ORC files than before, not the same number.

For big tables, `max-concurrent-file-group-rewrites` (default 5) controls parallelism, and `max-file-group-size-bytes` (default 100 GB) caps how much data one group handles. Switching `strategy` to `sort` with a `sort_order` reclusters data in the same pass, at the cost of a shuffle.

**Step 3** repeats audit query 1 against the current snapshot. The procedure returns `rewritten_data_files_count`, `added_data_files_count` and `rewritten_bytes_count`, and those numbers are a good first check. The metadata table is the real proof. Run it after each range. When the last range finishes, it returns a single `PARQUET` row.

**Step 4** cleans up. The `expire_snapshots` procedure removes snapshots older than `older_than` (the documented default is five days ago) and deletes data files that no remaining snapshot references. Until it runs, the ORC files stay on storage, and `all_data_files` still lists them. Pick the timestamp to match your time-travel and audit retention. Do not shorten retention just to finish a migration faster. If a branch or tag holds an old snapshot, its files stay, and that is the behavior you want.

### Rewrite cost, in plain terms

A format rewrite reads every byte of ORC or Avro data and writes the same rows back as Parquet. Use the `total_bytes` from audit query 1 as your budget. Each byte gets read once and written roughly once, and the Parquet output size depends on your compression codec and data shape, so measure the first range before you plan the rest.

Avro tables tend to get a pleasant surprise here. Because Iceberg's Avro writer stores no column metrics, the rewritten Parquet files are the first files in the table that carry min and max bounds for each column. Filters that used to scan every file in a matching partition start skipping files after the rewrite. For ORC tables the planning change is smaller, since Iceberg already writes metrics for ORC files, but the table becomes eligible for the v3 features in the gap table.

## What Breaks During a Format Migration

The mechanics above are simple. The failures come from everything around them.

**Readers that only speak one format.** Some tables have downstream consumers that bypass the Iceberg reader and open data files directly, for example a legacy Hive job pointed at the table's data directory or a script that lists files and parses them as ORC. Those consumers break the moment Parquet files appear. Search for them before Step 1, not after. Any consumer that reads through an Iceberg-aware engine handles a mixed table without trouble, because the engine picks a decoder per file from `file_format`.

**Writers that override the default.** As covered in the audit section, a job with an explicit `write-format` option keeps writing the old format. The symptom is an audit that never reaches zero. Fix the job, then rewrite the stragglers.

**Concurrent writes during the rewrite.** `rewrite_data_files` commits with Iceberg's normal optimistic concurrency. On tables with frequent streaming commits, rewrites of hot partitions conflict more often. Partial progress limits how much work a conflict throws away. Running the hot range during a quiet window limits how many conflicts happen.

**Storage doubling for a while.** Old files stay until `expire_snapshots` removes them. During the retention window, the table occupies the old bytes plus the new bytes. Budget for that rather than expiring early.

**Engine version skew.** A table you upgrade to v3 or, later, v4 needs readers and writers that understand that format version. That is a separate decision from the file format. Migrate the files on your current format version first, so any later upgrade is a smaller change.

If the ORC side of this is new territory for you, the [Apache Iceberg ORC Format](https://iceberglakehouse.com/iceberg/iceberg-orc-format/) reference page covers how ORC files appear in Iceberg tables and how ORC compares with Parquet for new tables.

## The Bar for Making a Format Writable Again

Kevin's third question asks what a format has to show to become writable again in a later version. Nobody has replied yet. What the thread does provide is the evidence behind the question, and that evidence points at two kinds of bar.

The first is **feature coverage**. The format test kit already lists, per format, which Iceberg capabilities fail. A plain reading of the proposal is that a format becomes writable when its row in that kit is clean for the target spec version: default values, geo types and bounds, variant with shredding, encryption, column metrics, and whatever v4 adds, such as the proposed vector type. That bar is concrete because it is a test suite, not an opinion.

The second is **upstream momentum**. The thread spends half its length on dev list and specification activity. That suggests the community cares about whether the format project itself moves, not only about whether Iceberg contributors can patch the gaps. A format whose specification has not changed since 2024 has a hard time convincing anyone that the next Iceberg type will land there in time.

This question mirrors one I looked at from the other direction. In [What Vortex Has to Prove Before Iceberg Adds a Fourth File Format](https://datalakehousehub.com/blog/iceberg-new-file-format-criteria-vortex/), the issue is what a new format must demonstrate to be added. Here the issue is what an existing format must demonstrate to stay or return. One bar defined by the community answers both questions at once, which is why replies on this thread matter beyond ORC and Avro. I am not predicting what that bar will be.

For your own planning, the useful takeaway is simpler. If you keep an ORC or Avro table on purpose, write down which features from the gap table you are giving up. If that list is empty for your workload, the table is fine where it is for now. If it includes something your teams already want, such as variant columns or encryption, the migration is worth doing whatever v4 decides.

## Status Tracker

This section tracks the thread's state. I will update it as the discussion moves.

| Date       | Event                                                                                                 | Source                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 2026-11-02 | Kevin Liu opens "[DISCUSS] Should V4 stop writing ORC and Avro data files?" on dev@iceberg.apache.org | [Thread](https://lists.apache.org/thread/5jfzckl0cc9z683kz9vfv41pmhrm1tdb) |
| 2026-11-23 | Thread has the opening message only. No replies, no vote, no spec change                              | Same thread, checked on this date                                          |

What to watch for next:

- **Replies from ORC and Avro users.** Kevin's fourth question asks who uses these formats for data files today. The answers decide how much a write cutoff costs the community.
- **A proposed bar.** Any reply that defines what makes a format writable again sets a precedent for future formats too.
- **A spec pull request.** A change to the v4 draft that restricts `write.format.default` or the `file_format` values allowed for new data files is the point where this moves from discussion to decision.
- **A vote.** Until the dev list votes on a spec change, the current behavior stands.

## Conclusion

The v4 discussion about ORC and Avro data files is open, unanswered and narrow. It covers new writes only, and existing files stay readable. The case behind it is a concrete gap list: ORC in Iceberg misses default values, geo types, working variant writes, encryption and the proposed vector type, while Iceberg's Avro writer records no column metrics and neither format supports variant shredding.

You do not need a decision to act. Query `data_files` and `all_data_files` to see which tables hold ORC or Avro files and how many bytes they represent. Set `write.format.default` to `parquet`, rewrite with `rewrite_data_files` and `rewrite-all`, confirm the result in the metadata table, and let `expire_snapshots` clear the old files when your retention allows. Every one of those steps works on the format version you run today.

## Keep Going

If this piece was useful, I have written a lot more on Apache Iceberg table design and maintenance. _Apache Iceberg: The Definitive Guide_ covers the spec, metadata tables and maintenance procedures like the ones in this article in much more depth. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [dev@iceberg: [DISCUSS] Should V4 stop writing ORC and Avro data files? (Nov 2, 2026)](https://lists.apache.org/thread/5jfzckl0cc9z683kz9vfv41pmhrm1tdb)
- [Apache Iceberg Table Spec](https://iceberg.apache.org/spec/)
- [Iceberg Table Configuration](https://iceberg.apache.org/docs/latest/configuration/)
- [Iceberg Spark Queries (metadata tables)](https://iceberg.apache.org/docs/latest/spark-queries/)
- [Iceberg Spark Procedures](https://iceberg.apache.org/docs/latest/spark-procedures/)
- [Iceberg Spark DDL](https://iceberg.apache.org/docs/latest/spark-ddl/)
- [Iceberg Spark Configuration](https://iceberg.apache.org/docs/latest/spark-configuration/)
- [AvroMetrics.java in apache/iceberg](https://github.com/apache/iceberg/blob/main/core/src/main/java/org/apache/iceberg/avro/AvroMetrics.java)
- [OrcMetrics.java in apache/iceberg](https://github.com/apache/iceberg/blob/main/orc/src/main/java/org/apache/iceberg/orc/OrcMetrics.java)
