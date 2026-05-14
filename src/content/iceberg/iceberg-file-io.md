---
term: "Iceberg FileIO API"
description: "The Iceberg FileIO API is an abstraction layer that decouples the Iceberg table format from specific storage system implementations, enabling the same Iceberg code to read and write metadata and data files on S3, ADLS, GCS, HDFS, or any custom storage backend."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-table-format"
  - "iceberg-data-files"
  - "iceberg-metadata-file"
  - "iceberg-encryption"
  - "pyiceberg"
keywords:
  - iceberg fileio
  - iceberg storage abstraction
  - iceberg s3 fileio
  - iceberg custom storage
  - iceberg gcs adls fileio
lastUpdated: 2026-05-14
---

## Iceberg FileIO API

The **Iceberg FileIO API** is the abstraction layer between the Iceberg table format logic and the underlying storage system. Rather than hardcoding Iceberg to work with specific object storage APIs (S3, ADLS, GCS) or file systems (HDFS, local disk), FileIO provides a uniform interface that all storage backends implement.

This means the Iceberg core library — catalog operations, metadata reading, data file scanning — is completely storage-agnostic. Swap the FileIO implementation to switch storage backends without changing any Iceberg code.

## The FileIO Interface

At its core, FileIO provides three operations:

```java
interface FileIO {
    // Open a file for reading (returns SeekableInputStream)
    InputFile newInputFile(String path);
    InputFile newInputFile(String path, long length);  // with known length hint

    // Open a file for writing (returns PositionOutputStream)
    OutputFile newOutputFile(String path);

    // Delete a file (used during expiration and orphan cleanup)
    void deleteFile(String path);
    void deleteFile(InputFile file);
}
```

Any class that implements these three methods can serve as an Iceberg FileIO. The Iceberg libraries handle all the metadata logic; FileIO handles all the storage I/O.

## Available FileIO Implementations

### S3FileIO (AWS S3)

The most commonly used FileIO. Uses the AWS SDK to read and write files on Amazon S3.

```python
# PyIceberg: configure S3FileIO
catalog = load_catalog(
    "my_catalog",
    **{
        "type": "rest",
        "uri": "https://catalog.example.com",
        "s3.region": "us-east-1",
        "s3.access-key-id": "...",
        "s3.secret-access-key": "...",
    }
)
```

### GCSFileIO (Google Cloud Storage)

Uses the Google Cloud Storage Java/Python client.

```python
catalog = load_catalog(
    "my_catalog",
    **{
        "type": "rest",
        "uri": "https://catalog.example.com",
        "gcs.project-id": "my-gcp-project",
    }
)
```

### ADLSFileIO (Azure Data Lake Storage Gen2)

Uses the Azure Storage SDK.

```python
catalog = load_catalog(
    "my_catalog",
    **{
        "type": "rest",
        "uri": "https://catalog.example.com",
        "adls.account-name": "mystorageaccount",
        "adls.account-key": "...",
    }
)
```

### HadoopFileIO

Uses the Hadoop FileSystem API — supports HDFS, local file systems (`file://`), and any Hadoop-compatible storage.

```python
# PyIceberg: local filesystem for development
catalog = load_catalog(
    "local",
    **{
        "type": "sql",
        "uri": "sqlite:///catalog.db",
        "warehouse": "file:///tmp/iceberg-warehouse",
        "py-io-impl": "pyiceberg.io.fsspec.FsspecFileIO",
    }
)
```

### FsspecFileIO (PyIceberg)

PyIceberg's FileIO implementation built on the `fsspec` library — which supports S3, GCS, ADLS, local, and many other storage backends through a unified Python filesystem abstraction.

## FileIO Selection

The FileIO implementation is selected based on the storage URI scheme:

- `s3://`, `s3a://` → S3FileIO
- `gs://` → GCSFileIO
- `abfs://`, `abfss://` → ADLSFileIO
- `hdfs://` → HadoopFileIO
- `file://` → local FileIO

You can also explicitly specify the FileIO class:

```python
# Spark: explicitly specify FileIO
spark.conf.set("spark.sql.catalog.my_catalog.io-impl",
               "org.apache.iceberg.aws.s3.S3FileIO")
```

## FileIO and Credential Vending

When using the Iceberg REST Catalog with credential vending (e.g., Apache Polaris), the catalog provides **short-lived, scoped credentials** as part of the table load response. The FileIO implementation must be able to use these credentials:

- For S3: the catalog vends temporary STS credentials → S3FileIO uses them for the session.
- For ADLS: the catalog vends SAS tokens → ADLSFileIO uses them.
- For GCS: the catalog vends signed URLs or service account keys.

This credential vending + FileIO integration is the core of the "bring your own engine" security model: engines never hold long-lived cloud credentials.

## Custom FileIO

Organizations with custom storage systems (proprietary object stores, specialized caches) can implement the FileIO interface to make Iceberg work with any backend:

```java
public class CustomFileIO implements FileIO {
    @Override
    public InputFile newInputFile(String path) {
        return new CustomInputFile(path);
    }

    @Override
    public OutputFile newOutputFile(String path) {
        return new CustomOutputFile(path);
    }

    @Override
    public void deleteFile(String path) {
        CustomStorageClient.delete(path);
    }
}
```

Register the custom FileIO via the table property:

```properties
io-impl=com.example.CustomFileIO
```
