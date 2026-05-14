---
term: "Iceberg Encryption"
description: "Apache Iceberg supports column-level and file-level encryption through its encryption specification, enabling sensitive data to be protected at rest within Parquet data files using key management services while maintaining full queryability on authorized clients."
category: "File & Metadata Layer"
relatedTerms:
  - "iceberg-parquet"
  - "iceberg-data-files"
  - "iceberg-access-control"
  - "iceberg-table-properties"
  - "apache-polaris-catalog"
keywords:
  - iceberg encryption
  - iceberg parquet encryption
  - iceberg column encryption
  - iceberg data at rest encryption
  - iceberg kms encryption
lastUpdated: 2026-05-14
---

## Iceberg Encryption

**Apache Iceberg supports encryption at the data file level** through its encryption specification, which integrates with Apache Parquet's native encryption capabilities. Iceberg encryption allows:

- **Column-level encryption**: Different columns can be encrypted with different keys, enabling fine-grained access control where authorized consumers can decrypt specific columns.
- **File-level encryption**: All data in a file is encrypted under a single key.
- **Key management integration**: Encryption keys are managed by external Key Management Systems (KMS) like AWS KMS, GCP Cloud KMS, Azure Key Vault, or HashiCorp Vault — not stored in the data files.

## The Encryption Model

Iceberg uses a **key wrapping** model:

1. A **Data Encryption Key (DEK)** is generated for each Parquet file (or column group).
2. The DEK encrypts the actual data within the Parquet file.
3. The DEK itself is encrypted using a **Key Encryption Key (KEK)** from the KMS.
4. The encrypted DEK (wrapped DEK) is stored in the Parquet file footer.

To decrypt a file:

1. Reader contacts KMS to unwrap (decrypt) the DEK using the KEK.
2. Reader uses the DEK to decrypt the column data.

The KMS never receives raw data — it only wraps/unwraps keys. This ensures KMS cannot be used to exfiltrate data.

## Parquet Encryption and Iceberg

Iceberg encryption is built on top of **Parquet Modular Encryption** (PME), introduced in Parquet 1.12.0:

- **Column-level encryption**: Each column can have its own encryption key.
- **Footer encryption**: The Parquet file footer (schema, row group metadata) can also be encrypted, preventing metadata leakage.
- **Key metadata**: The encrypted key and key identifier are stored in the Parquet footer for retrieval during decryption.

```
Parquet File Structure (with encryption):
  Row Group 1:
    Column customer_id [ENCRYPTED with DEK_customer]
    Column total       [PLAINTEXT]
    Column email       [ENCRYPTED with DEK_pii]
  Row Group 2:
    ...
  Footer:
    Schema (optionally encrypted)
    Encrypted DEK_customer (wrapped with KMS key arn:aws:kms:...:key/customer-key-id)
    Encrypted DEK_pii (wrapped with KMS key arn:aws:kms:...:key/pii-key-id)
```

## Iceberg Encryption Configuration

### Spark + AWS KMS

```python
# Spark: configure Iceberg encryption with AWS KMS
spark = SparkSession.builder \
    .config("spark.sql.parquet.encryption.kms.client.class",
            "org.apache.parquet.crypto.keytools.mocks.InMemoryKMS") \
    .getOrCreate()

# Table with column-level encryption
spark.sql("""
    CREATE TABLE db.customers (
        customer_id BIGINT,
        name        STRING,
        email       STRING,
        total_orders INT
    ) USING iceberg
    TBLPROPERTIES (
        'write.parquet.encryption.enabled' = 'true',
        'write.parquet.encryption.column.email' =
            'arn:aws:kms:us-east-1:123456789:key/pii-encryption-key',
        'write.parquet.encryption.footer.key' =
            'arn:aws:kms:us-east-1:123456789:key/footer-encryption-key'
    )
""")
```

### Encryption Key Metadata in Table Properties

Column-specific encryption is configured via table properties:

```sql
ALTER TABLE db.customers SET TBLPROPERTIES (
    'write.parquet.encryption.enabled' = 'true',
    'write.parquet.encryption.column.email' = '<kms-key-id-for-pii>',
    'write.parquet.encryption.column.phone' = '<kms-key-id-for-pii>',
    'write.parquet.encryption.column.ssn' = '<kms-key-id-for-pii-sensitive>',
    'write.parquet.encryption.footer.key' = '<kms-key-id-for-footer>'
);
```

## Iceberg Encryption vs. Storage Encryption

| Encryption Type              | What's Protected              | Granularity   | Who Manages Keys     |
| ---------------------------- | ----------------------------- | ------------- | -------------------- |
| Cloud storage (SSE-S3, CMEK) | All objects in bucket         | File level    | Cloud provider / IAM |
| Parquet column encryption    | Specific columns within files | Column level  | Your KMS             |
| Iceberg encryption spec      | Per-file data encryption      | File / column | Your KMS             |
| TLS (in-transit)             | Data in network transfer      | Connection    | Certificates         |

Cloud storage encryption is always on by default on major clouds. Column-level Iceberg encryption adds an additional layer for columns requiring fine-grained key management — typically the most sensitive PII columns.

## Access Control via Encryption

Column encryption can enforce access control independently of the catalog RBAC:

- The KMS can restrict which IAM roles or service accounts can unwrap specific KEKs.
- Even if an unauthorized user bypasses the catalog and reads the raw Parquet files from S3, they cannot decrypt the PII columns without KMS access.

This "defense in depth" approach:

1. Catalog RBAC: first line of defense.
2. Object storage IAM: second line of defense.
3. Column encryption: cryptographic guarantee even if storage access is compromised.

## Encryption and Compaction

Compaction must be able to decrypt existing files and re-encrypt output files using the same or new keys. Ensure the compaction job's service account has KMS access to both decrypt (old files) and encrypt (new files). Key rotation is possible during compaction by changing the KMS key references in table properties before running `rewrite_data_files`.
