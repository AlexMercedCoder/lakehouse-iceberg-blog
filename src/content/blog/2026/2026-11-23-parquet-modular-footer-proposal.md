---
title: "The Parquet Modular Footer Proposal: How Parquet Plans to Read Wide-Table Metadata Without Parsing Everything"
description: "A field-by-field walk through the revised Parquet Modular Footer proposal: metadata streams as Parquet pages, optional row groups, and row-range statistics."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Data Engineering"
tags:
  - Apache Parquet
  - file format
  - metadata
  - wide tables
  - spec proposals
slug: "parquet-modular-footer-proposal"
draft: false
canonicalURL: https://datalakehousehub.com/blog/parquet-modular-footer-proposal/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/parquet-modular-footer-proposal/).

The Parquet Modular Footer proposal replaces the single Thrift footer with modules stored as Parquet pages, so readers of wide tables can load only the metadata they need. The October 30, 2026 revision makes row-group metadata optional, defines column chunks as contiguous pages for one column, and defines statistics by row range.

Here is the problem in one sentence. A query touches 5 columns of a 2,000-column Parquet file, and the reader still downloads and parses metadata for all 2,000 columns before it reads a single data byte.

I ran a small test while writing this piece. I used pyarrow 26.0.1 with default settings to write a file with 2,000 integer columns, 10,000 rows and 10 row groups. The serialized footer came out at 2,415,948 bytes, about 2.3 MiB. That is 20,000 column chunk entries, each one a full Thrift struct with its own statistics, and a reader has to walk every one of them to find the 5 it wants.

On object storage that cost shows up twice. First the reader guesses a tail size, fetches it, and discovers the footer is bigger than the guess. Then it issues a second request for the rest. Only after both requests land does Thrift decoding start, and decoding runs across the whole structure no matter how few columns the query projects.

The Modular Footer is the Parquet community's answer. It is still a proposal under active review on the dev@parquet.apache.org mailing list, with a draft Thrift definition in [parquet-format PR #623](https://github.com/apache/parquet-format/pull/623). Nothing here is part of the released format yet. This article walks through the revised design struct by struct, explains what changed between the September and October versions, and covers what it means for readers, writers and Apache Iceberg planning.

## Why the Thrift Footer Hurts Wide Tables

Every Parquet file today ends the same way. The data pages come first, then a footer serialized with Apache Thrift (a cross-language serialization framework), then a 4-byte little-endian footer length, then the 4-byte magic number `PAR1`. A reader seeks to the end, reads the length, and fetches the footer. If you want the background on what each part of that footer holds, I covered it in [Parquet Metadata Explained](https://iceberglakehouse.com/posts/2024-10-all-about-parquet-part-07/). Here I only need the shape.

The shape is row-major. These are the top-level fields of the three structs that matter, copied from `parquet.thrift` on the parquet-format master branch:

```thrift
struct FileMetaData {
  1: required i32 version
  2: required list<SchemaElement> schema;
  3: required i64 num_rows
  4: required list<RowGroup> row_groups
  5: optional list<KeyValue> key_value_metadata
  6: optional string created_by
  7: optional list<ColumnOrder> column_orders;
  8: optional EncryptionAlgorithm encryption_algorithm
  9: optional binary footer_signing_key_metadata
}

struct RowGroup {
  1: required list<ColumnChunk> columns
  2: required i64 total_byte_size
  3: required i64 num_rows
  4: optional list<SortingColumn> sorting_columns
  5: optional i64 file_offset
  6: optional i64 total_compressed_size
  7: optional i16 ordinal
}

struct ColumnChunk {
  1: optional string file_path
  2: required i64 file_offset = 0
  3: optional ColumnMetaData meta_data
  4: optional i64 offset_index_offset
  5: optional i32 offset_index_length
  6: optional i64 column_index_offset
  7: optional i32 column_index_length
  8: optional ColumnCryptoMetaData crypto_metadata
  9: optional binary encrypted_column_metadata
}
```

Read the nesting from the top. `FileMetaData` holds a list of `RowGroup` structs. Each `RowGroup` holds a list of `ColumnChunk` structs, one per leaf column, in schema order. Each `ColumnChunk` wraps a `ColumnMetaData` struct with 17 fields, including the column type, the list of encodings, `path_in_schema`, the codec, value counts, sizes, `data_page_offset`, optional dictionary and Bloom filter offsets, and a `Statistics` struct with min and max values as opaque bytes.

So the number of `ColumnChunk` structs equals row groups times columns. My 2,000-column test file with 10 row groups has 20,000 of them. The only thing a reader needs from most of those structs is two numbers: where the chunk starts and how long it is. To get them, the reader decodes everything else too.

Thrift's compact protocol makes this worse in a specific way. Fields are encoded one after another with variable-length headers, so there is no way to jump to "column 1,742 of row group 6" without parsing everything before it. Each struct also repeats its own framing, and each `ColumnMetaData` repeats `path_in_schema` as a list of strings even though the schema already holds the same names.

Two costs fall out of this layout:

- **Fetch cost.** The footer size is proportional to columns times row groups, so wide tables blow past any reasonable speculative tail read.
- **Decode cost.** Decoding is proportional to the full footer, not to the columns a query projects.

None of this is new. I described it at survey level in [the footer section of State of Apache Parquet in 2026](https://iceberglakehouse.com/posts/state-of-apache-parquet-2026/), and the Iceberg angle shows up in [Iceberg's Next Version Depends on Decisions Being Made in Parquet](https://iceberglakehouse.com/posts/parquet-constrains-iceberg/). What is new is a concrete, reviewed design with a draft Thrift file behind it.

## Measuring Your Own Footers Before You Care About Any of This

Before reading a format proposal, it helps to know whether your files have the problem. The code below uses the shipped pyarrow API. Nothing in it depends on the proposal. I ran it against pyarrow 26.0.1.

```python
import os
import pyarrow as pa
import pyarrow.parquet as pq

# Build a wide table: 2,000 int64 columns, 10,000 rows.
table = pa.table({f"c{i}": pa.array(range(10_000)) for i in range(2_000)})

# 1,000 rows per row group gives 10 row groups.
pq.write_table(table, "wide2k.parquet", row_group_size=1_000)

md = pq.ParquetFile("wide2k.parquet").metadata
print(md.num_columns, md.num_row_groups, md.serialized_size,
      os.path.getsize("wide2k.parquet"))

# Drill into one column chunk: the two numbers a reader needs most.
chunk = md.row_group(0).column(5)
print(chunk.path_in_schema, chunk.data_page_offset,
      chunk.total_compressed_size)
```

The `row_group_size` argument to `write_table` caps the rows per row group, so 10,000 rows become 10 row groups. `ParquetFile(...).metadata` returns pyarrow's `FileMetaData` wrapper, and `serialized_size` reports the byte size of the Thrift footer. On my run the output was `2000 10 2415948 109671960`, so the footer was about 2.2 percent of a 105 MiB file.

The last block shows the lookup a scan planner performs for every projected column: find the chunk, read `data_page_offset` and `total_compressed_size`. Against today's footer, pyarrow has already decoded all 20,000 chunk structs to answer that.

## The September Proposal and What Reviewers Pushed Back On

Jiayi Wang posted the first version of the Modular Footer to dev@parquet on September 21, 2026. The post said a dedicated footer working group had been meeting every two weeks, and it linked three things: a design document, [parquet-format PR #623](https://github.com/apache/parquet-format/pull/623) with the draft Thrift, and tracking [issue #622](https://github.com/apache/parquet-format/issues/622).

The design doc states four goals that did not change between versions: fewer dependent reads, a smaller footer, work proportional to the query, and fast decoding. The first goal is the important one. Readers locate projected column chunks from the initial tail read when possible, or fetch only the extra metadata they need.

The doc also compares the Modular Footer to four alternatives that keep today's `FileMetaData`: removing redundant fields such as `path_in_schema` (parquet-format #563), switching to FlatBuffers (parquet-format #530), adding a column-chunk jump table, and writing a specialized Thrift parser (arrow-rs #5854). Its argument is that each alternative helps some goals, but none makes metadata independently addressable. A reader still has to fetch the whole footer before it starts.

### The original design: transposed arrays

The September version took today's row-major footer and transposed it. Instead of one `ColumnChunk` struct per row group per column, each metadata field became its own column-major array. All the data page offsets sat in one array, all the compressed sizes in another, and so on. The doc named two benefits. Metadata for one projected column becomes contiguous, and one array header replaces thousands of repeated struct headers.

To store those arrays inside Thrift with random access, the original design introduced its own array encodings: bit-packed integers with a per-array bit width, concatenated byte arrays plus an offsets array, and packed bitsets for booleans. It also defined two special forms for sparse optional fields, `Bitset` and `PresentIndex`.

The sparse case was real. The doc cites one 367 MB production footer in which fewer than 1 percent of column chunks carried min/max statistics. A dense offsets array for those values needed 10 MB to address 0.44 MB of actual data.

### The headline benchmark

The September doc's most telling number is a cold scan, and I report it as the proposal's own result. With the same 512 KiB initial tail read, the legacy footer needed a 3.49 MiB follow-up read before it located the projected column. The modular path fetched only the placement metadata it needed and finished the whole query in 58.6 ms, before the legacy path finished fetching its footer.

### What reviewers said

The October 30 post summed up the biggest complaint directly. Reviewers found the `EncodedArray` concept, the custom array encoding layer, opaque and confusing. It existed to model arrays efficiently in Thrift with random access, and it paid for that with readability.

Other threads, visible in the doc's open questions and comments, pushed in specific directions:

- **Compression.** A reviewer asked whether each module should get general-purpose compression. The October 19 progress update on the list said compression came up often, especially for footers large enough that size dominates cold reads.
- **Typed statistics.** Another reviewer asked for type-aware encodings on min/max values instead of opaque bytes.
- **Reuse Parquet's own encodings.** The October 19 update said a recurring suggestion was to reuse Parquet encodings to make the footer more future-proof. The authors had ruled this out at first because existing encodings lack random access. The update said PFOR (patched frame-of-reference, an integer encoding under development for Parquet) and other random-access-friendly encodings made the idea worth revisiting.

That is the setup for the revision. The October 19 update added one more aim: room for future layouts such as a proposed non-contiguous pages layout.

## The October 30 Revision: Chunks, Optional Row Groups and Row-Range Statistics

On October 30, 2026, Jiayi Wang posted the revised proposal to the same thread, as a new tab in the same design document. The post grouped the changes under two headings: flexible data layouts and a page-based representation.

### Column chunks get a narrower definition

Today a column chunk means the data for one column in one row group. The revision keeps the term but changes the definition. A column chunk is now a contiguous set of pages for one column.

The consequence is that different columns can have different numbers of chunks in the same file. The design doc explains why with the case of asymmetric tables, where a few columns hold most of the bytes. Today, changing row-group boundaries splits every column at once. If you keep row groups small enough to suit the heavy columns, the light columns get chopped into many tiny chunks, each with its own metadata. Under the revision a writer splits the heavy columns into small chunks and keeps the light columns in a few large ones.

The draft Thrift spells this out with prefix sums. `DataLayout.column_chunk_index` holds one INT32 per column, the running total of chunks through that column. The comment in PR #623 gives an example: three columns with 2, 1 and 3 chunks give `column_chunk_index = [2, 3, 6]`. Column 0 owns chunks 0 and 1, column 1 owns chunk 2, and column 2 owns chunks 3 through 5. A reader finds one column's chunks with two lookups and no parsing of unrelated columns.

One comment thread in the doc asked whether this mandates a new physical layout. The author's answer was no. The new footer does not require layout changes. Writers can keep writing row groups, column chunks and pages exactly as they do today, and the new footer can represent the same metadata. A separate data layout proposal is expected to cover the physical side.

### Row groups become optional metadata

The revision keeps the words "row group" but makes row-group metadata optional. In the draft Thrift, `RowGroupMetadata` is an optional field of the root struct, and its doc comment says it is "kept for compatibility." When present, it holds two streams: `num_rows`, one INT64 per row group, and `offsets`, one INT64 per row group plus one, giving the byte boundaries. When absent, the file does not record row groups, though its data can still be laid out in them.

### Statistics move to row ranges

Today, chunk statistics sit in each `ColumnMetaData`, and the page index (`ColumnIndex` and `OffsetIndex`) stores page-level min/max outside the footer. Both are pinned to physical boundaries. The revision attaches statistics to row ranges instead, and different columns can publish stats at different granularities. The design doc adds that each column has its own range boundaries, independent of other columns and of chunk or page boundaries. A frequently filtered column can carry fine-grained ranges while a rarely filtered one carries a single file-wide range.

A column can also carry several statistics sets at different granularities. A reader uses coarse statistics to skip large row ranges, then consults finer ones only where needed. In the draft Thrift each set declares a `RowRangeKind`:

- `COLUMN_CHUNK`: one entry per chunk, equivalent in spirit to today's chunk statistics.
- `PAGE`: one entry per data page, equivalent in spirit to today's page index.
- `ARBITRARY`: ranges chosen by the writer, listed explicitly, which need not line up with chunks, pages or row groups.

The Thrift comment gives a worked `ARBITRARY` example. In a file with 250,000 rows, `first_row_indexes = [0, 100000, 200000, 0]` describes two columns. The first has three ranges ending at 100,000, 200,000 and 250,000. The second has one range covering the whole file. A per-column prefix sum, `column_range_index`, tells the reader which positions belong to which column.

One rule matters for anyone writing a pruning engine. Sets are independent. A range in one set does not have to fall inside a range of another, so the draft says to combine sets by matching the rows they cover, not by position, and never to add counts from overlapping ranges.

## Footer Modules as Parquet Pages, With Optional Compression

The second half of the October 30 revision replaces the custom `EncodedArray` layer with something every Parquet implementation already has: pages. Each metadata field becomes a stream, and each stream is stored the way a non-nested column chunk is stored, as an optional dictionary page followed by data pages. In effect the footer becomes a small table, and each stream is one column of it.

The draft Thrift in PR #623 locates every stream with one struct. This is proposed, not shipped:

```thrift
struct StreamLocation {
  1: required i64 offset;
  2: required i64 length;
  3: required parquet.CompressionCodec codec;
}
```

`offset` is the byte position of the stream's first page header from the start of the file. `length` covers all its pages, headers included. `codec` reuses the existing `CompressionCodec` enum, and the comment states that metadata stream compression is independent of column data compression. The draft also restricts data pages in streams to `DATA_PAGE_V2`. Version 1 data pages are not allowed.

Three things follow from reusing pages.

First, **encoders and decoders come for free.** Integer streams use Parquet's integer encodings, byte-array streams use Parquet's byte-array encodings, and new encodings such as PFOR become available to the footer as soon as they land in the format.

Second, **sparse fields use definition levels.** The `Bitset` and `PresentIndex` machinery from September is gone. A nullable stream marks missing values the same way any optional Parquet column does.

Third, **compression is per stream.** Each stream picks its own codec. The doc says page compression is especially effective for files with large footers. It also notes an operational upside: engines can fetch compressed pages for cold reads from cloud storage and cache uncompressed pages locally.

### Typed statistics

The page representation also enabled typed min/max. Today `Statistics.min_value` and `max_value` are opaque byte strings. The draft `RangeStatistics` struct instead declares one stream per physical type: `min_boolean`, `min_int32`, `min_int64`, `min_float`, `min_double`, `min_byte_array` and `min_fixed_len_byte_array`, with matching `max_` streams. Each column uses the stream for its type, and other columns hold nulls there. Integer bounds get integer encodings, and string bounds get prefix or dictionary encoding.

There is one visible seam here. The design doc text describes interleaving each range's min and max as `[min_0, max_0, min_1, max_1, ...]` so the two bounds sit together. A reviewer pushed back, preferring separate arrays for vectorized evaluation, and the current draft Thrift does keep separate min and max streams. Expect this detail to keep moving.

### Did the size story survive?

The October 30 post says the page-based footer is comparable in size and performance to the original, while being simpler and more flexible. The revised doc reports new decode numbers on ClickBench data with 105 columns, 70 row groups, 7,350 column chunks and 542K data pages. Current Thrift took about 4.5 ms even for one column, because it parses the whole footer. Three alternatives the doc labels "jump table," "Modular footer" and "page footer" took 0.03, 0.03 and 0.07 ms for one column, and 0.46, 0.16 and 0.12 ms for all columns. The page footer starts higher, at about 66 µs of fixed cost, but grows slowest, at about 0.5 µs per column. By the doc's measurement it overtakes the jump table beyond roughly 13 percent of columns and the doc's Modular footer variant beyond roughly 55 percent.

The doc is candid about the tradeoff. Page headers and stream descriptors add fixed overhead that can outweigh encoding gains in small footers, so small, narrow files gain little. Wide tables and many-chunk files amortize it.

## The Draft Root Struct, Field by Field

The Thrift in PR #623 lives in a new file, `ModularFooter.thrift`, which includes `parquet.thrift` and reuses its enums and schema types. On November 18, Jiayi Wang reported another round of edits to these definitions to improve readability around metadata streams, statistics and encryption. Field numbers and names here come from that draft and are subject to change.

The root struct is `ModularFooter`. Its fields map onto today's footer like this:

| Draft field                                    | Kind                  | What it replaces or adds                                           |
| ---------------------------------------------- | --------------------- | ------------------------------------------------------------------ |
| `1: version`                                   | required i32          | Format version of the modular footer, value not yet allocated      |
| `2: file_info`                                 | optional `FileInfo`   | `num_columns`, `num_rows`, `schema`, `created_by`, `column_orders` |
| `3: data_layout`                               | required `DataLayout` | Prefix sums mapping columns to chunks and chunks to pages          |
| `4: dictionary_metadata`                       | required              | Offsets, lengths and codecs of every dictionary page               |
| `5: row_group_metadata`                        | optional              | Row counts and byte boundaries of row groups, if recorded          |
| `6: column_chunk_metadata`                     | required              | Per-chunk codecs, dictionary ids, sizes, value counts, offsets     |
| `7: page_metadata`                             | optional              | Per-page first row index and offset relative to its chunk          |
| `8: row_range_statistics`                      | optional list         | One `SharedRangeStatistics` per statistics set                     |
| `9, 10: key_value_metadata_keys/values`        | optional streams      | File-level key/value metadata                                      |
| `11, 12: crypto_metadata, encrypted_file_info` | optional              | Parquet Modular Encryption settings and encrypted `FileInfo`       |
| `13: encrypted_row_range_statistics`           | optional              | Per-column statistics encrypted with column keys                   |

A few fields deserve a closer look.

**`ColumnChunkMetadata`** holds eight streams, each with one value per chunk. `offsets` and `compressed_sizes` are the placement pair a scan needs. `codecs` gives the data page codec. `num_values` keeps today's meaning, including nulls. `first_row_indexes` gives each chunk's first row within the file and becomes required when any statistics use `COLUMN_CHUNK` ranges. `is_fully_dictionary_encoded` is a single boolean that replaces today's `encoding_stats` list for the common question "is this chunk all dictionary pages?"

**`dictionary_ids`** links chunks to a shared dictionary table. Today a dictionary belongs to one column chunk. In the draft, `DictionaryMetadata` stores every dictionary page once, and several chunks of the same column can reference the same dictionary by id, including across row groups. Today's footer has no way to express that.

**`PageMetadata`** stores `relative_offsets`, each page's offset from the start of its chunk, instead of absolute offsets. Small numbers encode smaller. If the stream is absent, readers find pages by reading page headers, as they do today without an offset index.

**The tail.** The draft's ASCII diagram puts the metadata streams after the data, then the `ModularFooter` struct in Thrift compact protocol, then a 4-byte `directory_length`, then a 4-byte magic. The directory is small by design. Schema and placement are meant to fit in the first tail read, while statistics and page metadata are fetched only when a query needs them.

The design doc's field audit lists what is proposed for removal: `ColumnMetaData.key_value_metadata` in favor of file-level key/value metadata, `ColumnChunk.file_path` because cross-file references are not used, `RowGroup.total_compressed_size` and `ordinal`, and the INT96 type, which the new footer will not support. Several others are marked as needing investigation: `SizeStatistics`, geospatial statistics, Bloom filter metadata, `sorting_columns`, and per-chunk `encodings`. The November 18 post asked for collaborators on exactly these items.

## What Readers and Writers Must Change, and Old Files

The design doc proposes a two-stage migration.

**Stage one is a transition mode.** Writers store the modular directory as an extension field inside today's `FileMetaData` and write the metadata streams before the legacy footer. Old readers skip the unknown extension and keep using the Thrift footer. New readers find the directory and use the streams. The cost is that both representations live in the file for a while.

**Stage two is a new footer version.** The Modular Footer becomes a new footer format identified by a new magic number. Writers emit only the new footer, and readers check the magic to choose a parser. The design doc names the magic `PARN`, while the draft Thrift diagram in PR #623 shows `PAR3`. Treat the exact bytes as unsettled.

Reviewers argued about stage one more than anything else in the doc. One thread pointed out that putting extra bytes in the legacy footer hurts speculative fetches for readers that do not know about the extension. The author's answer was to place large modules before the legacy footer so they do not inflate its size. Another reviewer argued that transition mode is strictly worse than today for compatibility-minded users, and suggested a clean new envelope instead. A third doubted that writers will ever default to modular-only output, given the installed base of readers. These positions are on the record and unresolved.

For engine developers, the work splits cleanly:

- **Readers** need a second footer parser that reads the directory, then fetches and decodes only the streams a query touches. Placement comes first, statistics later and only for filter columns.
- **Writers** need to buffer per-column metadata as columns, then emit streams as Parquet pages. Most writers already have this page-writing code.
- **Both** need to handle per-stream encryption. The draft extends Parquet Modular Encryption with new module types, encrypts shared streams with the footer key, and stores statistics for separately keyed columns in `EncryptedRowRangeStatistics`. The field audit flags that this narrows encryption scope to column data and sensitive metadata, and asks for a security review.

Old files are unaffected. Nothing in the proposal changes how a `PAR1` file is read.

## What It Means for Iceberg Manifests and Planning

Iceberg already does at the table level part of what the Modular Footer does at the file level. Manifests store per-file `lower_bounds`, `upper_bounds`, `null_value_counts` and `split_offsets`, so a planner prunes files without opening any Parquet footer. You can see these fields with a metadata table query in Spark, which is shipped syntax today:

```sql
SELECT file_path, record_count, file_size_in_bytes, split_offsets
FROM prod.db.events.files;
```

The Iceberg spec describes `split_offsets` as split offsets for the data file, "for example, all row group offsets in a Parquet file." That example assumes row groups exist and line up across columns. Under the revised footer, row-group metadata is optional and chunk boundaries differ per column. Iceberg writers will need a clear rule for what a split offset means in such a file. I have not seen that rule proposed yet, and I covered the general pattern in [Iceberg's Next Version Depends on Decisions Being Made in Parquet](https://iceberglakehouse.com/posts/parquet-constrains-iceberg/).

The other connection is the tail read. A comment from the proposal author in the design doc mentions concurrent work to record footer size, or "tail size," in table-level metadata. If a manifest tells a reader exactly how many trailing bytes to fetch, the first request always lands the directory. That pairs naturally with a footer designed to fit placement metadata into that first read.

Planning itself changes little. Iceberg still prunes files by manifest statistics. The gain lands one level down, when a task opens a file and needs placement for five columns out of two thousand.

## Conclusion

The Modular Footer is a proposal, not a spec. Julien Le Dem urged list members to review it, calling it a major change for the project, and said he expects the footer format to stay stable for a while after it lands. Micah Kornfield reviewed it on November 5, said he likes the design, and asked for denser parts of the Thrift to be documented better. The October 30 revision answered the loudest September feedback by dropping the custom array encoding, storing metadata as Parquet pages, adding per-stream compression, and freeing statistics from row groups. Open questions remain around migration, encryption scope and the field audit. If you maintain a Parquet reader or writer, now is the time to comment on PR #623.

## Keep Going

If this piece was useful, I have written a lot more on Parquet, Iceberg and the lakehouse file layer.
_Apache Iceberg: The Definitive Guide_ covers how Iceberg's manifests and metadata tables sit on top of Parquet files.
You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [dev@parquet thread: Introducing the Parquet Modular Footer (October 30, 2026 revision and replies)](https://lists.apache.org/thread/mdwh994bdfb60ytgy5cgcx8pdh60lkwh)
- [Parquet Modular Footer design document](https://docs.google.com/document/d/1xN4Nqh-fh-eH-cUz9e6Rqs_gPXRBKUh4s29EzX_NU8M/edit?tab=t.cbl5qtgc5xhz)
- [apache/parquet-format PR #623: draft ModularFooter.thrift](https://github.com/apache/parquet-format/pull/623)
- [parquet.thrift on parquet-format master](https://github.com/apache/parquet-format/blob/master/src/main/thrift/parquet.thrift)
- [parquet-format README: file layout](https://github.com/apache/parquet-format/blob/master/README.md)
- [Apache Iceberg table spec](https://iceberg.apache.org/spec/)
- [Iceberg Spark queries: metadata tables](https://iceberg.apache.org/docs/latest/spark-queries/)
