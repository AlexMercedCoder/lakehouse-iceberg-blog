---
title: "Stats-Only Fields in Iceberg v4: Statistics Without a Data Column"
description: "Iceberg v4 adds a stats-fields list that gives field IDs to derived values like bucket outputs and to_lower_case(name) so their stats live in content_stats."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Apache Iceberg"
tags:
  - Apache Iceberg
  - statistics
  - metadata
  - query planning
  - spec v4
slug: "iceberg-v4-stats-only-fields"
draft: false
canonicalURL: https://datalakehousehub.com/blog/iceberg-v4-stats-only-fields/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/iceberg-v4-stats-only-fields/).

Stats-only fields are an Iceberg v4 addition, approved in a vote that closed October 31, 2026. A new `stats-fields` list gives field IDs to values that are not data columns, such as partition fields or expressions like `to_lower_case`, so their statistics can be stored in each file's `content_stats` struct.

Here is the problem in its plainest form. A table has a `name` column with mixed casing, and users run case-insensitive searches like `WHERE lower(name) = 'merced'`. Iceberg keeps a lower bound and an upper bound for `name` in every file's metadata. Those bounds describe the raw strings, so `'Merced'`, `'MERCED'` and `'merced'` sort into very different places. An engine planning that query cannot prove that a file is free of matches by looking at raw-string bounds, so it reads files it never needed.

The same gap shows up with bucket partitioning. A file's bounds on `id` say nothing useful about which values `bucket(16, id)` produces, because hashing scrambles order. If you want min and max statistics for a derived value, you need a field ID to hang them on, and through v3 the only things with field IDs were schema columns.

Iceberg v4 fixes this with a small, focused change. It adds a table-level list of "stats-only fields." Each entry gets a real table field ID, says what derived value it describes, and lets writers store ordinary column statistics for that value in the v4 manifest's `content_stats` struct. Nothing new gets written into data files. The table schema does not change.

This article covers how that works, using only what the spec text and the dev list record. Version 4 itself is still marked in the spec as under active development and not formally adopted, so treat every v4 detail here as approved spec text, not a feature you can turn on in an engine today.

## How Column Stats Work Through v3, and What They Can't Describe

Iceberg has always tracked per-file column statistics, often called metrics. They live in the manifest entry for each data file, so a planner reads them without opening a single Parquet or ORC file.

In v1 through v3, the spec stores these metrics as maps keyed by field ID: `value_counts`, `null_value_counts`, `nan_value_counts`, `lower_bounds` and `upper_bounds`. A planner takes a filter like `id > 5000`, looks up field ID 1 in `upper_bounds`, and skips any file whose upper bound is 5000 or less.

You can see this layout in any v2 or v3 table today through the Spark `files` metadata table:

```sql
-- Shipped today (Iceberg 1.x, v1-v3 tables): per-file metrics keyed by field ID
SELECT file_path,
       record_count,
       value_counts,
       null_value_counts,
       lower_bounds,
       upper_bounds
FROM prod.db.customers.files;
```

Each map column prints like `[1 -> 90, 2 -> 62]`. The number left of each arrow is a field ID from the table schema, and the value on the right is that column's metric for that file.

How much gets collected is controlled by table properties, which the [Metrics Mode KB](https://iceberglakehouse.com/iceberg/iceberg-metrics-mode/) covers in depth:

```sql
-- Shipped today: control which columns get metrics, and how much
ALTER TABLE prod.db.customers SET TBLPROPERTIES (
  'write.metadata.metrics.default' = 'truncate(16)',
  'write.metadata.metrics.column.name' = 'full',
  'write.metadata.metrics.max-inferred-column-defaults' = '100'
);
```

The first property sets the default mode for every column (`none`, `counts`, `truncate(length)` or `full`). The second overrides it for one column. The third caps how many columns get metrics by default. All three tune metrics for columns in the schema. None of them can ask for metrics on something that is not a column.

### The blind spot

Every metric is attached to a field ID, and in v3 a field ID means a schema column. That works for raw values. It breaks for any value an engine computes from a column. Ryan Blue's first proposal on the dev list, posted August 31, 2026, named the cases:

- Partition outputs from non-monotonic transforms, like `bucket(1024, id)`.
- Clustering expressions, like `to_lower_case(last_name)`.
- Collation sequence lower and upper bounds.
- A derived value used to organize an index, like `hilbert(col_a, col_b)`.

In v3 there is no defined place to say "field ID 4 means the lowercased value of field 2." A private ID invented by one engine means nothing to the next one, and a later schema change can hand the same ID to a real column.

This is also not the territory of the [Table Statistics KB](https://iceberglakehouse.com/iceberg/iceberg-statistics/), which covers Puffin files holding table-level statistics like distinct-count sketches. Puffin stats describe the whole table. Stats-only fields describe individual files and live in manifests.

## The v4 content_stats Struct

Version 4 replaces the metrics maps with a typed struct called `content_stats`, field 146 in the tracked-file schema. The spec says both representations store equivalent information. Instead of maps from ID to bytes, v4 has one nested struct per tracked field, and each bound is stored as a typed value. The [Parquet-Only Manifests in Iceberg v4](https://iceberglakehouse.com/posts/parquet-manifests-iceberg-v4/) post covers the manifest format change this sits inside.

### How the IDs work

Stats-only fields plug straight into this ID scheme. The spec assigns every table field a block of 200 IDs, starting at `10_000 + 200 * field-id`. The first ID in the block is the `base-id`, and it becomes the ID of that field's stats struct inside `content_stats`. Each metric in the struct takes an ID at a fixed offset from the base.

The offsets the spec defines are:

| Offset | Name               | Type                       | Included for                                 |
| ------ | ------------------ | -------------------------- | -------------------------------------------- |
| 1      | `lower_bound`      | field type, or `geo_lower` | all primitives and variant                   |
| 2      | `upper_bound`      | field type, or `geo_upper` | all primitives and variant                   |
| 3      | `value_count`      | long                       | all                                          |
| 4      | `null_value_count` | long                       | optional fields                              |
| 5      | `nan_value_count`  | long                       | float, double                                |
| 6      | `total_bytes`      | long                       | string, binary, variant, geometry, geography |

Geometry and geography bounds take offsets 10 through 17 for their X, Y, Z and M coordinates. Every metric in the struct is optional, and the spec tells readers to treat a missing metric as unknown.

The spec's own example is a table with a required int `id` (field 2) and an optional string `data` (field 3). Field 2's block starts at `10_000 + 200 * 2 = 10_400`. Field 3's block starts at 10_600. The manifest's stats struct looks like this:

```text
146: optional struct content_stats {
  // stats struct for table field 2: required int id
  10_400: optional struct id (default null) {
    10_401: optional int lower_bound;
    10_402: optional int upper_bound;
    10_403: optional long value_count;
  }
  // stats struct for table field 3: optional string data
  10_600: optional struct data (default null) {
    10_601: optional string lower_bound;
    10_602: optional string upper_bound;
    10_603: optional long value_count;
    10_604: optional long null_value_count;
    10_606: optional long total_bytes;
  }
}
```

The bound types come from the table field's type. `null_value_count` appears only for optional fields, and `total_bytes` only for variable-length types. The ID comes from arithmetic on the field ID, and the spec says stats must be resolved by ID, with names only a recommended label.

### Two rules that set up stats-only fields

First, IDs from 10_000 up to (but not including) 200_000_000 are reserved for stats structs in `content_stats`. Stats for a field whose stats ID falls outside that range cannot be stored there.

Second, the spec says implementations can produce stats structs for fields that are not in the table schema, as long as a field ID from the table's column ID space is assigned by allocating an ID using `last-column-id`. Writers also do not have to write a stats struct for every table field.

That second rule is the mechanism. The `content_stats` layout already works for any field ID. What was missing was a shared, durable record of what a non-schema field ID means.

Each manifest is also written with a writer-chosen `content_stats` type built into its schema. When a writer copies existing entries into a new manifest, it discards stats for removed fields, sets unknown stats structs to null for added fields, and promotes bound types after type promotion.

## The stats-fields List and How Its Field IDs Are Assigned

The approved change adds one optional field to table metadata, named `stats-fields`. The spec describes it as "a list (optional) of stats-only fields used to track stats for derived values," and the JSON appendix gives its type as a "JSON list of stats-only field objects." The spec's own example is a single entry:

```json
"stats-fields": [
  {"field-id": 102, "type": "partition-value", "partition-field-id": 1001}
]
```

That entry says: field ID 102 is a stats-only field. It describes the output of partition field 1001. Writers that produce stats for it put them under field ID 102 in `content_stats`.

### What every entry contains

The new "Stats-only Fields" section of the spec lists four parts:

1. A `field-id`, assigned by incrementing the table's `last-column-id`.
2. A `type`, which is either `partition-value` or `expr-value`.
3. An optional `data-type` that determines the bound type. It must be a primitive or a variant.
4. Type-specific fields that define how the derived values are produced.

The spec's motivating example is that lower and upper bounds for `to_lower_case(name)` are useful for case-insensitive file pruning. It also says these fields track derived values that are "not part of the table schema and are not materialized." No data file contains a column for them, and no query returns them as a column.

### Why the ID comes from last-column-id

The spec defines `last-column-id` as "the highest assigned column ID for the table," used "to ensure columns are always assigned an unused ID when evolving schemas." Drawing stats-only field IDs from the same counter means a stats-only field and a schema column never share an ID. Shared IDs mean a shared stats block, and the stats end up wrong for one of the two.

It also keeps the layout uniform. A stats-only field with ID 102 gets its block at `10_000 + 200 * 102 = 30_400`, exactly as a schema column with ID 102 does. Readers need no second ID scheme. They only need to know what ID 102 means, and `stats-fields` tells them.

### Why it lives outside the schema

In the October 2026 discussion thread, Péter Váry suggested modeling these values as generated columns inside the schema, with a "stats-only" generation strategy. Ryan Blue argued against it. His main point was that stats-only fields are not table columns and should not appear in the table schema, or every tool that reads a schema has to filter them out. He added that schema field types change only when a user changes them, while a derived value's type follows from its inputs.

Péter replied that the point about schema display "seals the discussion," and gave a +1. The earlier thread called these "non-materialized columns," so search the archives for both terms.

## Worked Examples: A Partition Field and an Expression

I will build both types on one small table so the IDs are easy to follow. The table and its numbers are my illustration. The rules that produce the numbers come from the spec.

Start with a `customers` table with three schema columns: `id` (required long, field ID 1), `name` (optional string, field ID 2) and `signup_ts` (required timestamptz, field ID 3). So `last-column-id` is 3. The table is partitioned by `bucket(16, id)`, with partition field ID 1000.

### Example 1: a bucket partition value

The `partition-value` type stores stats for the output of a partition field. The entry names that partition field with a `partition-field-id`. For this type the spec says the bound type is the partition field's result type, and `data-type` is omitted. The `bucket` transform always produces an `int`, so the bounds are ints.

Adding one entry takes the next ID from `last-column-id`:

```json
"last-column-id": 4,
"stats-fields": [
  {"field-id": 4, "type": "partition-value", "partition-field-id": 1000}
]
```

Field ID 4 maps to the stats block starting at `10_000 + 200 * 4 = 10_800`. A writer that tracks this field adds a struct like this to its manifest's `content_stats`:

```text
146: optional struct content_stats {
  // ... structs for schema fields 1, 2 and 3 ...
  // stats struct for stats-only field 4: bucket(16, id), result type int
  10_800: optional struct id_bucket (default null) {
    10_801: optional int lower_bound;
    10_802: optional int upper_bound;
    10_803: optional long value_count;
  }
}
```

The struct name `id_bucket` is my label, since names are informational. I left out `null_value_count` because the spec ties it to optional fields and the stats-only text does not say whether a derived value counts as optional.

The spec says this type can store bucket partition values in stats for filtering. The first thread gives the reason: bucket is a non-monotonic transform. A file whose `id` values run from 1 to 1,000,000 can contain any of the 16 buckets, and the `id` bounds cannot tell you which. Bounds on the bucket output can.

Do not use `partition-value` for an identity partition. In the first thread, Péter Váry asked about a dedicated identity type, and Ryan Blue answered that the data already has a field ID, so its own stats cover it.

### Example 2: a case-insensitive expression

The `expr-value` type stores stats for the result of a value expression, kept in an `expr` field. Expressions must use only ID references, so they survive column renames. The output type must be stored in `data-type`.

Here is an entry for a lowercased `name`, added after the bucket field:

```json
"last-column-id": 5,
"stats-fields": [
  {"field-id": 4, "type": "partition-value", "partition-field-id": 1000},
  {
    "field-id": 5,
    "type": "expr-value",
    "data-type": "string",
    "expr": {
      "type": "apply",
      "function": "to_lower_case",
      "arguments": [ {"type": "reference", "id": 2} ]
    }
  }
]
```

The `expr` object follows the value expression JSON grammar in the Iceberg expressions spec: `{"type": "apply", "function": FUNC_REF, "arguments": [...]}` for a function call and `{"type": "reference", "id": ID}` for a bound reference. A plain-string function reference has no catalog, which the expressions spec resolves to the catalog that holds the table.

The function name is illustrative. The spec and the vote email use `to_lower_case` as an example, but the `iceberg_functions` appendix of the expressions spec does not define it. A real table references whatever function its catalog or engine defines. The surrounding structure is what the spec fixes.

Field ID 5 maps to `10_000 + 200 * 5 = 11_000`. Because the output is a string, the struct carries `total_bytes` as well:

```text
  // stats struct for stats-only field 5: to_lower_case(name), type string
  11_000: optional struct name_lower (default null) {
    11_001: optional string lower_bound;
    11_002: optional string upper_bound;
    11_003: optional long value_count;
    11_006: optional long total_bytes;
  }
```

Now the case-insensitive query has something to work with. For a filter of `to_lower_case(name) = 'merced'`, a planner that recognizes the expression compares `'merced'` with bounds at IDs 11_001 and 11_002 and skips any file where it falls outside them.

String bounds are never tight under the spec's Stats Tightness rules, because writers truncate them. The lowercase bounds are good for skipping files, not for answering queries from metadata alone.

## What Engines Can Now Prune, and What They Can't

The spec's Scan Planning section says a manifest gets filtered by evaluating scan predicates against the bounds and counts of each tracked file, for data files and delete files alike. Stats-only fields extend the set of values that logic can see, from raw columns to named, durable derived values.

### Filters on a bucket value

A query that targets specific buckets of `id` can compare bucket numbers with the stats under the `partition-value` field and skip files whose bucket range excludes the target. The spec says only that this type is usable for storing bucket partition values in stats for filtering. It does not say how an engine translates a predicate on `id` into one on the bucket value, or when a planner prefers these stats over the partition tuple.

### Filters on an expression

If a table tracks `to_lower_case(name)` as a stats-only field, a planner that matches the query expression to that entry gets real bounds to compare against. The word "matches" carries a lot here. The spec does not define how an engine decides that a query's expression equals a stored `expr`. Function names, catalogs and argument types all have to line up, and that logic belongs to each engine.

### Where it reaches the metadata tree

Version 4 replaces manifest lists with a single root manifest per snapshot that can reference data files, data manifests and delete manifests. The [Iceberg v4's Adaptive Metadata Tree](https://iceberglakehouse.com/posts/iceberg-v4-adaptive-metadata-tree/) post covers that structure. The `content_stats` field sits in the shared tracked-file struct, so a stats-only field's ID maps to the same stats block wherever a writer populates it.

### What it does not do

- **No new data.** You cannot select `to_lower_case(name)` from a stats-only field. The engine still computes it from `name`.
- **No backfill by declaration.** Adding an entry does not create stats for older files. Files without the struct have unknown stats for that field, and a planner has to keep them.
- **No guaranteed coverage.** Writers are not required to write a stats struct for every field, so some manifests carry no stats for a declared stats-only field.

A stats-only field is a promise about where stats live and what they mean. It is not a promise that every file has them.

## Writer and Reader Obligations

The rules fit in a handful of sentences, and the exact wording is the contract, so here they are.

### Readers

The spec says readers "must not fail when an unsupported stats-only field `type` is found," and that "stats for unsupported types must be ignored." This is the forward-compatibility rule. If a future change adds a third type, an older reader keeps working and ignores those stats. The rule covers the `type` value. It does not cover an `expr-value` whose expression a reader cannot bind, which the next section returns to.

### Writers

> Writers must preserve existing stats for stats-only fields listed in a table's `stats-fields` if the `data-type` is known (either set or specified by a supported type).

This protects stats during manifest rewrites such as compaction. A writer that does not compute `to_lower_case(name)` itself still carries existing stats forward, as long as it knows the type. For `expr-value` the type is in `data-type`. For `partition-value` it comes from the partition field's result type.

> Writers should produce stats when possible for stats-only fields.

That is a "should," not a "must."

> A writer should set the field stats struct to null if an expression is unsupported, produces an incompatible output type when bound, or binding fails.

Null means unknown, and an unknown struct keeps the file in every scan, which is the safe outcome.

### Type changes

The spec limits changes to a stats-only field's data type to the schema type promotion rules, the same ones that let an `int` column become a `long`. When a type is promoted, writers promote existing bounds to match the new manifest schema.

## What Is Settled and What Is Still Open

The Iceberg dev list archives record this timeline:

- **August 31, 2026:** Ryan Blue opens "[DISCUSS] Field ID tracking for non-materialized columns in v4," proposing one table of non-materialized fields with assigned IDs.
- **October 22, 2026:** Ryan opens "[DISCUSS] Stats-only fields," pointing to PR #18405 and saying the spec is "about ready."
- **October 28, 2026:** Ryan opens "[VOTE] Add stats-only fields for v4." The vote email says the change "adds a `stats-fields` list that assigns table field IDs so that stats for partition fields and expressions like `to_lower_case` can be stored in the `content_stats` struct."
- **October 31, 2026:** Ryan posts the result. "With 15 +1 votes and no -1 or -0, this passes."

### Settled

Everything described in the sections above is in the spec text published on iceberg.apache.org: the `stats-fields` key, the entry structure, the two types and the reader and writer rules. Two framing facts also matter. The spec's Format Versioning section still says version 4 "is under active development and has not been formally adopted," so approval of this piece does not make v4 final. And the [Spec v4 KB](https://iceberglakehouse.com/iceberg/iceberg-spec-v4/) tracks the other v4 areas still in motion, and stats-only fields depend on several of them, including the `content_stats` layout and the new manifest structure.

### Changed along the way

The first proposal listed three entry types. One was `collation-bounds`, keyed by a collation sequence ID. The final spec text has only `partition-value` and `expr-value`. During the October thread, Andrei Tserakhau said collation support (tracked in issue #16972) planned to use `expr-value` with one entry per collation version. Ryan replied that he thinks collations should get a new type with standardized metadata instead of an expression, because the output is always a string and no expression has to be bound. That is his stated view in the thread. How collation bounds get represented remains open.

The `data-type` rule also shifted. In the first thread, Péter noted that storing an explicit type gives up some of the flexibility of letting an expression's type evolve. Ryan answered that the type is required only where it cannot be derived, which is what the final text does: omitted for `partition-value`, required for `expr-value`.

### Still open

These questions came up in the threads or the PR review and are not answered by the spec text:

- **Expressions a reader cannot evaluate.** Andrei asked whether the "ignore unsupported types" reader rule also covers expressions a reader cannot evaluate. Ryan's answer in the thread was to leave that choice to implementations, because a hard rule to ignore unbindable expressions leaves no way to raise real expression errors. The spec text has no such rule. Engines decide.
- **Sort order outputs.** Russell Spitzer suggested defining an output type for sort orders, similar to partition output. No sort-order type exists in the approved text.
- **Lineage of expressions.** Russell also asked whether expressions outside the schema need their own versioning, something like an expressions ID alongside a schema ID. The spec text does not add one.
- **Index use.** The first thread tied this work to v4 index design, with derived values such as a Hilbert curve index. Gianluca Graziadei asked for an explicit rule that expressions be deterministic functions of the row with all parameters embedded as literals, and that entries never change once created. Ryan's position was that the stored metadata needs to completely describe the function. The published spec text has no immutability rule for entries.
- **Naming during review.** Reviewers on the PR raised consistency between the names `stats-fields` and `stats-only-fields`. The published spec uses `stats-fields` for the metadata key and "stats-only fields" for the concept. Watch for any follow-up cleanup.
- **Engine support.** Nothing in the vote or the spec says which engines will write or use these stats, or when. Treat any claim of engine support as unverified until you see it in that engine's release notes.

### Generated columns are a separate topic

In the October thread, Ryan said he considered unifying stats-only fields with generated columns and decided against it. Generated columns are table data and belong in the schema. Stats-only fields hold no data.

## Conclusion

Stats-only fields are a small spec change with a clear job. Iceberg already had a good place to store per-file statistics, and v4 made it better with the typed `content_stats` struct and its simple ID arithmetic. What it lacked was a shared way to say "this field ID means a derived value." The `stats-fields` list supplies that, with two types today: the output of a partition field and the result of a value expression.

The design choices follow from one goal, which is to reuse what already works. IDs come from `last-column-id`, so they never collide with columns. Stats blocks use the same `10_000 + 200 * field-id` formula as every schema column. The schema stays clean, because these fields live in their own list and never appear as columns. Readers ignore types they do not know. Writers carry stats forward when they can and write null when they cannot compute a correct value.

The remaining questions are real but bounded. Collation bounds, sort-order outputs, expression lineage and engine support all sit outside the approved text. For now, the useful move for engine and tool authors is to read the Stats-only Fields and Content Stats sections of the spec together, make sure manifest rewrites keep these stats intact, and plan how your planner will match query expressions to stored `expr` entries. For table owners, the useful move is to keep tuning column metrics with the properties you already have and watch for v4 support in the engines you run.

## Keep Going

If this piece was useful, I have written a lot more on Apache Iceberg's metadata and how engines use it to plan queries. _Apache Iceberg: The Definitive Guide_ (O'Reilly) covers manifests, metrics and the table spec from the ground up. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [[VOTE] Add stats-only fields for v4, Apache Iceberg dev list](https://lists.apache.org/thread/f7nwynr69g18kj61nt5h1f45cn8g768t)
- [[RESULT] [VOTE] Add stats-only fields for v4, Apache Iceberg dev list](https://lists.apache.org/thread/d90t8lbgomb23d8dtllnncsbx27g69k3)
- [[DISCUSS] Stats-only fields, Apache Iceberg dev list](https://lists.apache.org/thread/t4nm0blbo33y5fnkcok6lrmdc4k4toxr)
- [[DISCUSS] Field ID tracking for non-materialized columns in v4, Apache Iceberg dev list](https://lists.apache.org/thread/4h53r1nvvgxqymfvx7vcyhqgh1fk8180)
- [apache/iceberg PR #18405: Spec: Add stats-only fields to table metadata](https://github.com/apache/iceberg/pull/18405)
- [Apache Iceberg Table Spec](https://iceberg.apache.org/spec/)
- [Apache Iceberg Expressions Spec](https://iceberg.apache.org/expressions-spec/)
- [Apache Iceberg Spark Queries documentation](https://iceberg.apache.org/docs/latest/spark-queries/)
- [Apache Iceberg Configuration documentation](https://iceberg.apache.org/docs/latest/configuration/)
