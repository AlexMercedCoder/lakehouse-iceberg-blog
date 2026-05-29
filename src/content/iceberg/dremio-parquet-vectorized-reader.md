---
term: "Dremio Parquet Vectorized Reader"
description: "Dremio Parquet Vectorized Reader is an engine component that reads columnar Parquet data directly into in-memory Apache Arrow buffers, maximizing L1/L2 cache locality and processor efficiency."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-sabot-engine"
  - "iceberg-parquet"
  - "dremio-columnar-cloud-cache-c3"
keywords:
  - parquet vectorized reader
  - dremio parquet reader
  - columnar reader engine
  - arrow memory mapping
  - query execution read
lastUpdated: 2026-05-29
---

## Dremio Parquet Vectorized Reader

The **Dremio Parquet Vectorized Reader** is a specialized engine component within Dremio's executor nodes responsible for reading Apache Parquet data files. Standard Parquet readers (such as the default record-based reader in older Java frameworks) process files by reading one row at a time, reconstructing row structures in memory before applying filter operations.

Dremio's Parquet Vectorized Reader processes data by reading columns in parallel blocks, mapping them directly into **Apache Arrow** columnar buffers in memory. This eliminates the CPU overhead of row reconstruction and maximizes CPU instruction cache efficiency.

## Vectorized Reading vs. Row-by-Row Reading

The Parquet file format stores data in column segments called Row Groups. This native columnar structure aligns with Dremio's in-memory data layout (Apache Arrow). Dremio's reader leverages this alignment:

- **Direct Memory Copying**: The reader fetches column data pages from disk or cache and loads them directly into Arrow memory buffers. This processes data without memory serialization translations.
- **SIMD Instruction Utilization**: Because data is loaded as contiguous arrays in memory, executors can apply Single Instruction Multiple Data (SIMD) CPU instructions. This allows a single CPU instruction cycle to filter or evaluate multiple data values simultaneously.
- **Volcano Iterator Elimination**: Vectorization avoids the overhead of virtual function calls per record, which is a common performance bottleneck in traditional row-based query engines.

## Performance Enhancements

The Parquet Vectorized Reader works with other Dremio features to optimize I/O paths:

### 1. Column Projection Pushdown

If a query requests only three columns from a table with a hundred columns, the reader accesses only the byte offsets for those specific three columns, skipping the rest of the file.

### 2. Dict-Encoded Filter Pushdown

If a column is dictionary-encoded (a Parquet compression feature), the reader evaluates filter conditions (such as `WHERE state = 'CA'`) against the column's small dictionary before loading the actual data array. If the dictionary does not contain the filter key, the reader skips loading the entire column segment.

### 3. C3 Cache Integration

The reader is integrated with the Columnar Cloud Cache (C3). If data blocks are cached on local NVMe SSDs, the reader streams them directly into RAM at NVMe speeds, saturating CPU execution capabilities.
