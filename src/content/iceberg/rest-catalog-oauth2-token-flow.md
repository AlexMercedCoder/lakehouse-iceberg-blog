---
term: "REST Catalog OAuth2 Token Flow"
description: "The standardized authentication protocol used by Iceberg REST clients to exchange credentials for secure Bearer tokens to authorize catalog API calls."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "iceberg-rest-catalog"
  - "rest-catalog-credential-vending"
keywords:
  - oauth2 token flow
  - rest catalog oauth
  - bearer token auth
  - iceberg auth
lastUpdated: 2026-05-29
---

## REST Catalog OAuth2 Token Flow

**REST Catalog OAuth2 Token Flow** is the standard protocol defined in the Apache Iceberg REST Catalog specification to authenticate client connections. Rather than sending raw usernames and passwords or long-lived keys with every metadata request, clients use an OAuth2 client credentials flow to get a temporary access token. This flow ensures that all communication between analytical engines and the catalog server is secure and follows industry standards.

### Authentication Process

When a client engine (such as Spark, Trino, or PyIceberg) initializes a connection to a REST catalog, it executes the following steps:

1.  **Token Exchange Request**: The client calls the catalog's authentication endpoint (typically `/v1/oauth/tokens`). It passes authentication parameters such as client credentials, authorization codes, or user credentials.
2.  **Token Generation**: The catalog validates the credentials against its user directory or identity provider (IDP). If valid, it returns an access token (typically a JWT or secure random string) and an expiration time.
3.  **Subsequent Requests**: The client stores the access token in memory. For all subsequent calls to load tables or namespaces, the client includes the token in the HTTP header:

```http
Authorization: Bearer <token_value>
```

4.  **Token Expiry and Refresh**: When the token expires, the client calls the token endpoint again to get a new token, maintaining a continuous connection without user intervention.

### Configuration Example

When setting up a query engine like Apache Spark, the OAuth2 flow is configured using standard catalog properties:

```sql
/* Configure Spark to connect to a REST catalog using OAuth2 credentials */
spark.sql.catalog.rest_prod = org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.rest_prod.type = rest
spark.sql.catalog.rest_prod.uri = https://catalog.example.com/api
spark.sql.catalog.rest_prod.credential = client_id_123:client_secret_xyz
spark.sql.catalog.rest_prod.token = optional_initial_token
```
