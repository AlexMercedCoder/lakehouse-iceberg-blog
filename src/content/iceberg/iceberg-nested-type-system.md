---
term: "Iceberg Nested Type System"
description: "The set of structural data types - structs, lists, and maps - defined by the Iceberg specification that use unique field IDs to manage complex data structures and support schema evolution."
category: "Iceberg Specification, Schema & Internals"
relatedTerms:
  - "iceberg-schema-evolution"
  - "iceberg-table-metadata-schema"
  - "iceberg-column-mapping"
keywords:
  - iceberg nested types
  - iceberg struct list map
  - schema field ids
lastUpdated: 2026-05-29
---

## Iceberg Nested Type System

The **Iceberg Nested Type System** defines the specifications for representing complex, non-primitive data layouts within table schemas. Unlike traditional table formats that identify nested columns solely by name, Iceberg assigns unique integer field IDs to every component in a schema. This design ensures that nested structures can evolve (e.g. renaming, adding, dropping, or reordering elements) without requiring rewrite operations on the underlying physical files.

### Supported Nested Types

Iceberg specifies three primary nested data structures:

#### 1. Struct

A **Struct** is an ordered tuple of named fields, where each field is assigned a unique field ID. Structs can represent rows, records, or custom nested groups.

- Each field in a struct has a name, a type, a nullability status (optional or required), and a unique field ID.
- The root schema of an Iceberg table is itself defined as a struct.

#### 2. List

A **List** represents a variable-length collection of values of a single type.

- The list contains an `element` field, which is assigned its own unique field ID.
- Elements can be either optional or required.

#### 3. Map

A **Map** represents an associative array of key-value pairs.

- A map defines a `key` field (with a unique field ID) and a `value` field (with a unique field ID).
- Keys are always required, while values can be optional or required.

### Example Schema Representation

The following schema fragment shows how nested types are structured with field IDs:

```json
{
  "type": "struct",
  "fields": [
    { "id": 1, "name": "user_id", "type": "long", "required": true },
    {
      "id": 2,
      "name": "profile",
      "type": {
        "type": "struct",
        "fields": [
          {
            "id": 3,
            "name": "first_name",
            "type": "string",
            "required": false
          },
          { "id": 4, "name": "last_name", "type": "string", "required": false }
        ]
      },
      "required": false
    },
    {
      "id": 5,
      "name": "tags",
      "type": {
        "type": "list",
        "element-id": 6,
        "element-required": true,
        "element": "string"
      },
      "required": false
    }
  ]
}
```

### Schema Evolution Rules

Assigning field IDs to elements inside structs, lists, and maps allows Iceberg to support full name-agnostic evolution:

- **Renaming nested fields**: Modifying `profile.first_name` to `profile.given_name` only updates the JSON metadata schema. Because query engines project data using field ID `3`, they read the physical columns correctly even if the files store the old name.
- **Adding fields to nested structs**: Newly added fields receive a new, unused field ID. When scanning old files that lack this column, the query engine returns null values without error.
