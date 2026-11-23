---
title: "The Iceberg Implementation Compatibility Report, November 2026: Name Mapping Across Java, PyIceberg, Rust, and Go"
description: "How Java, PyIceberg, iceberg-rust and iceberg-go read Parquet files that carry only some field IDs, plus a fixture set you can run to test each release."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Apache Iceberg"
tags:
  - Apache Iceberg
  - name mapping
  - PyIceberg
  - iceberg-rust
  - interoperability
slug: "iceberg-implementation-compatibility-report-name-mapping-2026-11"
draft: false
canonicalURL: https://datalakehousehub.com/blog/iceberg-implementation-compatibility-report-name-mapping-2026-11/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/iceberg-implementation-compatibility-report-name-mapping-2026-11/).

Four Iceberg implementations read the same Parquet file differently when only some fields carry field IDs. Java switches to IDs if any field has one, PyIceberg needs every field, iceberg-rust checks the first column, and iceberg-go resolves each field separately. This report tests those behaviors with shared fixture files and tracks them release by release.

Here is the problem in its plainest form. A Spark job reads an Iceberg table and returns a map column full of values. A Python notebook reads the same snapshot through PyIceberg and returns something else. Nobody changed the data or the schema. The files in object storage are byte for byte identical across both reads.

The cause is the field ID inside each Parquet file. Iceberg tracks columns by numeric ID, not by name, and every reader matches the columns in a file to the table schema somehow. When a file carries IDs for every field, the readers agree. When it carries none, the table's name mapping fills the gap, and they mostly agree again. The trouble starts with files that carry IDs for some fields and not others.

On November 3, 2026, Sylwester Lachiewicz opened a thread on the Apache Iceberg dev list showing that four implementations resolve those partial files four different ways. This report documents each rule against the source code the thread cites and gives you a fixture set to run yourself. The results tables get filled by running those fixtures against named releases. I do not predict them.

## What This Report Grades, and What It Leaves Alone

This is the first edition of a recurring report. Each quarter it picks one behavior that implementations read differently, builds fixture files that isolate it, and records what each library does. It grades table-format libraries on how they read the same bytes. That makes it a different instrument from [the Iceberg REST Catalog Compatibility Test](https://iceberglakehouse.com/posts/iceberg-rest-catalog-compatibility-test/), which grades catalogs on the endpoints they implement. A catalog can pass every REST level and still hand its clients a table whose files two readers disagree on. The catalog never opens a data file, so it never sees this class of bug.

The four libraries in scope are the Java reference implementation, PyIceberg, iceberg-rust and iceberg-go. Why these four matter is covered in [Iceberg Is Escaping the JVM](https://iceberglakehouse.com/posts/iceberg-is-escaping-the-jvm/), so I will not repeat that census here. Every additional reader is one more interpretation of the spec, and every interpretation is a place where results drift.

Each edition has three fixed parts. The documented rule states what each implementation does, with source file paths so you can check the claim. The fixture set is a script that builds small files isolating the behavior. The results table is filled only by running the fixtures against a named release, and a cell without a run stays empty. That last rule matters most. A compatibility report that guesses is worse than no report, because people make migration decisions from it.

## Where Partial Field IDs Come From

Iceberg writers are required to store a field ID for every field, and Russell Spitzer noted in the thread that a file with only some IDs is not a valid Iceberg data file. Such files still reach Iceberg tables by three paths.

**Migrated Hive tables.** Name mapping exists for data written before anyone thought about Iceberg. Plain Parquet writers in Hive and many ingestion tools write no field IDs. Tables that adopt those files in place rely on a name mapping stored in the `schema.name-mapping.default` table property, which readers use to translate column names into IDs. These files carry zero IDs, so they are not the partial case, but they set up the mechanism partial files collide with. The [Iceberg Column Mapping](https://iceberglakehouse.com/iceberg/iceberg-column-mapping/) page covers how IDs and names relate, including the name mapping table itself.

**Files registered with `add_files`.** Spark and PyIceberg both offer an `add_files` operation that commits existing Parquet files without rewriting them. The PyIceberg documentation says it accepts files with and without field IDs. Files with IDs must match the table schema. Files without IDs need a name mapping, and PyIceberg creates one from the current schema if the table lacks it. The [PyIceberg tutorial](https://iceberglakehouse.com/iceberg/pyiceberg/) covers the basics. Here, `add_files` reads only the file footer, so whatever ID pattern the original writer produced is the pattern your readers inherit.

**Mixed writers, and Delta column mapping in particular.** This is the source the thread focused on. Delta Lake tables that use column mapping store IDs on struct fields, including top-level columns. Unless the table is written with the IcebergCompatV2 feature, they store no IDs for list elements, map keys or map values. IcebergCompatV2 exists to add those nested IDs. When a table written without it gets Iceberg metadata generated over it (the thread cites an Apache XTable issue), the top level is fully identified and the nested types are not.

That case turns a spec ambiguity into a production bug. The top-level columns look perfect. The gap sits one level down, inside list and map types, where most people never look.

## The Four Resolution Rules, as the November 3 Thread Documents Them

Sylwester's opening message listed how each reader behaved on its main branch and named the code behind each rule. I opened each of those files to confirm the logic.

**Java.** The decision happens in `ReadConf`, in the Parquet module, which calls `ParquetSchemaUtil.hasIds(fileSchema)`. If that returns true, the reader uses the file schema as is and prunes columns by ID. If it returns false and a name mapping exists, it applies the mapping. With no mapping either, it assigns fallback IDs by position. The `HasIds` visitor returns true as soon as any field at any depth carries an ID, so one ID anywhere switches the whole file to ID-only resolution.

**PyIceberg.** The decision happens in `pyarrow_to_schema` in `pyiceberg/io/pyarrow.py`, through a `_HasIds` visitor that is the mirror image of Java's. Struct results combine with `all()`, a list requires its element to carry an ID, and a map requires both key and value to carry IDs. Unless every field has an ID, PyIceberg resolves the whole file through the name mapping. With no mapping, it raises a `ValueError` saying the file has no field-ids and the table has no `schema.name-mapping.default` defined.

**iceberg-rust.** The decision happens in `crates/iceberg/src/arrow/reader/pipeline.rs`. The reader takes the Arrow schema's fields, calls `.next()` to get the first top-level field, and checks that field's metadata for the Parquet field ID key. If the first column has an ID, the file is treated as having IDs. If not, the name mapping or positional fallback takes over. A code comment says this corresponds to Java's `hasIds()`, but the check looks at one column, not the whole tree.

**iceberg-go.** The logic sits in `table/internal/parquet_files.go`, in the `fieldID` method on `pruneParquetSchema`. If a field carries embedded `PARQUET:field_id` metadata, that ID wins. If not, it takes the ID from the matching name mapping entry. If neither exists, it fails with an invalid schema error. A comment above the method calls embedded IDs authoritative and name mappings a fallback for files and fields without their own IDs.

Laid side by side:

| Implementation | Where the decision lives                         | Rule on main, per the November 3 thread                                                                                                    |
| -------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Java           | `ReadConf`, `ParquetSchemaUtil.HasIds`           | Any ID anywhere in the file means resolve by ID only. Mapping ignored.                                                                     |
| PyIceberg      | `pyarrow_to_schema`, `_HasIds`                   | IDs used only if every field, including list elements and map keys and values, has one. Otherwise the whole file goes through the mapping. |
| iceberg-rust   | `arrow/reader/pipeline.rs`                       | The first top-level column decides. If it has an ID, the file resolves by ID only.                                                         |
| iceberg-go     | `parquet_files.go`, `pruneParquetSchema.fieldID` | Per field during pruning. An embedded ID wins, and the mapping fills fields without one.                                                   |

Jean-Baptiste Onofré confirmed in a reply that Java ORC uses the same per-file check through `ORCSchemaUtil.hasIds()`, while Java Avro works per field through `AvroSchemaUtil.getFieldId()`. Even inside Java, the answer depends on the file format. Manu Zhang said he was resolving the same inconsistency in iceberg-cpp.

The thread later corrected one row. On November 19, Sylwester reported that iceberg-go's per-field description does not hold for nested fields. Its separate `hasIDs` check does not look below a field that has an ID, so a file with top-level IDs counts as fully identified, and schema conversion fails at the unidentified list element. I did not locate that `hasIDs` function during research, so I report it at the level the thread states it. The `fieldID` method behaves as the first message described. Both statements hold at once, because they run at different stages.

## What the Spec Says, and Why the Thread Changed Direction

The spec's Column Projection section lists how a reader resolves values for field IDs that are not present in a data file. In order: use the identity partition value from the manifest if one applies, then "use `schema.name-mapping.default` metadata to map field id to columns without field id," then return the field's `initial-default` if one is defined, then return null. Read on its own, the second rule sounds per column. Each column without an ID gets mapped.

A few lines later, the same section describes the name mapping property and says the mappings "provide fallback field ids to be used when a data file does not contain field id information." That sentence sounds per file. The file either has ID information or it does not.

For files with no IDs or all IDs, both readings agree. They diverge only on partial files.

Sylwester's original proposal was the per-field reading. A field with an embedded ID resolves by that ID, and a field without one falls back to the mapping. His argument was that this matches the Column Projection rule, never overrides an ID a writer recorded, changes nothing for files with full IDs or no IDs, and makes the partial case readable. Under that rule, the Delta-derived file above reads cleanly. Top-level columns resolve by ID, and the map keys and values pick up IDs from the mapping.

Jean-Baptiste pointed out that the per-field rule needs more in Java than deleting the `hasIds()` branch. The Parquet and ORC `ApplyNameMapping` visitors overwrite an ID already present in the file when a mapped path matches, so a per-field reader has to keep embedded IDs and fill in only the missing ones. He also raised collisions, where an outdated mapping assigns a mapped ID equal to an embedded ID on another column. Gang Wu argued that files with partial or broken IDs come from outside Iceberg's control and their handling should stay implementation specific.

Then the direction changed. Russell Spitzer, who wrote the name mapping text in 2021, said the intent was always the whole file, for Hive and plain Parquet files with no IDs at all. The per-column wording entered in 2024 through PR #10835, which clarified identity partition values and `initial-default`, without meaning to change scope. He proposed fixing that sentence to match the original meaning and treating name mapping for partial files as a new feature, whose only use case so far is Delta.

Ryan Blue agreed. Readers check `hasIds` because any ID means the file was written with IDs, and those IDs should be trusted. Name mapping is a fallback for Hive conversions, and the two should not be mixed. On November 16 he put it in one line: a missing ID in a file means the column is null.

Andrei Tserakhau, speaking for iceberg-go, said the Go reader plans to switch to the Java rule once the spec wording lands, with a release note, because the switch changes results for current iceberg-go users. He added two points for the wording. "Field id information" should count an ID at any nesting level, and the check should run on the file schema, not the projected schema, so the result does not depend on the query. Java already does both.

On November 19, Manu Zhang opened spec PR #19037 to scope the "columns without field id" rule to files without field IDs. Through November 21, discussion continued. Sylwester asked whether an unidentified nested field reads as null or fails the read. Daksh Dave opened a Java proof of concept, PR #19073, and asked how required containers should behave. Russell replied that the nested detail of an effectively broken file was not worth clarifying.

At publication, the thread leans toward the per-file rule. A spec PR was opened on November 19 and is under review. How unidentified nested fields behave inside an identified file is not settled. I am not going to guess the final wording, and next quarter's edition records what merged.

## The Fixture Set

The fixture method is simple. Build the smallest files that separate the four rules, keep the logical data identical across files, and vary only where the IDs sit. Then read each file through each library with the same table schema and the same name mapping, and record what comes back.

Three files separate the rules this quarter.

- **F1, top-level IDs only.** Every top-level column has an ID. The list element and the map key and value have none. This is the Delta-without-IcebergCompatV2 shape, and by the documented rules it sends Java and iceberg-rust to ID-only resolution and PyIceberg to the mapping.
- **F2, first column without an ID.** The first column has no ID and the second does. This file isolates iceberg-rust's rule, because Java's any-ID check and Rust's first-column check reach different conclusions on it.
- **F3, no IDs at all.** The control. Every reader falls through to the name mapping. If readers disagree on F3, the problem is not partial IDs, and the other rows mean nothing until it is fixed.

The script below builds all three with PyArrow, plus the name mapping. I ran it with PyArrow 26.0.1 and confirmed the ID layout. That confirms the files, not any reader's behavior.

```python
import json
import pyarrow as pa
import pyarrow.parquet as pq

def fid(n):
    return {b"PARQUET:field_id": str(n).encode()}

rows = {
    "id": [1, 2],
    "name": ["a", "b"],
    "tags": [["x", "y"], ["z"]],
    "attrs": [[("k1", "v1")], [("k2", "v2")]],
}

# F1: IDs on every top-level column, none on list element or map key/value
f1 = pa.schema([
    pa.field("id", pa.int64(), nullable=False, metadata=fid(1)),
    pa.field("name", pa.string(), metadata=fid(2)),
    pa.field("tags", pa.list_(pa.field("element", pa.string())), metadata=fid(3)),
    pa.field("attrs", pa.map_(pa.string(), pa.string()), metadata=fid(4)),
])
pq.write_table(pa.table(rows, schema=f1), "f1_top_level_ids_only.parquet")

# F2: first column has no ID, the rest do
f2 = pa.schema([
    pa.field("id", pa.int64(), nullable=False),
    pa.field("name", pa.string(), metadata=fid(2)),
])
pq.write_table(pa.table({"id": [1, 2], "name": ["a", "b"]}, schema=f2),
               "f2_first_column_no_id.parquet")

# F3: no IDs anywhere (the classic imported Hive file)
pq.write_table(pa.table({"id": [1, 2], "name": ["a", "b"]}), "f3_no_ids.parquet")

mapping = [
    {"field-id": 1, "names": ["id"]},
    {"field-id": 2, "names": ["name"]},
    {"field-id": 3, "names": ["tags"], "fields": [
        {"field-id": 5, "names": ["element"]}]},
    {"field-id": 4, "names": ["attrs"], "fields": [
        {"field-id": 6, "names": ["key"]},
        {"field-id": 7, "names": ["value"]}]},
]
with open("name_mapping.json", "w") as f:
    json.dump(mapping, f, indent=2)
```

The `fid` helper attaches field metadata under the key `PARQUET:field_id`, which PyArrow writes into the Parquet schema as the field's ID. It is the same key PyIceberg reads in `_get_field_id` and iceberg-go reads in `getFieldID`. Fields built without it get no ID.

In F1, the `tags` column gets ID 3, but its inner `element` field has no metadata. The `attrs` map gets ID 4, and PyArrow's default key and value fields carry nothing. That reproduces the nested gap from the Delta case without a Delta writer.

The name mapping follows the spec's serialization format: a list of objects with `names`, an optional `field-id`, and optional nested `fields`. Per the spec, list types carry a mapping for `element` and map types carry mappings for `key` and `value`. IDs 5, 6 and 7 only come into play if a reader consults the mapping for F1, which is exactly the behavior under test.

To read the fixtures through Iceberg readers, register them in a test table whose schema matches (IDs 1 through 7) and set the mapping as the table property. In Spark SQL:

```sql
ALTER TABLE test.nm_fixture SET TBLPROPERTIES (
  'schema.name-mapping.default' = '[{"field-id":1,"names":["id"]},{"field-id":2,"names":["name"]},{"field-id":3,"names":["tags"],"fields":[{"field-id":5,"names":["element"]}]},{"field-id":4,"names":["attrs"],"fields":[{"field-id":6,"names":["key"]},{"field-id":7,"names":["value"]}]}]'
);
```

Then commit each fixture file with `add_files` in a separate table or snapshot, so each read touches exactly one fixture. For each library, run three projections per file: all columns, only the top-level primitive columns, and only the nested columns. Daksh Dave also suggested testing reordered physical columns, and next quarter's set adds that variant.

The upstream project is building the same kind of evidence. Sylwester offered a fixture to the `iceberg-verification` repository as a companion to its base name-mapping issue, #14, and on November 19 he linked iceberg-verification PR #27, which holds the input file and waits on the spec thread for its expected values. When that fixture lands with expected values, this report will adopt it as the reference and keep F2 as an extra case.

## Results by Implementation and Version

This part of the report does not get written in advance. Every cell comes from a run of the fixtures against a named release. Record each cell as one of four outcomes: values match the source data, the column reads as null, the read fails (with the error text), or the values are wrong. Watch for "wrong." A failure is loud. Wrong values are silent.

| Fixture and projection        | Java (version)  | PyIceberg (version) | iceberg-rust (version) | iceberg-go (version) |
| ----------------------------- | --------------- | ------------------- | ---------------------- | -------------------- |
| F1, all columns               | Run the fixture | Run the fixture     | Run the fixture        | Run the fixture      |
| F1, top-level primitives only | Run the fixture | Run the fixture     | Run the fixture        | Run the fixture      |
| F1, nested columns only       | Run the fixture | Run the fixture     | Run the fixture        | Run the fixture      |
| F2, all columns               | Run the fixture | Run the fixture     | Run the fixture        | Run the fixture      |
| F3, all columns               | Run the fixture | Run the fixture     | Run the fixture        | Run the fixture      |

The version columns matter as much as the outcomes. iceberg-rust 0.11.0 was announced the same week the thread started, with client-side encryption write support and incremental V3 support as its headline changes. Name mapping was not among the listed highlights, but reader behavior changes in point releases too, so every cell names its version.

There is one public run to point to. On November 19, Sylwester reported in the thread that he built the nested shape into a fixture and ran it through four readers. Those results are his, from his fixture, not from this report's files, and I am quoting them as he stated them:

- Java 1.11.0 (generic Parquet reader): the identified columns read correctly. Any projection that includes the list or the map fails with an error ending in "is not in the store."
- iceberg-go main: every projection fails, including one of only identified columns, for the nested `hasIDs` reason described earlier.
- PyIceberg 0.12.0: every projection fails. One missing ID sends the whole file through the mapping, and his mapping did not list the identified columns' names.
- DuckDB 2.0.0 with its iceberg extension: the identified columns read correctly, the list reads with the right length and every element null, and the map fails because its required key has no ID.

His summary was that four readers gave four results, and only two returned the identified columns at all. Andrei Tserakhau separately saw the same Java behavior on main: a top-level or struct field without an ID reads as null, but an unidentified list element, map key or map value fails the read, which he called accidental rather than designed.

That run is the best public evidence that the divergence is real. It is not a substitute for this report's table, because the fixtures differ (his mapping omits the identified columns' names, mine includes them). Run the script, fill the table, and record the versions.

## How to Check Whether Your Own Tables Are Exposed

Most tables are not exposed. If an Iceberg writer produced every file, every field carries an ID. Exposure comes from files that entered some other way. Here is the check I run.

**Step 1: does the table have a name mapping?** In Spark:

```sql
SHOW TBLPROPERTIES db.events ('schema.name-mapping.default');
```

If the property is absent and you have never imported files, stop here. If it is present, the table most likely took files from outside an Iceberg writer at some point, through a migration, an `add_files` call or a metadata conversion tool. PyIceberg's `add_files` sets the property automatically when the table lacks one.

**Step 2: list the data files.** The `files` metadata table gives you every live data file:

```sql
SELECT file_path, record_count
FROM db.events.files;
```

**Step 3: inspect the field IDs inside each suspect file.** This short script walks the Parquet schema, including list elements and map keys and values, and prints every field with its ID or the text "NO ID":

```python
import sys
import pyarrow.parquet as pq

def walk(field, path=""):
    name = f"{path}{field.name}"
    meta = field.metadata or {}
    fid = meta.get(b"PARQUET:field_id")
    print(f"{name:<24} {fid.decode() if fid else 'NO ID'}")
    t = field.type
    if hasattr(t, "key_field"):
        walk(t.key_field, name + ".")
        walk(t.item_field, name + ".")
    elif hasattr(t, "value_field"):
        walk(t.value_field, name + ".")
    elif t.num_fields and hasattr(t, "field"):
        for i in range(t.num_fields):
            walk(t.field(i), name + ".")

for path in sys.argv[1:]:
    print(f"== {path}")
    for field in pq.read_schema(path):
        walk(field)
```

Run against the F1 fixture, it prints IDs 1 through 4 on the top-level columns and "NO ID" on `tags.element`, `attrs.key` and `attrs.value`. That output is the signature of an exposed file.

**Step 4: classify each file.** A file with IDs on every line is safe. A file with "NO ID" on every line is a classic imported file, and every reader resolves it through the mapping. A file with a mix is exposed, and the readers listed earlier treat it differently today.

**Step 5: decide what to do with exposed files.** You have two practical options. The first is to rewrite them with an Iceberg writer, which assigns IDs to every field and removes the ambiguity for good. There is a catch. The rewrite reads the old file through some reader first, and if that reader resolves the file wrongly or nulls the nested columns, the rewrite bakes that result in permanently. Check the rewritten data against the source before you expire the old snapshot. The second option is to pin every consumer to one reader until the spec settles. I prefer the careful rewrite. Reader pinning breaks the first time a new team picks a different library.

If the exposed files came from Delta tables with column mapping, enable IcebergCompatV2 on the source going forward. That stops new partial files but does not repair old ones.

## Next Quarter's Behavior to Test

Each edition picks one behavior. The pick for February 2027 follows from this one: how readers handle a missing nested ID inside a file that otherwise carries IDs, measured against whatever the spec says by then.

Three cases from the thread go into that fixture set.

- **An optional list or map whose element, key or value has no ID.** Sylwester proposed that such a container reads as null as a whole. Daksh's proof of concept in PR #19073 does that for optional containers. The fixture records whether released readers agree.
- **A required container with the same gap.** Daksh reported that with the proof of concept, a required `tags` with no default fails with Java's existing missing-field error. Whether that is the intended outcome was an open question when the thread last moved.
- **Projection independence.** The same file read with a full projection, a single identified column, and a single nested column, plus a variant with physical columns reordered. Andrei and Daksh both argued that the ID check should run on the file schema so the answer does not depend on the query. The fixture tests exactly that.

The next edition also adds iceberg-cpp as a fifth column and the Java ORC and Avro paths as sub-rows. If the spec PR merges first, expectations follow the merged text. If not, the report records behavior without grading it against a rule that does not exist yet.

## Conclusion

The name mapping divergence is a good first subject because it hides one level down in the schema. Four libraries read the same file and return different answers when it carries only some field IDs.

Java checks for any ID anywhere. PyIceberg requires every ID, nested ones included. iceberg-rust looks at the first column. iceberg-go resolves per field at pruning time, with a nested-field caveat the thread uncovered. The dev list has moved toward per-file resolution as the intended rule, with a spec PR under review and nested fields still unsettled.

What you do today does not depend on how that settles. Check your tables for a name mapping, inspect files that entered from outside, and rewrite the partial ones carefully. Then run the fixtures against the library versions your teams use. That table is the part of this report only running code can write.

## Keep Going

If this piece was useful, I have written a lot more on Apache Iceberg internals and how tables behave across engines. _Apache Iceberg: The Definitive Guide_ covers schemas, field IDs, schema evolution and the metadata structures that this report tests against. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [dev@iceberg: [DISCUSS] Name mapping for data files that carry only some field IDs](https://lists.apache.org/thread/tct2yp45ytsb6dqw1tq7b8gnfnp7jndo)
- [dev@iceberg: [ANNOUNCE] Release Apache Iceberg Rust 0.11.0](https://lists.apache.org/thread/lm4sskbfojckzmo6l3fkko1wcoz5v8h6)
- [Apache Iceberg table spec (format/spec.md), Column Projection and Name Mapping Serialization](https://github.com/apache/iceberg/blob/main/format/spec.md)
- [Iceberg Java: ReadConf.java](https://github.com/apache/iceberg/blob/main/parquet/src/main/java/org/apache/iceberg/parquet/ReadConf.java)
- [Iceberg Java: ParquetSchemaUtil.java](https://github.com/apache/iceberg/blob/main/parquet/src/main/java/org/apache/iceberg/parquet/ParquetSchemaUtil.java)
- [PyIceberg: pyiceberg/io/pyarrow.py](https://github.com/apache/iceberg-python/blob/main/pyiceberg/io/pyarrow.py)
- [PyIceberg: pyiceberg/table/**init**.py](https://github.com/apache/iceberg-python/blob/main/pyiceberg/table/__init__.py)
- [PyIceberg API docs, Add Files](https://github.com/apache/iceberg-python/blob/main/mkdocs/docs/api.md)
- [iceberg-rust: crates/iceberg/src/arrow/reader/pipeline.rs](https://github.com/apache/iceberg-rust/blob/main/crates/iceberg/src/arrow/reader/pipeline.rs)
- [iceberg-go: table/internal/parquet_files.go](https://github.com/apache/iceberg-go/blob/main/table/internal/parquet_files.go)
- [Iceberg Spark procedures docs, add_files](https://github.com/apache/iceberg/blob/main/docs/docs/spark-procedures.md)
