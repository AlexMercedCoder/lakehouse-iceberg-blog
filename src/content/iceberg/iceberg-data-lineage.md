---
term: "Iceberg Data Lineage"
description: "Iceberg data lineage is the ability to trace the origin, transformation history, and downstream consumption of data in Iceberg tables using snapshot metadata, schema evolution history, and catalog audit logs integrated with lineage platforms like OpenLineage and Apache Atlas."
category: "Governance & Security"
relatedTerms:
  - "iceberg-snapshot"
  - "iceberg-schema-evolution"
  - "iceberg-access-control"
  - "iceberg-audit-logging"
  - "apache-polaris-catalog"
keywords:
  - iceberg data lineage
  - iceberg openlineage
  - iceberg metadata lineage
  - iceberg column lineage
  - iceberg data governance
lastUpdated: 2026-05-14
---

## Iceberg Data Lineage

**Data lineage** is the ability to trace where data came from, how it was transformed, and where it flows downstream — a critical capability for regulatory compliance (GDPR, CCPA, HIPAA), debugging data quality issues, understanding impact of schema changes, and building trust in analytical results.

Apache Iceberg's metadata-rich architecture provides a strong foundation for lineage: snapshot history, schema evolution tracking, and catalog audit logs all contribute lineage information. Integrating these with dedicated lineage platforms provides a complete lineage graph.

## Built-In Lineage Signals in Iceberg

### Snapshot History

Every write creates a new snapshot with metadata:

- `committed_at`: Exact timestamp of the write.
- `operation`: The type of operation (`append`, `overwrite`, `delete`, `merge`).
- `summary`: Details including source query, number of records added/deleted, partition counts.
- `parent-snapshot-id`: Links to the previous state, forming a complete audit chain.

```sql
-- View the full write history for a table
SELECT
    snapshot_id,
    committed_at,
    operation,
    summary['added-records'] as records_added,
    summary['source-query'] as source_query
FROM db.orders.snapshots
ORDER BY committed_at;
```

### Schema Evolution History

```sql
-- View schema changes over time
SELECT * FROM db.orders.metadata_log;
```

The metadata log records every schema change — column additions, renames, type promotions — with timestamps. This tells you exactly when a column appeared, when it was renamed, and in what sequence.

### Manifest File Metadata

Each manifest references the snapshot that created it, and each data file entry references its source commit. This creates a chain: data file → manifest → snapshot → operation → source query.

## OpenLineage Integration

**OpenLineage** is the open standard for collecting and representing data lineage events across diverse data tools. Spark, Flink, dbt, Airflow, and many other tools emit OpenLineage events natively.

When Iceberg tables are the inputs or outputs of OpenLineage-instrumented jobs, lineage events capture:

- **Inputs**: Which Iceberg tables were read (by table name and snapshot ID).
- **Outputs**: Which Iceberg tables were written (by table name and new snapshot ID).
- **Job metadata**: The Spark/Flink/Airflow job that performed the transformation.
- **Column-level lineage** (for supported sources): Which input columns mapped to which output columns.

### Enabling OpenLineage in Spark with Iceberg

```python
# Spark: enable OpenLineage instrumentation
spark = SparkSession.builder \
    .config("spark.extraListeners", "io.openlineage.spark.agent.OpenLineageSparkListener") \
    .config("spark.openlineage.transport.type", "http") \
    .config("spark.openlineage.transport.url", "https://my-marquez.example.com") \
    .config("spark.openlineage.namespace", "my_lakehouse") \
    .getOrCreate()

# All Iceberg reads/writes are now automatically tracked
spark.sql("""
    INSERT INTO db.fact_orders
    SELECT * FROM db.orders WHERE status = 'completed'
""")
# OpenLineage event emitted: orders → fact_orders, with snapshot IDs
```

### Viewing Lineage in Marquez (OpenLineage Backend)

Marquez is the reference OpenLineage server. After jobs run, you can query the lineage graph:

```bash
# Get the lineage graph for the fact_orders table
curl "http://marquez:5000/api/v1/lineage?nodeId=dataset:my_lakehouse:db.fact_orders"
```

The response shows all upstream and downstream datasets, the jobs that connected them, and the timestamps of each lineage event.

## Apache Atlas Integration

For organizations using Apache Atlas for enterprise data governance:

- Atlas hooks for Spark (`spark-atlas-connector`) capture Iceberg table reads/writes as Atlas lineage events.
- Atlas's lineage graph visualization shows the full upstream/downstream dependency chain.
- Atlas classifications (sensitivity labels) can be propagated: if a source Iceberg table is classified as PII, that classification automatically propagates to derived tables.

## Impact Analysis: Schema Change Propagation

One of the most practical lineage use cases: "If I change the schema of `orders`, what downstream tables and reports will be affected?"

With a lineage graph populated from OpenLineage:

1. Find all downstream datasets of `db.orders` in the lineage graph.
2. Identify which downstream consumers use the column being changed.
3. Notify downstream owners before making the change.

```python
# Example: find all downstream consumers of db.orders
import requests

lineage = requests.get(
    "http://marquez:5000/api/v1/lineage",
    params={"nodeId": "dataset:my_lakehouse:db.orders"}
).json()

downstream_tables = [
    edge["destination"]["name"]
    for edge in lineage["graph"]["edges"]
    if edge["source"]["name"] == "db.orders"
]
print(f"Changing db.orders will affect: {downstream_tables}")
```

## Lineage and Compliance

For GDPR, CCPA, and HIPAA compliance, lineage tells you:

- Where does PII data originate (which Iceberg source tables)?
- Which downstream tables derive from those sources?
- If a user requests erasure, which derived tables also need to be updated?

Combined with Iceberg's [GDPR delete](/iceberg/iceberg-row-level-deletes/) capabilities, lineage enables a complete compliance response: identify all affected tables via lineage, then apply row-level deletes across all of them.
