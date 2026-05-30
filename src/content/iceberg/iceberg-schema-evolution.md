---
term: "Schema Evolution in Apache Iceberg"
description: "Schema evolution in Apache Iceberg allows you to safely add, drop, rename, reorder, and widen columns in a table without rewriting existing data files, maintaining full backward and forward compatibility."
category: "Core Concepts"
relatedTerms:
  - "what-is-apache-iceberg"
  - "iceberg-table-format"
  - "iceberg-snapshot"
  - "iceberg-metadata-file"
  - "iceberg-partition-evolution"
keywords:
  - iceberg schema evolution
  - apache iceberg add column
  - iceberg rename column
  - iceberg drop column
  - schema changes iceberg
lastUpdated: 2026-05-14
---

## Schema Evolution in Apache Iceberg

**Schema evolution** is one of Apache Iceberg's most practically important features for production data engineering. It allows you to change the structure of an Iceberg table: add columns, rename them, drop them, reorder them, or widen their types: **without rewriting any existing data files** and without breaking downstream readers that were written against an older schema version.

This is in stark contrast to Hive-style tables, where schema changes require either full table rewrites or leave readers confused by missing or mismatched columns.

## How Iceberg Tracks Schema

Iceberg tracks the complete schema history in the **table metadata file** (`metadata.json`). Every schema change creates a new schema version with a unique `schema-id`. The current schema is recorded at the table level, but each snapshot also records the schema-id that was active when it was written.

Crucially, Iceberg assigns each column a **permanent, immutable column ID** at creation time. Column IDs (not column names or positions) are used to map data files to schema fields. This is what makes all schema evolution operations safe.

## Supported Schema Evolution Operations

### Adding Columns

```sql
ALTER TABLE orders ADD COLUMN discount FLOAT;
```

New columns can be added at any position. Existing data files simply return `NULL` for the new column when read. No data rewrite required.

### Dropping Columns

```sql
ALTER TABLE orders DROP COLUMN internal_flag;
```

The column is removed from the schema, but existing data files are not touched. Dropped column data is simply ignored during reads. Column IDs are never reused, preventing silent data corruption.

### Renaming Columns

```sql
ALTER TABLE orders RENAME COLUMN cust_id TO customer_id;
```

Renaming updates the column name in the schema metadata. Since data files reference columns by ID (not name), existing files continue to be read correctly under the new name. No rewrite required.

### Reordering Columns

```sql
ALTER TABLE orders ALTER COLUMN total FIRST;
```

Column display order can be changed without touching data files. The physical position in Parquet files is separate from the logical schema order.

### Widening Types (Promotions)

Iceberg supports safe type promotions that are guaranteed not to lose data:

- `int` → `long`
- `float` → `double`
- `decimal(P, S)` → `decimal(P', S)` where `P' > P`

Narrowing type changes (e.g., `long` → `int`) are not allowed because they would risk data loss.

## What Makes Column ID Tracking Unique

The column ID approach is Iceberg's key innovation over Hive. Consider this scenario:

1. Table has columns: `id`, `name`, `value` (column IDs 1, 2, 3)
2. You drop `name` (ID 2) and add a new column `label` (ID 4).
3. Old data files have column ID 2 (old `name` data): Iceberg knows to skip it.
4. New data files have column ID 4 (`label` data): old files return NULL for column ID 4.

At no point is data silently misread. A system using positional column references (Hive) would read the old `name` data as `label` data: a silent corruption bug.

## Nested Type Evolution

Iceberg supports schema evolution inside nested structures (structs, lists, maps):

- Add fields to a nested struct
- Rename fields in a nested struct
- Add a required or optional element type to a list
- Change the value type of a map

Each nested field also has a permanent column ID, so the same safety guarantees apply recursively.

## Schema Evolution vs. Partition Evolution

Schema evolution changes the **columns** of a table. [Partition evolution](/iceberg/iceberg-partition-evolution/) changes the **partitioning strategy**. Both can be performed without rewriting data, and both are tracked in the table metadata.

## Required vs. Optional Fields

When adding a column, you must specify whether it is optional (nullable) or required:

- **Optional** (default): New column returns NULL for all existing rows. Safe to add at any time.
- **Required**: Implies all rows must have a value. Can only be added if a default value is specified (Iceberg Spec v2+), since existing rows would otherwise violate the constraint.

## Practical Impact

Schema evolution enables data engineering teams to:

- Add new data attributes as the business evolves without pipeline downtime
- Rename columns to match evolving business terminology without ETL rewrites
- Fix type errors (e.g., storing integers as strings) with a type promotion
- Deprecate and clean up old columns over time

For any team managing a production lakehouse, schema evolution is not a nice-to-have: it is the feature that makes the lakehouse viable as a long-term data asset rather than a brittle, rewrite-prone snapshot.
