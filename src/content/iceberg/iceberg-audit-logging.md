---
term: "Iceberg Audit Logging"
description: "Iceberg audit logging captures a complete record of all catalog interactions, table reads, write commits, schema changes, and access control decisions, providing the governance evidence trail required for regulatory compliance and security incident investigation."
category: "Governance & Security"
relatedTerms:
  - "iceberg-access-control"
  - "iceberg-data-lineage"
  - "apache-polaris-catalog"
  - "iceberg-multi-tenant"
  - "iceberg-snapshot"
keywords:
  - iceberg audit logging
  - iceberg access log
  - iceberg compliance audit
  - iceberg catalog audit
  - iceberg data access tracking
lastUpdated: 2026-05-14
---

## Iceberg Audit Logging

**Audit logging** in Apache Iceberg captures a complete, tamper-evident record of all data operations: who accessed what table, when, what operation was performed, and what data was read or written. Audit logs are critical for regulatory compliance (SOC 2, HIPAA, GDPR, PCI-DSS), security incident investigation, and governance accountability in enterprise data environments.

Iceberg provides audit-relevant information at multiple layers: the catalog layer (who accessed which tables), the snapshot layer (what was written and when), and the query engine layer (what SQL was executed).

## Audit Information in Iceberg Metadata

### Snapshot-Level Audit Information

Every Iceberg snapshot is an immutable audit record:

```sql
-- Spark: view the complete write audit trail for a table
SELECT
    snapshot_id,
    committed_at,
    operation,
    summary['spark.app.id'] as job_id,
    summary['spark.sql.sources.provider'] as source,
    summary['added-records'] as records_added,
    summary['deleted-records'] as records_deleted,
    summary['added-files-size'] as bytes_added
FROM db.orders.snapshots
ORDER BY committed_at;
```

The snapshot summary can include engine-specific metadata:

- Spark job ID and application name.
- User who submitted the job (via cluster security configuration).
- Source query text (some engines log this).

### Schema Change Audit Trail

```sql
-- View all schema changes with timestamps
SELECT * FROM db.orders.metadata_log
ORDER BY timestamp_ms;
```

This shows every metadata file change — which corresponds to every schema evolution, partition evolution, or write operation.

## Catalog-Level Audit Logging (Apache Polaris)

Apache Polaris (the Iceberg REST Catalog co-created by Dremio and Snowflake) provides server-side audit logging of all catalog API interactions:

### What Polaris Logs

- **Authentication events**: Login attempts (success and failure), token issuance.
- **Authorization events**: Access control decisions (grant, deny) for every table access request.
- **Catalog operations**: CREATE TABLE, DROP TABLE, RENAME TABLE, CREATE NAMESPACE, etc.
- **Table access**: Every `LoadTable` request (indicating read intent) by principal.
- **Credential vending**: Every credential issuance event (what credentials were vended to whom for what resource).
- **Schema changes**: Every `UpdateTable` request that modifies the schema or partition spec.

### Log Format

Polaris audit logs are typically emitted as structured JSON events:

```json
{
  "timestamp": "2026-05-14T10:30:00.000Z",
  "event_type": "TABLE_READ",
  "principal": "svc-ml-pipeline",
  "catalog": "production",
  "namespace": ["analytics"],
  "table": "user_features",
  "action": "LoadTable",
  "result": "SUCCESS",
  "credential_vended": true,
  "storage_path": "s3://my-bucket/warehouse/analytics/user_features/",
  "request_id": "req-abc-123"
}
```

### Sending Logs to SIEM

Polaris audit logs can be forwarded to security information and event management (SIEM) systems:

```yaml
# Polaris logging configuration (polaris.yml)
audit:
  enabled: true
  backend: cloudwatch # or: file, kafka, elasticsearch
  cloudwatch:
    log-group: /polaris/audit
    region: us-east-1
```

## Query Engine Audit Logging (Dremio)

Dremio provides comprehensive query-level audit logging:

- Every SQL query submitted (text, user, timestamp, source IP).
- Query execution results (rows returned, bytes scanned, execution time).
- Dataset access (which Iceberg tables and views were accessed for each query).
- User authentication and session events.

Dremio audit logs integrate with Splunk, Elasticsearch, and CloudWatch.

## Compliance Use Cases

### SOC 2 Compliance

SOC 2 requires demonstrating:

- Who has access to sensitive data (→ Polaris RBAC + audit log of role assignments).
- What data was accessed and when (→ Polaris access logs + Iceberg snapshot history).
- Evidence of access reviews (→ export role assignments and access logs periodically).

### GDPR Article 30 (Records of Processing)

GDPR requires maintaining records of data processing activities:

- What personal data is stored (→ table schema + column-level PII tagging).
- Who processes it (→ Polaris audit log of access by service principal).
- For what purpose (→ table property "data-product.purpose" metadata).

### Data Access Request Response

When a user exercises their right to know what data you hold about them:

- Query Iceberg tables for the user's records.
- Query audit logs for all accesses of those records.
- Report both the data held and the access history.

## Immutability of Audit Records

Iceberg snapshot history is inherently append-only and immutable — old snapshots cannot be retroactively modified. This makes Iceberg's built-in audit trail tamper-evident:

- A snapshot committed on 2026-05-14 with 1,000 records cannot be changed to say it had 500 records.
- Schema changes are permanently recorded in the metadata history.

For complete compliance, supplement Iceberg's immutable snapshot audit trail with catalog-level audit logs stored in an immutable log store (S3 with Object Lock, CloudWatch Logs with retention policy).
