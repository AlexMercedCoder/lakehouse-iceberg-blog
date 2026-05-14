---
term: "Iceberg Column Mapping"
description: "Iceberg column mapping decouples the logical column names in the schema from the physical field names in data files using permanent column IDs, enabling seamless column renames and schema evolution without rewriting Parquet files."
category: "Core Concepts"
relatedTerms:
  - "iceberg-schema-evolution"
  - "iceberg-metadata-file"
  - "iceberg-manifest-file"
  - "iceberg-table-format"
  - "iceberg-parquet"
keywords:
  - iceberg column mapping
  - iceberg column id
  - iceberg rename column no rewrite
  - iceberg schema evolution column ids
  - iceberg field id mapping
lastUpdated: 2026-05-14
---

## Iceberg Column Mapping

**Iceberg column mapping** is the mechanism by which Iceberg decouples the **logical schema** (what users and engines see as column names) from the **physical field names** embedded in Parquet (or ORC/Avro) data files. This decoupling is what makes Iceberg's schema evolution operations — particularly column renames — safe without requiring data file rewrites.

Column mapping is controlled by the table property `schema.name-mapping.default` and the mapping mode stored in the table schema.

## The Problem Without Column Mapping

In a Hive table or a naive data lake setup, column names in query results are derived directly from the column names embedded in Parquet file footers. If you rename a column:

1. Old files still use the old name in their footers.
2. New files use the new name.
3. When an engine reads a mix of old and new files, it sees two different columns (old name and new name) — or fails to map them, returning NULL for one or the other.

This forces a full table rewrite on every column rename — unacceptable for large tables.

## How Iceberg Column Mapping Solves This

Iceberg assigns every column a **permanent integer column ID** at creation time. This ID:

- Never changes, even when the column is renamed.
- Is stored in the Iceberg schema metadata.
- Is also embedded in the Parquet file footer (as a field ID annotation in the Parquet schema).

When an engine reads a data file:

1. It reads the Parquet file footer and extracts the column's **field ID**.
2. It looks up that field ID in the current **Iceberg schema** to find the current logical name.
3. It returns data under the current logical name, regardless of what name was used when the file was written.

## Column Mapping Modes

Iceberg supports three column mapping modes, controlled by the table property `schema.name-mapping.default`:

### `none` (Default)

Standard Iceberg column ID behavior — field IDs are written into Parquet footers by Iceberg writers. Reading is by ID. This is the normal mode for all Iceberg-native tables.

### `name` (Name Mapping)

The column is mapped by **name** rather than ID in data files. Used when importing pre-existing Parquet files that don't have Iceberg field IDs in their footers (e.g., files written by Hive or non-Iceberg Spark jobs). A name mapping table stored in metadata defines the name → ID correspondence.

This mode is automatically set during Hive table migration (`migrate` procedure) to allow reading existing files that lack field IDs.

### `id` (ID Mapping)

Column ID-based mapping (the default for all Iceberg-native tables). Parquet files contain field IDs; engines use them to resolve columns.

## The Name Mapping Table

When `schema.name-mapping.default` is set to a name mapping JSON, it provides a fallback for files that don't have field IDs:

```json
[
  { "field-id": 1, "names": ["order_id", "orderId"] },
  { "field-id": 2, "names": ["customer_id", "cust_id", "customerId"] },
  { "field-id": 3, "names": ["total", "order_total"] }
]
```

This mapping says:

- Field with ID 1 is called `order_id` in the schema. Files that use the name `order_id` OR `orderId` map to this field.
- Field with ID 2 maps from any of `customer_id`, `cust_id`, or `customerId`.

This enables reading legacy files with old column names after a rename without rewriting them.

## Practical Impact: Safe Column Renames

The column mapping mechanism makes this workflow safe:

```sql
-- Rename a column
ALTER TABLE db.orders RENAME COLUMN cust_id TO customer_id;
```

- New writes use `customer_id` in their Parquet footers.
- Old files still have `cust_id` in their footers, but they are read by field ID — the ID for `cust_id` is the same as for `customer_id` (it's just been renamed in the schema).
- All reads return results under `customer_id` regardless of file age.
- Zero data rewrite required.

## Column Mapping and Nested Types

Column mapping applies recursively to nested struct fields. Each nested field also has a permanent field ID. This means nested field renames are equally safe:

```sql
-- Rename a nested field (struct column)
ALTER TABLE db.events ALTER COLUMN metadata.user_name RENAME TO metadata.username;
```

The field ID for `user_name` is preserved; the rename updates only the schema entry. Old files continue to be read correctly.

## Inspecting Column Mapping

```python
# PyIceberg: inspect the schema with field IDs
from pyiceberg.catalog import load_catalog

catalog = load_catalog("my_catalog", **{...})
table = catalog.load_table("db.orders")

for field in table.schema().fields:
    print(f"ID: {field.field_id}, Name: {field.name}, Type: {field.field_type}")
```

```
ID: 1, Name: order_id, Type: LongType()
ID: 2, Name: customer_id, Type: LongType()
ID: 3, Name: total, Type: DoubleType()
```
