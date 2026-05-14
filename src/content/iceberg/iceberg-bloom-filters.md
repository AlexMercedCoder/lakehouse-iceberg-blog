---
term: "Iceberg Bloom Filters"
description: "Bloom filter indexes in Apache Iceberg enable probabilistic row-level skipping by allowing query engines to determine with near certainty whether a specific value exists in a data file before reading it, dramatically improving point-lookup query performance."
category: "Operations & Optimization"
relatedTerms:
  - "iceberg-puffin-files"
  - "iceberg-data-skipping"
  - "iceberg-manifest-file"
  - "iceberg-clustering"
  - "iceberg-parquet"
keywords:
  - iceberg bloom filter
  - bloom filter index iceberg
  - iceberg point lookup optimization
  - iceberg file skipping bloom
  - iceberg hash index
lastUpdated: 2026-05-14
---

## Bloom Filters in Apache Iceberg

A **bloom filter** is a probabilistic data structure that answers the question "is this value in this set?" with two possible results:

- **"Definitely not in the set"**: If the bloom filter says no, the value is guaranteed absent.
- **"Possibly in the set"**: If the bloom filter says yes, the value is probably there (small probability of false positives).

In the context of Apache Iceberg, bloom filters are used as **file-level indexes** that enable query engines to skip data files that definitely don't contain a queried value — without reading the file. This is particularly powerful for **point lookups** (queries with exact equality predicates like `WHERE user_id = 12345`) where min/max statistics are useless (every file's min/max range might include 12345).

## Bloom Filters vs. Min/Max Statistics

Min/max statistics and bloom filters serve complementary skipping roles:

| Scenario                                          | Min/Max           | Bloom Filter |
| ------------------------------------------------- | ----------------- | ------------ |
| Range queries (`WHERE total BETWEEN 100 AND 200`) | Excellent         | Poor         |
| Point lookups (`WHERE user_id = 12345`)           | Poor (can't skip) | Excellent    |
| Low-cardinality columns                           | Good              | Overkill     |
| High-cardinality IDs (UUIDs, user IDs)            | Poor              | Excellent    |

For high-cardinality ID columns in well-clustered tables, bloom filters can achieve 99%+ skip rates for point lookups.

## Bloom Filters in Parquet Files

Apache Parquet has native bloom filter support at the **row group level**. When a Parquet file is written with bloom filters enabled, each row group contains a bloom filter structure for specified columns in the file footer.

Enabling in Spark:

```python
# Enable Parquet bloom filters for specific columns
spark.conf.set("spark.sql.parquet.bloom.filter.enabled", "true")
spark.conf.set("spark.sql.parquet.bloom.filter.column.enabled.user_id", "true")
spark.conf.set("spark.sql.parquet.bloom.filterFPP", "0.05")  # 5% false positive rate
```

With bloom filters written to Parquet:

- A query `WHERE user_id = 12345` checks the bloom filter in the row group footer.
- If the bloom filter says "no", the entire row group is skipped (no decompression, no column decode).
- If the bloom filter says "possibly yes", the row group is scanned normally.

## Bloom Filters in Iceberg Puffin Files

Beyond row-group-level Parquet bloom filters, Iceberg's Puffin format supports **table-level bloom filter indexes** stored as Puffin blobs. These are file-level (not row-group-level) bloom filters that allow skipping entire data files before opening them.

Puffin bloom filters are the Iceberg equivalent of file-skip indexes in databases — they enable the query planner to eliminate files at the manifest scan stage, before any file I/O.

> **Note**: Puffin-based bloom filters are under active development in the Iceberg specification as of 2025. Parquet-level bloom filters are broadly supported today.

## Sizing Bloom Filters

Bloom filter accuracy vs. size is a tunable tradeoff:

- **Lower FPP (false positive probability)**: More accurate, larger bloom filter.
- **Higher FPP**: Less accurate, smaller bloom filter.

Common FPP settings:

- `0.01` (1%): Very accurate, ~10 bits per element
- `0.05` (5%): Good balance, ~6 bits per element
- `0.10` (10%): Space-efficient, ~5 bits per element

For most analytical workloads, 1–5% FPP provides the right balance between accuracy (skip rate) and bloom filter overhead in the Parquet footer.

## When to Use Bloom Filters

Bloom filters are most valuable for:

1. **High-cardinality ID columns**: `user_id`, `order_id`, `device_id`, `session_id` — min/max is useless, bloom filters are ideal.
2. **Hash/UUID columns**: Even min/max doesn't help for random UUIDs.
3. **Low-selectivity point lookups on large tables**: Where a typical query filters to <0.01% of rows.

Bloom filters add overhead to writes (computing the filter) and add size to file footers. Don't enable them for:

- Low-cardinality columns (`status`, `region`) — min/max is sufficient and more compact.
- Columns rarely used in equality predicates.
- Write-heavy tables where write latency matters more than read performance.

## Bloom Filters and Iceberg Compaction

Bloom filters are only as fresh as the last file rewrite. If new rows are appended to a table (new files without bloom filters), those files don't benefit from bloom filter skipping.

For tables where bloom filters are critical for performance, include bloom filter generation in your compaction strategy:

```sql
-- Compaction with bloom filter enabled on output files
CALL system.rewrite_data_files(
  table => 'db.orders',
  options => map(
    'write.parquet.bloom-filter-enabled.column.user_id', 'true',
    'write.parquet.bloom-filter-fpp.column.user_id', '0.05'
  )
);
```
