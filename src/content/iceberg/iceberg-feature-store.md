---
term: "Iceberg Feature Store"
description: "Apache Iceberg is used as the offline storage layer in ML feature stores, providing point-in-time correct feature retrieval via time travel, versioned feature datasets via snapshots, and Python-native access via PyIceberg for training data preparation."
category: "Agentic & AI"
relatedTerms:
  - "iceberg-time-travel"
  - "iceberg-snapshot"
  - "iceberg-ai-readiness"
  - "pyiceberg"
  - "iceberg-cdc"
  - "iceberg-agentic-lakehouse"
keywords:
  - iceberg feature store
  - iceberg machine learning features
  - iceberg offline feature store
  - iceberg point in time features
  - feast iceberg feature store
lastUpdated: 2026-05-14
---

## Iceberg as a Feature Store

A **feature store** is a centralized repository for machine learning features: precomputed, versioned, and governed datasets that serve both model training (offline access) and model inference (online access). Apache Iceberg is increasingly used as the **offline feature store** layer in production ML platforms, providing the versioning, governance, and Python integration that ML workflows require.

## What Makes Iceberg Ideal for Feature Storage

### Point-in-Time Correct Feature Retrieval

The most critical requirement for ML feature stores is **point-in-time correctness**: training data must only use features that were known at the time of the prediction event (no future information leakage).

Iceberg's time travel makes this natural:

```python
from pyiceberg.catalog import load_catalog
from datetime import datetime

catalog = load_catalog("my_catalog", **{...})
feature_table = catalog.load_table("features.user_features")

# Point-in-time retrieval: only features known as of the event time
event_time = datetime(2026, 3, 15, 12, 0, 0)
snapshot_at_event = feature_table.snapshot_as_of_timestamp(
    int(event_time.timestamp() * 1000)
)

features_at_event = feature_table.scan(
    snapshot_id=snapshot_at_event.snapshot_id
).to_arrow().to_pandas()
```

Without time travel, teams manually track feature computation timestamps and implement complex join logic to prevent leakage. Iceberg makes this a simple time travel query.

### Reproducible Training Datasets

Record the snapshot ID used for each training run and store it alongside the model artifact:

```python
import mlflow

# Record training snapshot for reproducibility
with mlflow.start_run():
    training_snapshot = feature_table.current_snapshot().snapshot_id
    mlflow.log_param("training_snapshot_id", training_snapshot)
    mlflow.log_param("feature_table", "features.user_features")

    # Train model
    df = feature_table.scan(snapshot_id=training_snapshot).to_arrow().to_pandas()
    model = train_model(df)
    mlflow.sklearn.log_model(model, "model")
```

To reproduce training:

```python
# Exactly recreate training data using recorded snapshot
model_run = mlflow.get_run(run_id)
snapshot_id = int(model_run.data.params["training_snapshot_id"])
df = feature_table.scan(snapshot_id=snapshot_id).to_arrow().to_pandas()
```

### Feature Versioning via CDC

Feature tables are kept current via CDC pipelines:

```
Operational DB → Flink CDC → Iceberg Feature Table
```

Each feature update creates a new snapshot. The feature store can serve:

- **Current features** for online inference (via the latest snapshot, or a dedicated online store).
- **Historical features** for training (via time travel to the relevant snapshot).

## Iceberg Feature Store Architecture

```
Feature Engineering (Spark/Flink)
  │
  ▼
Iceberg Feature Tables (offline store)
  ├── user_features (user engagement, demographics)
  ├── product_features (product attributes, popularity)
  └── session_features (session behavior, recency)
         │
         ├── Training pipeline (PyIceberg + point-in-time query → Pandas/PyArrow → Model)
         └── Online store sync (feature freshness → Redis/DynamoDB → serving)
```

## Integration with Feature Store Frameworks

### Feast + Iceberg

**Feast** (the most popular open-source feature store) supports Iceberg as an offline store backend:

```python
from feast import FeatureStore
from feast.infra.offline_stores.contrib.iceberg_offline_store.iceberg import (
    IcebergOfflineStoreConfig
)

store = FeatureStore(
    repo_config={
        "offline_store": IcebergOfflineStoreConfig(
            catalog_name="my_catalog",
            catalog_type="rest",
            uri="https://my-catalog.example.com",
        )
    }
)
```

With Feast + Iceberg:

- Feature views are backed by Iceberg tables.
- Historical training data retrieval uses Iceberg time travel.
- Feast manages the metadata (entity keys, feature definitions, freshness SLAs).
- Iceberg manages the actual data storage and versioning.

### Tecton + Iceberg

Tecton (an enterprise feature platform) supports Iceberg as an offline store, providing:

- Feature pipeline orchestration writing to Iceberg.
- Point-in-time correct training data generation from Iceberg snapshots.
- Feature monitoring against Iceberg materialized features.

## Feature Table Design Patterns

### SCD Type 2 Feature History

Store all historical versions of feature values with effective dates:

```sql
CREATE TABLE features.user_features (
    user_id        BIGINT NOT NULL,
    feature_date   DATE NOT NULL,
    days_since_signup INT,
    lifetime_orders  INT,
    lifetime_revenue DOUBLE,
    segment          STRING,
    computed_at    TIMESTAMP
) USING iceberg
PARTITIONED BY (months(feature_date))
WRITE ORDERED BY user_id, feature_date;
```

### Latest Features Table (SCD Type 1)

Store only the most recent feature values, updated via upsert:

```sql
-- Daily feature refresh via MERGE INTO
MERGE INTO features.user_features_latest AS target
USING daily_computed_features AS source
ON target.user_id = source.user_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
```

## Dremio and the Feature Store

Dremio's Agentic Lakehouse complements the Iceberg feature store:

- **Virtual datasets** expose cleaned, business-aligned feature tables to AI agents.
- **AI Semantic Layer** adds context so agents understand what each feature means.
- **Time travel** in Dremio SQL enables analysts and AI agents to explore historical feature distributions without code.

The combination of Iceberg + Dremio turns the offline feature store into an AI-accessible, semantically-rich data resource: not just a raw storage layer for ML pipelines.
