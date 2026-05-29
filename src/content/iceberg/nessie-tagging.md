---
term: "Nessie Tagging"
description: "A version control feature in Project Nessie that creates named, immutable reference pointers to freeze the state of the entire catalog at a specific point in time."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "project-nessie"
  - "nessie-git-like-branching"
keywords:
  - nessie tagging
  - catalog tag
  - immutable checkpoints
  - data reproducibility
lastUpdated: 2026-05-29
---

## Nessie Tagging

**Nessie Tagging** is the process of creating named, immutable references that point to specific commits in the Project Nessie version history. While branches in Nessie are mutable pointers that advance as new commits are written, tags are frozen. Once a tag is created, it continues to point to the exact state of all tables in the catalog at that specific commit, providing a powerful mechanism for data auditing, reporting, and reproducibility.

### Use Cases for Tagging

Tags are used to establish stable checkpoints in the lifecycle of a data lakehouse:

- **Financial Reporting**: A tag like `q1_2026_final` can freeze the catalog state at the end of the quarter. Financial analysts can run queries against this tag repeatedly, knowing the results will not change even as ETL jobs continue writing new data to the main branch.
- **Machine Learning Model Training**: Machine learning teams can tag the catalog (e.g. `training_dataset_v4`) when training a model. This allows them to reproduce the exact training data years later to debug or retrain the model.
- **Backup and Rollback Safety**: Prior to running risky migrations or schema updates across multiple tables, engineers can tag the catalog state to create an instant recovery point.

### Using Tags in SQL and CLI

Nessie tags are managed via the Nessie CLI or query tools. Once created, they can be referenced directly in SQL queries to read historical states:

```sql
/* Query the customers table at the exact state of the Q1 2026 reporting tag */
SELECT * FROM nessie_catalog.db.customers AT TAG q1_2026_final;
```

Because tags are metadata references, creating a tag requires no physical file duplication, making it a zero-cost operation that runs in milliseconds.
