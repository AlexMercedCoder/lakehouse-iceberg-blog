---
term: "Iceberg Catalog Migration"
description: "Iceberg catalog migration moves tables between catalog implementations (HMS to Polaris, Glue to Nessie, JDBC to REST Catalog) with zero data movement by re-registering existing metadata file locations in the new catalog, preserving all table history and snapshots."
category: "Catalogs"
relatedTerms:
  - "iceberg-catalog"
  - "iceberg-rest-catalog"
  - "apache-polaris-catalog"
  - "iceberg-hive-metastore"
  - "aws-glue-catalog"
keywords:
  - iceberg catalog migration
  - iceberg hms to polaris
  - iceberg migrate catalog
  - iceberg register table
  - iceberg catalog transfer
lastUpdated: 2026-05-14
---

## Iceberg Catalog Migration

**Iceberg catalog migration** is the process of moving Iceberg table registrations from one catalog implementation to another: for example, migrating from the Hive Metastore (HMS) to Apache Polaris, from AWS Glue to Nessie, or from a JDBC catalog to a REST Catalog, without moving, copying, or rewriting any data files.

Because Iceberg catalogs store only **metadata pointers** (the path to the current metadata file), migration is a metadata-only operation: register the existing metadata file location in the new catalog, and the new catalog immediately has access to the complete table history.

## Why Migrate Catalogs?

Common migration motivations:

- **Adopting Iceberg REST Catalog**: Moving from HMS or JDBC to Apache Polaris for multi-engine REST API support.
- **Cloud migration**: Moving from on-premise HMS to AWS Glue or Polaris as part of a cloud migration.
- **Governance improvement**: Moving to a catalog with better RBAC (Polaris, Nessie) from a legacy catalog with limited access control.
- **Consolidation**: Merging multiple catalogs (different teams' JDBC catalogs) into a single enterprise Polaris instance.
- **Switching cloud providers**: Moving from AWS Glue to Azure or GCP-compatible catalog.

## The Migration Mechanism: REGISTER TABLE

The core migration operation is `REGISTER TABLE` (or the catalog's equivalent `load_table_from_metadata`), creating a new catalog entry that points to an existing metadata file:

```sql
-- Spark: register an existing Iceberg table in a new catalog
-- (Table files remain in S3; only the catalog pointer is created)
CALL new_catalog.system.register_table(
  table => 'db.orders',
  metadata_file => 's3://my-bucket/warehouse/db/orders/metadata/v5.metadata.json'
);
```

```python
# PyIceberg: register existing metadata in new catalog
from pyiceberg.catalog import load_catalog

# New catalog (destination)
new_catalog = load_catalog("polaris", **{
    "type": "rest",
    "uri": "https://my-polaris.example.com",
    "credential": "...",
})

# Register the table using its current metadata file path
new_catalog.register_table(
    identifier=("db", "orders"),
    metadata_location="s3://my-bucket/warehouse/db/orders/metadata/v5.metadata.json"
)

# Verify: the full table history is accessible in the new catalog
table = new_catalog.load_table("db.orders")
for snapshot in table.snapshots():
    print(snapshot.snapshot_id, snapshot.timestamp_ms)
```

## Migration Workflow: HMS to Apache Polaris

### Step 1: Inventory Existing Tables

```python
# List all tables in the HMS catalog
hms_catalog = load_catalog("hms", type="hive", uri="thrift://hms-host:9083")

all_tables = []
for namespace in hms_catalog.list_namespaces():
    for table_id in hms_catalog.list_tables(namespace):
        table = hms_catalog.load_table(table_id)
        all_tables.append({
            "id": table_id,
            "metadata_location": table.metadata_location
        })
```

### Step 2: Create Namespaces in Polaris

```python
polaris = load_catalog("polaris", **{
    "type": "rest",
    "uri": "https://my-polaris.example.com",
    "credential": "admin:secret",
})

for namespace in hms_catalog.list_namespaces():
    polaris.create_namespace(namespace)
```

### Step 3: Register Tables

```python
for table_info in all_tables:
    polaris.register_table(
        identifier=table_info["id"],
        metadata_location=table_info["metadata_location"]
    )
    print(f"Registered {table_info['id']} → {table_info['metadata_location']}")
```

### Step 4: Validate

```python
for table_info in all_tables:
    polaris_table = polaris.load_table(table_info["id"])
    hms_table = hms_catalog.load_table(table_info["id"])

    assert polaris_table.metadata_location == hms_table.metadata_location
    assert polaris_table.schema() == hms_table.schema()
    print(f"✅ {table_info['id']} validated")
```

### Step 5: Cut Over

Update all engine configurations to point to the new Polaris catalog. The HMS registration can remain as a fallback during transition, then be removed once all engines are confirmed to be using Polaris.

## Migration Considerations

### No Downtime Required

Because the migration is metadata-only and both catalogs point to the same data files, there is no downtime:

- Old catalog continues serving reads during migration.
- New catalog is registered and validated.
- Engines are updated to use the new catalog one by one.
- Old catalog entries are decommissioned last.

### Write Coordination During Migration

During the cutover period, all writes must go through one catalog only (not both). A split-brain scenario (writes to both old and new catalogs) can cause snapshot divergence. Implement a write freeze period or use catalog-level locking during the final cutover.

### Metadata File Path Accessibility

The new catalog must be able to generate credentials for the object storage path where metadata files are stored. For AWS Glue → Polaris migration, the Polaris instance must have IAM access to read from and write to the S3 paths where the tables live.
