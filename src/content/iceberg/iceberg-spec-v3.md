---
term: "Apache Iceberg Spec v3"
description: "Apache Iceberg Spec v3 introduces deletion vectors for more efficient row-level deletes, the Variant data type for semi-structured data, native geospatial geometry types, row lineage tracking, type widening, and default column values — the most significant evolution since Spec v2."
category: "Core Concepts"
relatedTerms:
  - "iceberg-spec-v1-vs-v2"
  - "iceberg-sequence-number"
  - "iceberg-delete-files"
  - "iceberg-positional-deletes"
  - "iceberg-table-format"
  - "iceberg-spec-v4"
keywords:
  - iceberg spec v3
  - iceberg format version 3
  - iceberg deletion vectors
  - iceberg variant type
  - iceberg v3 features
lastUpdated: 2026-05-14
---

## Apache Iceberg Spec v3

**Apache Iceberg Spec v3** is the third major version of the Iceberg table format specification, representing the most significant evolution of the format since Spec v2 introduced row-level deletes and sequence numbers. Spec v3 focuses on three major themes: **more efficient row-level operations** (deletion vectors), **richer data types** (Variant, geometry), and **improved data quality mechanics** (type widening, default values, row lineage).

As of 2025, Spec v3 features are being actively merged into the Apache Iceberg codebase and adopted by major engines. Tables must be explicitly upgraded to v3 to use new features.

## Key Features in Spec v3

### 1. Deletion Vectors

**Deletion vectors** (DVs) are the most operationally impactful addition in Spec v3. They replace positional delete files with a more compact, file-local mechanism for recording deleted rows.

**Spec v2 positional deletes**: A separate delete file records `(file_path, row_position)` pairs. For tables with frequent updates/deletes, the number of positional delete files multiplies rapidly, increasing metadata overhead and read amplification.

**Spec v3 deletion vectors**: A compact **Roaring Bitmap** encoding of deleted row positions is stored as a blob associated with the specific data file it targets — similar to Delta Lake's deletion vectors. Key improvements:

- **No separate delete file per data file**: The DV is stored as a Puffin blob or inline reference, not as a separate Avro manifest entry.
- **O(1) lookup per row**: Checking if a row is deleted is a bitmap lookup, not a sort-merge join.
- **Smaller storage footprint**: Roaring Bitmaps are extremely compact for sparse deletions.
- **Faster reads**: No delete-file join during scan — just apply the bitmap.

```sql
-- Upgrade a table to Spec v3 (enables deletion vector support)
ALTER TABLE db.orders SET TBLPROPERTIES ('format-version' = '3');

-- Subsequent DELETEs use deletion vectors instead of positional delete files
DELETE FROM db.orders WHERE order_id = 12345;
-- → Creates/updates a DV bitmap for the target data file
```

### 2. Variant Data Type

The **Variant** type is a new Iceberg schema type for storing semi-structured, schema-flexible data — analogous to `SUPER` in Redshift, `VARIANT` in Snowflake, or `JSON` in PostgreSQL.

Key characteristics:

- Stored using the **Shredding** encoding in Parquet: frequently accessed top-level fields are "shredded" into typed Parquet columns for efficient access, while the full unshredded value is kept for dynamic field access.
- No separate JSON parsing on read — shredded fields are accessible as native Parquet columns.
- Supports nested objects, arrays, and mixed types.

```sql
-- Spec v3: create a table with a Variant column
CREATE TABLE db.events (
    event_id   BIGINT,
    event_ts   TIMESTAMP,
    payload    VARIANT    -- semi-structured event payload
) USING iceberg;

-- Insert JSON-like data
INSERT INTO db.events VALUES (
    1001,
    TIMESTAMP '2026-05-14 10:00:00',
    PARSE_JSON('{"user_id": 42, "action": "click", "metadata": {"page": "/home"}}')
);

-- Access shredded fields efficiently (no full parse)
SELECT payload:user_id, payload:action FROM db.events;
```

Variant solves a long-standing pain point: storing event payloads, API responses, and other semi-structured data in Iceberg without pre-defining a rigid schema.

### 3. Geometry / Geospatial Types

Spec v3 introduces native **geometry types** for geospatial data:

- `geometry(Point)`, `geometry(LineString)`, `geometry(Polygon)`
- `geometry(MultiPoint)`, `geometry(MultiLineString)`, `geometry(MultiPolygon)`
- `geometry(GeometryCollection)`
- Support for coordinate reference systems (WGS84, etc.)

Stored in Parquet using the WKB (Well-Known Binary) encoding with optional spatial indexes in Puffin files for fast geospatial filtering.

```sql
-- Spec v3: geospatial table
CREATE TABLE db.store_locations (
    store_id  BIGINT,
    name      STRING,
    location  geometry(Point)
) USING iceberg;

-- Query with spatial predicates (engine support required)
SELECT store_id, name FROM db.store_locations
WHERE ST_Distance(location, ST_Point(-73.9857, 40.7484)) < 1000;
```

### 4. Row Lineage

Spec v3 introduces **row lineage** — a mechanism for assigning persistent, unique row IDs to each row that survive compaction and other rewrite operations. Row lineage enables:

- Tracking the origin of a row across transformations.
- Precise change data capture that can identify individual updated rows.
- Better semantics for streaming rowwise change propagation.

Row IDs are assigned at write time and preserved during compaction (the new compact files reference the original row IDs).

### 5. Type Widening

**Type widening** allows certain type promotions to be applied as metadata-only schema changes — no data files need to be rewritten:

| Widening                         | Description                 |
| -------------------------------- | --------------------------- |
| `int` → `long`                   | 32-bit to 64-bit integer    |
| `float` → `double`               | 32-bit to 64-bit float      |
| `decimal(p,s)` → `decimal(p',s)` | Precision increase          |
| `date` → `timestamp`             | Date to timestamp promotion |

Pre-Spec v3, type promotions required rewriting all data files to convert existing values. With type widening, the schema change is recorded in metadata; the reader applies widening during scan.

### 6. Default Column Values

Spec v3 formalizes **default values** for columns: when a new column is added with a default, the Iceberg reader supplies the default value for rows in old files that don't have the column. This is especially important for required fields (introduced in Spec v2) — you can now safely add required fields with defaults without rewriting data.

```sql
-- Add a new required column with a default (no data rewrite)
ALTER TABLE db.orders ADD COLUMN channel STRING NOT NULL DEFAULT 'web';
-- Old rows: reader supplies 'web' for missing column
-- New rows: must explicitly set channel
```

## Engine Adoption Status (2025)

| Engine                       | Spec v3 Status                  |
| ---------------------------- | ------------------------------- |
| Apache Spark (iceberg-spark) | In development                  |
| Apache Flink                 | In development                  |
| Trino                        | Partial (reading)               |
| Dremio                       | Roadmap                         |
| PyIceberg                    | Deletion vectors in development |

Spec v3 adoption is in progress across all major engines. Expect broad production support in 2025–2026.

## Upgrading to Spec v3

```sql
ALTER TABLE db.orders SET TBLPROPERTIES ('format-version' = '3');
```

The upgrade is metadata-only and non-destructive. Existing v2 files remain valid — Spec v3 adds new capabilities while maintaining backward compatibility with v2 manifests.
