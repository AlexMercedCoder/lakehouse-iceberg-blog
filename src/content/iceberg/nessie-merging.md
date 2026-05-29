---
term: "Nessie Merging"
description: "The operation in Project Nessie that merges commits from an isolated staging branch back into the main production branch, checking for conflicts."
category: "Lakehouse Catalogs & Governance"
relatedTerms:
  - "project-nessie"
  - "nessie-git-like-branching"
  - "nessie-tagging"
keywords:
  - nessie merging
  - merge catalog
  - catalog version control
  - conflict resolution nessie
lastUpdated: 2026-05-29
---

## Nessie Merging

**Nessie Merging** is the version-control operation that applies commits from one catalog branch (e.g. a staging or feature branch) to another branch (usually the main production branch). This action publishes staged changes to production in a single transaction. Nessie handles the merge at the catalog metadata layer, checking for conflicts across tables to ensure catalog consistency.

### Conflict Detection and Resolution

During a merge operation, Nessie checks for concurrent modifications. A conflict occurs if the same catalog resource (such as a table or view) was modified on both the target branch (e.g. `main`) and the source branch (e.g. `staging`) since the branches diverged.

There are two primary merge strategies:

- **Fast-Forward**: If the target branch has not received any new commits since the source branch diverged, Nessie simply updates the target branch pointer to point to the latest commit of the source branch.
- **Three-Way Merge**: If both branches have progressed, Nessie attempts to merge the commit histories. If different tables were updated on each branch, Nessie successfully combines them. If the same table was updated on both branches, Nessie rejects the merge to prevent overwriting updates, forcing the user to select a resolution strategy (such as choosing to keep the source branch version).

### Merging via CLI or SQL

Merging is typically executed via the Nessie CLI or within query environments:

```sql
/* Merge changes from the etl_dev branch into the production main branch */
MERGE BRANCH etl_dev INTO main IN nessie_catalog;
```

This command performs the merge atomically. The tables updated on `etl_dev` become visible to users querying `main` at the exact same instant, preventing the partial read issues common in legacy data lakes.
