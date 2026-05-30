---
term: "Iceberg REST Catalog API Reference"
description: "The Apache Iceberg REST Catalog specification defines a standardized HTTP API for catalog operations: namespace management, table CRUD, snapshot commits, view management, and credential vending, enabling any Iceberg-compatible engine to connect to any compliant catalog implementation."
category: "Catalogs"
relatedTerms:
  - "iceberg-rest-catalog"
  - "apache-polaris-catalog"
  - "iceberg-catalog"
  - "iceberg-concurrent-writes"
  - "project-nessie"
keywords:
  - iceberg rest catalog api
  - iceberg rest api spec
  - iceberg rest catalog endpoints
  - iceberg catalog api reference
  - iceberg rest spec
lastUpdated: 2026-05-14
---

## Iceberg REST Catalog API Reference

The **Iceberg REST Catalog specification** (introduced in Iceberg 0.14.0 and evolved since) defines a standard HTTP API that any catalog implementation must expose for Iceberg-compatible engines to connect. This is what makes Iceberg truly multi-engine: every engine uses the same REST API to talk to any catalog: Apache Polaris, Project Nessie, AWS Glue (via adapter), and others.

The spec is formally documented at [iceberg.apache.org/spec](https://iceberg.apache.org/spec/) and the OpenAPI spec at [github.com/apache/iceberg](https://github.com/apache/iceberg/blob/main/open-api/rest-catalog-open-api.yaml).

## Base URL and Authentication

All REST Catalog endpoints are relative to a configurable base URI:

```
Base URI: https://my-catalog.example.com
Prefix: /iceberg  (configurable)
Full base: https://my-catalog.example.com/iceberg
```

Authentication is provider-specific but typically:

- **OAuth2 Bearer Token**: `Authorization: Bearer <token>`
- **Basic Auth**: `Authorization: Basic <base64(user:pass)>`
- **AWS SigV4**: For S3 Tables and Glue REST endpoints.

## Configuration Discovery: GET /v1/config

The first API call any client makes: fetches catalog-level configuration:

```
GET /v1/config?warehouse=my-warehouse
```

Response:

```json
{
  "defaults": {
    "clients": "4"
  },
  "overrides": {
    "warehouse": "s3://my-bucket/warehouse/",
    "credential": "..."
  }
}
```

Configuration merging: client defaults < server defaults < server overrides. Engine merges these with its own properties.

## OAuth Token: POST /v1/oauth/tokens

Fetch an OAuth2 bearer token for subsequent requests:

```
POST /v1/oauth/tokens
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=my-client-id&
client_secret=my-client-secret&
scope=PRINCIPAL_ROLE:my-role
```

Response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token"
}
```

## Namespace Operations

### List Namespaces: GET /v1/namespaces

```
GET /v1/namespaces?parent=analytics
Authorization: Bearer <token>
```

Response:

```json
{
  "namespaces": [
    ["analytics", "bronze"],
    ["analytics", "silver"],
    ["analytics", "gold"]
  ]
}
```

### Create Namespace: POST /v1/namespaces

```
POST /v1/namespaces
Content-Type: application/json

{
  "namespace": ["analytics", "gold"],
  "properties": {
    "owner": "data-team@company.com",
    "location": "s3://my-bucket/warehouse/analytics/gold/"
  }
}
```

### Get Namespace Properties: GET /v1/namespaces/{namespace}

```
GET /v1/namespaces/analytics%1Fgold
```

Response:

```json
{
  "namespace": ["analytics", "gold"],
  "properties": {
    "owner": "data-team@company.com",
    "location": "s3://my-bucket/warehouse/analytics/gold/"
  }
}
```

## Table Operations

### List Tables: GET /v1/namespaces/{namespace}/tables

```
GET /v1/namespaces/analytics%1Fgold/tables
```

Response:

```json
{
  "identifiers": [
    { "namespace": ["analytics", "gold"], "name": "orders" },
    { "namespace": ["analytics", "gold"], "name": "customers" }
  ]
}
```

### Create Table: POST /v1/namespaces/{namespace}/tables

```
POST /v1/namespaces/analytics%1Fgold/tables
Content-Type: application/json

{
  "name": "orders",
  "location": "s3://my-bucket/warehouse/analytics/gold/orders/",
  "schema": {
    "type": "struct",
    "fields": [
      {"id": 1, "name": "order_id", "type": "long", "required": true},
      {"id": 2, "name": "customer_id", "type": "long", "required": true},
      {"id": 3, "name": "total", "type": "double", "required": false},
      {"id": 4, "name": "order_date", "type": "date", "required": true}
    ]
  },
  "partition-spec": {
    "spec-id": 0,
    "fields": [
      {"field-id": 1000, "source-id": 4, "name": "order_date_month", "transform": "month"}
    ]
  },
  "properties": {
    "write.format.default": "parquet",
    "format-version": "2"
  },
  "stage-create": false
}
```

### Load Table: GET /v1/namespaces/{namespace}/tables/{table}

This is the most critical operation: called by every engine before reading or writing:

```
GET /v1/namespaces/analytics%1Fgold/tables/orders
```

Response includes:

```json
{
  "metadata-location": "s3://my-bucket/warehouse/.../metadata/v5.metadata.json",
  "metadata": {
    "format-version": 2,
    "table-uuid": "...",
    "location": "s3://...",
    "last-sequence-number": 5,
    "last-updated-ms": 1715700000000,
    "last-column-id": 4,
    "current-schema-id": 0,
    "schemas": [...],
    "partition-specs": [...],
    "default-spec-id": 0,
    "sort-orders": [...],
    "current-snapshot-id": 8027658604211071520,
    "refs": {"main": {"snapshot-id": 8027658604211071520, "type": "branch"}},
    "snapshots": [...]
  },
  "config": {
    "client.factory": "...",
    "s3.access-key-id": "ASIAXXXXXXXX",    // ← CREDENTIAL VENDING
    "s3.secret-access-key": "...",
    "s3.session-token": "..."
  }
}
```

The `config` section contains **vended credentials**: temporary, scoped storage credentials that the engine uses to access data files directly.

### Commit Table Update: POST /v1/namespaces/{namespace}/tables/{table}

The atomic commit operation:

```
POST /v1/namespaces/analytics%1Fgold/tables/orders
Content-Type: application/json

{
  "identifier": {"namespace": ["analytics", "gold"], "name": "orders"},
  "requirements": [
    {
      "type": "assert-current-snapshot-id",
      "snapshot-id": 8027658604211071520   // ← OPTIMISTIC LOCK
    }
  ],
  "updates": [
    {
      "action": "add-snapshot",
      "snapshot": {
        "snapshot-id": 9135729705312082631,
        "parent-snapshot-id": 8027658604211071520,
        "sequence-number": 6,
        "timestamp-ms": 1715704000000,
        "summary": {"operation": "append", "added-records": "10000"},
        "manifest-list": "s3://my-bucket/warehouse/.../metadata/snap-...avro"
      }
    },
    {
      "action": "set-current-snapshot",
      "snapshot-id": 9135729705312082631
    }
  ]
}
```

If `snapshot-id` in requirements doesn't match the catalog's current snapshot: `HTTP 409 Conflict` → client retries with updated state.

## View Operations (Spec v1)

REST Catalog v1 includes view support:

```
POST /v1/namespaces/{namespace}/views      -- Create view
GET  /v1/namespaces/{namespace}/views/{view} -- Load view
HEAD /v1/namespaces/{namespace}/views/{view} -- Check existence
POST /v1/namespaces/{namespace}/views/{view} -- Commit view update
DELETE /v1/namespaces/{namespace}/views/{view} -- Drop view
```

## Error Codes

| HTTP Code                   | Meaning                                 |
| --------------------------- | --------------------------------------- |
| `400 Bad Request`           | Malformed request                       |
| `401 Unauthorized`          | Authentication failure                  |
| `403 Forbidden`             | Insufficient privileges                 |
| `404 Not Found`             | Namespace or table doesn't exist        |
| `409 Conflict`              | Optimistic concurrency conflict (retry) |
| `500 Internal Server Error` | Catalog error                           |
| `503 Service Unavailable`   | Catalog overloaded                      |
