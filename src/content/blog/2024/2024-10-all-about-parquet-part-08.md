---
title: "Read and Write Parquet Files in Python (PyArrow, Pandas)"
pubDatetime: 2024-10-21T09:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2024-10-21"
description: "How to read and write Parquet files in Python with PyArrow, FastParquet, and Pandas, including column selection, compression, and partitioned datasets."
author: "Alex Merced"
category: "Data Lakehouse"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - data lakehouse
  - data engineering
  - apache parquet
slug: 2024-10-all-about-parquet-part-08
image: "/images/blog.png"
faqs:
  - question: "How do I read a Parquet file in Python?"
    answer: "Install PyArrow and call pyarrow.parquet.read_table('file.parquet'), then .to_pandas() if you want a DataFrame. With Pandas installed, pd.read_parquet('file.parquet') does the same in one line and uses PyArrow under the hood by default."
  - question: "How do I write a DataFrame to Parquet in Python?"
    answer: "Call df.to_parquet('file.parquet') in Pandas, or convert with pa.Table.from_pandas(df) and write with pq.write_table(table, 'file.parquet'). PyArrow compresses with Snappy by default, and you can pass compression='zstd' for smaller files."
  - question: "Should I use PyArrow or FastParquet?"
    answer: "Start with PyArrow for most projects. It has the most complete Parquet support, handles partitioned datasets and filters, and is the default engine in Pandas. FastParquet is lighter to install and works well for simple reads and writes in Pandas and Dask workflows."
  - question: "How do I read only some columns from a Parquet file?"
    answer: "Pass a columns list, for example pq.read_table('file.parquet', columns=['Name', 'Age']) or pd.read_parquet('file.parquet', columns=['Name', 'Age']). Because Parquet is columnar, the other columns are never read from disk."
---

- [Free Copy of Apache Iceberg the Definitive Guide](https://hello.dremio.com/wp-apache-iceberg-the-definitive-guide-reg.html?utm_source=alexmerced&utm_medium=external_blog&utm_campaign=allaboutparquet)
- [Free Apache Iceberg Crash Course](https://hello.dremio.com/webcast-an-apache-iceberg-lakehouse-crash-course-reg.html?utm_source=alexmerced&utm_medium=external_blog&utm_campaign=allaboutparquet)
- [Iceberg Lakehouse Engineering Video Playlist](https://www.youtube.com/watch?v=SIriNcVIGJQ&list=PLsLAVBjQJO0p0Yq1fLkoHvt2lEJj5pcYe)

In previous posts, we explored the internal workings of the Parquet format and how it optimizes storage and performance. Now, it's time to dive into the practical side: how to **read and write Parquet files in Python**. With libraries like **PyArrow** and **FastParquet**, Python makes working with Parquet easy and efficient. In this post, we’ll walk through how to use these tools to handle Parquet files, covering both reading from and writing to Parquet.

## Why Use Parquet in Python?

Parquet has become a go-to format for handling large datasets, especially in the data engineering and analytics world. Here’s why you might choose Parquet over other formats (like CSV or JSON) when working in Python:

- **Efficient Data Storage**: Parquet's columnar format reduces file sizes and speeds up queries, making it ideal for large datasets.
- **Interoperability**: Parquet works seamlessly with distributed data processing tools like Apache Spark, Dremio, and Hadoop, as well as cloud storage services like AWS S3.
- **Schema Enforcement**: Parquet supports structured data and schema enforcement, ensuring data consistency.
- **Compatibility**: Python libraries like **PyArrow** and **FastParquet** make it easy to integrate Parquet with popular Python data science tools like Pandas.

Let’s start by looking at two of the most popular libraries for working with Parquet in Python: **PyArrow** and **FastParquet**.

## PyArrow: A Complete Parquet Solution

**PyArrow** is part of the Apache Arrow project and provides full support for Parquet. It’s widely used for reading and writing Parquet files and works seamlessly with other Arrow libraries. Let’s walk through how to use PyArrow to read and write Parquet files.

### Installing PyArrow

First, you’ll need to install PyArrow. You can do this with pip:

```bash
pip install pyarrow
```

### Writing Parquet Files with PyArrow

Writing data to a Parquet file using PyArrow is straightforward. Below is an example of how to write a Pandas DataFrame to Parquet:

```python
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# Create a sample DataFrame
df = pd.DataFrame({
    'Name': ['Alice', 'Bob', 'Charlie'],
    'Age': [25, 30, 35],
    'Salary': [50000, 60000, 70000]
})

# Convert the DataFrame to an Arrow Table
table = pa.Table.from_pandas(df)

# Write the Arrow Table to a Parquet file
pq.write_table(table, 'sample.parquet', compression='zstd')
```

In this example, we first create a Pandas DataFrame, convert it to an Arrow Table (using `pa.Table.from_pandas`), and then write it to a Parquet file using `pq.write_table`. PyArrow compresses with Snappy unless you pass a `compression` argument; here we ask for Zstandard, which usually produces smaller files at similar read speed.

### Reading Parquet Files with PyArrow

Reading Parquet files with PyArrow is just as simple. You can load the data from a Parquet file into a Pandas DataFrame as follows:

```python
# Read the Parquet file into an Arrow Table
table = pq.read_table('sample.parquet')

# Read only the columns you need
names_and_ages = pq.read_table('sample.parquet', columns=['Name', 'Age'])

# Convert the Arrow Table to a Pandas DataFrame
df = table.to_pandas()
print(df)
```

This code reads the Parquet file into an Arrow Table using `pq.read_table`, then converts it into a Pandas DataFrame using `to_pandas`. Passing `columns` reads only those columns from disk, which is one of the biggest advantages of a columnar format.

### PyArrow and Partitioned Datasets

In many real-world use cases, especially in data lakes, Parquet files are partitioned by columns to improve query performance. PyArrow makes it easy to work with partitioned datasets:

```python
# Write partitioned Parquet files (one folder per Age value)
pq.write_to_dataset(table, root_path='dataset/', partition_cols=['Age'])

# Read the whole partitioned dataset back as one table
table = pq.read_table('dataset/')

# Or read just one partition with a filter
over_28 = pq.read_table('dataset/', filters=[('Age', '>', 28)])
print(over_28.to_pandas())
```

In this example, we write the dataset into multiple Parquet files partitioned by the Age column. You can later read the entire partitioned dataset as a single table, or pass `filters` so PyArrow skips partitions that cannot match.

## FastParquet: A Lightweight Alternative

FastParquet is another library for working with Parquet files in Python, maintained alongside the Dask project, and it integrates closely with Pandas. Its main appeal is a smaller dependency footprint than PyArrow.

### Installing FastParquet

You can install FastParquet using pip:

```bash
pip install fastparquet
```

### Writing Parquet Files with FastParquet

Writing a Parquet file using FastParquet is very similar to PyArrow:

```python
import pandas as pd
import fastparquet as fp

# Create a sample DataFrame
df = pd.DataFrame({
    'Name': ['Alice', 'Bob', 'Charlie'],
    'Age': [25, 30, 35],
    'Salary': [50000, 60000, 70000]
})

# Write the DataFrame to a Parquet file
fp.write('sample_fp.parquet', df, compression='SNAPPY')
```

Here, we directly write the Pandas DataFrame to a Parquet file using FastParquet’s `write` function. Note that FastParquet does not compress by default, so pass a `compression` value explicitly.

### Reading Parquet Files with FastParquet

Reading Parquet files with FastParquet is just as easy:

```python
# Read the Parquet file into a Pandas DataFrame
df = fp.ParquetFile('sample_fp.parquet').to_pandas()
print(df)
```

FastParquet loads Parquet files straight into Pandas DataFrames, which suits data science and analytics workflows.

### FastParquet and Partitioned Datasets

FastParquet also supports reading and writing partitioned datasets. Partitioning requires a multi-file scheme such as `hive`; with the default `simple` scheme, `partition_on` is ignored:

```python
# Write partitioned Parquet files in a Hive-style directory tree
fp.write('dataset_fp/', df, partition_on=['Age'], file_scheme='hive')

# Read a partitioned dataset
df = fp.ParquetFile('dataset_fp/').to_pandas()
print(df)
```

In this example, we partition the dataset by the Age column and later read it back into a Pandas DataFrame.

## The Shortest Path: Pandas

If you just need to move a DataFrame in and out of Parquet, Pandas wraps both libraries:

```python
df.to_parquet('sample_pd.parquet')
df = pd.read_parquet('sample_pd.parquet', columns=['Name', 'Salary'])
```

With the default `engine='auto'`, Pandas uses PyArrow and falls back to FastParquet only if PyArrow is not installed.

## PyArrow vs. FastParquet: Which to Choose?

Both PyArrow and FastParquet can read and write Parquet files in Python, but they have different strengths:

**PyArrow:** Offers the most complete support for the Parquet format and works with the broader Apache Arrow ecosystem, including DuckDB, Polars, and many lakehouse tools. It’s the better choice for partitioned datasets, filters, and advanced compression and encoding options, and it is the engine Pandas uses by default.

**FastParquet:** Is lighter to install and fits naturally into Pandas and Dask workflows. It is a reasonable option for simple reading and writing when you want to avoid the PyArrow dependency.

Ultimately, the choice between the two depends on your specific use case. For most new projects, start with PyArrow. Reach for FastParquet when a smaller dependency footprint matters more than feature coverage.

## Frequently Asked Questions

### How do I read a Parquet file in Python?

Install PyArrow and call pyarrow.parquet.read_table('file.parquet'), then .to_pandas() if you want a DataFrame. With Pandas installed, pd.read_parquet('file.parquet') does the same in one line and uses PyArrow under the hood by default.

### How do I write a DataFrame to Parquet in Python?

Call df.to_parquet('file.parquet') in Pandas, or convert with pa.Table.from_pandas(df) and write with pq.write_table(table, 'file.parquet'). PyArrow compresses with Snappy by default, and you can pass compression='zstd' for smaller files.

### Should I use PyArrow or FastParquet?

Start with PyArrow for most projects. It has the most complete Parquet support, handles partitioned datasets and filters, and is the default engine in Pandas. FastParquet is lighter to install and works well for simple reads and writes in Pandas and Dask workflows.

### How do I read only some columns from a Parquet file?

Pass a columns list, for example pq.read_table('file.parquet', columns=['Name', 'Age']) or pd.read_parquet('file.parquet', columns=['Name', 'Age']). Because Parquet is columnar, the other columns are never read from disk.

## Conclusion

Python provides excellent libraries for reading and writing Parquet files, with PyArrow and FastParquet being two of the most popular options. Whether you need advanced features like partitioning and schema handling (PyArrow) or a lightweight, fast solution for simple file manipulation (FastParquet), both libraries offer robust support for the Parquet format.

In the next post, we’ll explore how Parquet fits into modern data lake architectures and how it powers data lakehouses with technologies like Apache Iceberg and Delta Lake.

Stay tuned for part 9: **Parquet in Data Lake Architectures**.
