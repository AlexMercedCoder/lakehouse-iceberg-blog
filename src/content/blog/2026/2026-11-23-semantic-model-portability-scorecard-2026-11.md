---
title: "The Semantic Model Portability Scorecard: Which Platforms Import Whose Semantic Models"
description: "Dated scorecard of which platforms import and export whose semantic models in November 2026, which Ossie versions they accept, and what conversions drop."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Semantic Layer"
tags:
  - semantic layer
  - Ossie
  - data platforms
  - interoperability
  - comparison
slug: "semantic-model-portability-scorecard-2026-11"
draft: false
canonicalURL: https://datalakehousehub.com/blog/semantic-model-portability-scorecard-2026-11/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/semantic-model-portability-scorecard-2026-11/).

Semantic model portability is whether metrics and dimensions defined in one tool can be imported by another without rewriting. Coverage dated November 4, 2026 reported that Google had made imports from Looker, Databricks, Snowflake, dbt and SAP generally available, and that Oracle had announced its own semantic layer. This scorecard records who imports whom, in which format, and what is lost.

Here is the problem I keep running into. A data team defines `net_revenue` once in dbt MetricFlow. Finance has a slightly different version in a Snowflake semantic view. The BI team has a third copy in LookML. Then an agent project starts, and someone wants to pick one definition and push it everywhere else. The vendor answer is usually "yes, we import from X." The documentation answer is narrower. Some paths are import only. Some accept one old version of an open spec. Some keep a metric's formula and quietly drop its label or its non-equi join.

This piece is a scorecard, not a primer. For the case for portable metrics, read [Metric Contracts in 2026](https://iceberglakehouse.com/posts/metric-contracts-2026/). For how the Apache Ossie standard relates to catalogs, read [Apache Ossie and Apache Polaris](https://iceberglakehouse.com/posts/apache-ossie-polaris-semantic-models/). Every cell below points at a documentation page or dated announcement I opened on November 23, 2026. Where the docs say nothing, the cell says "not documented."

## What Has to Travel: Metrics, Dimensions, Joins, Hierarchies, Access Rules

A semantic model is more than a list of formulas. When you move one between tools, five kinds of things have to survive the trip, and each one fails in its own way.

**Metrics.** A metric has an expression (`SUM(amount)`), an aggregation behavior, and often a type. The hard cases are ratios, filtered aggregates, windowed measures, and metrics that span two tables. A simple `SUM` ports almost everywhere. A trailing seven-day distinct count does not.

**Dimensions.** Most formats agree on plain dimensions and disagree on time. LookML expands a time field into a `dimension_group`. Snowflake splits columns into dimensions, time dimensions and facts. Apache Ossie marks a field with a `dimension` object and an `is_time` flag. A time dimension that arrives as a plain column still "imports," but nobody can roll it up by month.

**Joins.** A join declares the many side, the matching columns, and sometimes the cardinality. Lose cardinality and you get fan-out, where a revenue total doubles because a join repeated rows. This failure produces wrong numbers instead of errors.

**Hierarchies.** Year to quarter to month. Oracle says its layer captures hierarchies. The Ossie core spec does not define them. They sit on the Ossie roadmap under "Dimensions, Hierarchies, and Time Semantics" with no shipped field, so a hierarchy travels only inside a vendor extension, or not at all.

**Access rules.** Row filters, column masks, and who sees which metric. The Ossie roadmap lists "Discovery, versioning, and access control for Ossie models" as a future deliverable. None of the import or export pages I read describe carrying a row-level policy between platforms.

A sixth category is agent context: descriptions, labels, synonyms, verified queries and instructions. They change no number, but they change which number an agent picks. A conversion that drops join cardinality is worse than one that drops synonyms, even though both show up as "partial" in a vendor matrix.

## The Formats in Play, Including Ossie's Draft Spec

**LookML.** Looker's modeling language. Views hold dimensions and measures, explores hold joins, and `access_filter` restricts rows per user. Google's docs say Knowledge Catalog ingests Looker models, explores, views, dimensions, measures, dashboards and Looks, including explore filters such as `access_filter`.

**dbt MetricFlow.** Semantic models (entities, dimensions, measures) plus simple, ratio, cumulative, derived and conversion metrics. Google's dbt import page says `manifest.json` carries the MetricFlow semantic models, metrics and saved queries.

**Snowflake semantic views.** Authored in SQL DDL or YAML, with tables, relationships, facts, dimensions, time dimensions and metrics, plus synonyms, verified queries and custom instructions.

**Databricks metric views.** Unity Catalog objects authored in YAML. The YAML reference (updated November 16, 2026) lists `version`, `source`, `filter`, `joins`, `fields`, `measures`, `parameters` and `materialization`. Joins carry a `cardinality` of `many_to_one` or `one_to_many`. Measures take an optional `window` block. Several features require YAML version `1.1`.

**SAP Core Schema Notation (CSN).** Google says Knowledge Catalog captures labels, cube patterns, default aggregations, currency and unit bindings, join associations and sensitivity flags from SAP Business Data Cloud data products.

**Oracle Business Semantic Layer.** Oracle's press release is dated October 26, 2026, and DBTA covered it on November 4. The layer will capture "dimensions, measures, metrics, hierarchies, calculations, and KPIs" as analytic views, built from catalog annotations, imported Oracle AI Database SQL annotations and AI-suggested views. The release says it "will be available within the next 12 months" and names no exchange format.

**Open Knowledge Format (OKF).** Google published OKF v0.1 on June 12, 2026: a directory of markdown files with YAML frontmatter, one concept per file. A metric can be a concept, but the post defines no structured metric, dimension or join fields. OKF is agent context, not semantic model interchange, so it stays out of the table.

**Apache Ossie.** Formerly Open Semantic Interchange (OSI), accepted into the Apache Incubator on July 10, 2026 per the project site. It defines datasets, fields, relationships and metrics in JSON or YAML, plus a portable SQL dialect, `OSSIE_SQL_2026`. Two versions matter, and they are not compatible:

- **0.1.1**, released December 11, 2025. Documents wrap models in a `semantic_model` array, and vendor data lives under `custom_extensions`.
- **0.3.0.dev0**, the unreleased development version on `main`. The spec's version history lists breaking changes: one model at the document root with the `semantic_model` array removed, `custom_extensions` renamed to `nonportable_extensions` with `data` as an object, true division for `/` in `OSSIE_SQL_2026`, and metric expressions that refer to dataset fields rather than source columns. It also says "there is no 0.2.0 release."

The other half of the picture is the reference converters in `apache/ossie-converters`, a hub-and-spoke set with spokes for dbt, Snowflake, Databricks, BigQuery (LookML), Tableau, Cube and others. Those are community code under incubation, not vendor features, and I score them separately.

For why a neutral hub beats point-to-point translation, see [The Semantic Layer as a Translation Engine](https://datalakehousehub.com/blog/semantic-layer-translation-engine/). For the query side of Ossie, see [How Apache Ossie Is Deciding What Agents and BI Tools Can Ask](https://iceberglakehouse.com/posts/ossie-semantic-query-interface-agents/). This piece stays on the model file and what survives the move.

## The Scorecard: Import and Export per Platform, Dated

Here is the table. "Imports" means the platform documents reading another tool's semantic model. "Ossie in" and "Ossie out" mean the platform documents reading or writing an Apache Ossie document itself, not through community code. Every cell links to the page that supports it. Docs were checked on November 23, 2026.

| Platform                          | Imports other vendors' models                                                                                                                                                                                                                                                                                                                                                                            | Ossie in                                                                                                                                               | Ossie out                                                                                                                                                                             | Status and date                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Google Knowledge Catalog          | LookML ([Looker core sync](https://docs.cloud.google.com/knowledge-catalog/docs/manage-looker-core-metadata)), dbt MetricFlow ([dbt import](https://docs.cloud.google.com/knowledge-catalog/docs/dbt-transfer)), Snowflake semantic views, Databricks metric views, SAP CSN ([Google blog](https://cloud.google.com/blog/products/data-analytics/expanded-semantic-model-support-in-knowledge-catalog/)) | Not documented                                                                                                                                         | Not documented                                                                                                                                                                        | GA, blog dated Oct 29, 2026                           |
| Looker (LookML)                   | Not documented                                                                                                                                                                                                                                                                                                                                                                                           | Not documented                                                                                                                                         | Not documented                                                                                                                                                                        | n/a                                                   |
| dbt (MetricFlow)                  | Ossie only                                                                                                                                                                                                                                                                                                                                                                                               | Yes, spec `0.1.0` or `0.1.1`, dbt v1.12 ([dbt docs](https://docs.getdbt.com/docs/build/ossie-semantic-models))                                         | Not documented                                                                                                                                                                        | Docs updated Sep 25, 2026. v2 "coming soon"           |
| Snowflake semantic views          | Ossie only                                                                                                                                                                                                                                                                                                                                                                                               | Yes, spec `0.1.1` only ([create procedure](https://docs.snowflake.com/en/sql-reference/stored-procedures/system_create_semantic_view_from_ossie_yaml)) | Yes, wrapper format, default `0.1.1` ([read function](https://docs.snowflake.com/en/sql-reference/functions/system_read_ossie_yaml_from_semantic_view))                               | Preview, open to all accounts                         |
| Databricks metric views           | Not documented                                                                                                                                                                                                                                                                                                                                                                                           | Not documented                                                                                                                                         | Function `export_to_ossie` named on an [error-class page](https://docs.databricks.com/gcp/en/error-messages/export-to-ossie-error-class), YAML `1.1` views only, behind a config flag | Error page updated Oct 1, 2026. No feature page found |
| Oracle Business Semantic Layer    | Oracle AI Database SQL annotations ([press release](https://www.oracle.com/news/announcement/ai-world-oracle-advances-autonomous-ai-lakehouse-with-business-semantic-layer-and-expanded-support-for-iceberg-data-2026-10-26/))                                                                                                                                                                           | Not documented                                                                                                                                         | Not documented                                                                                                                                                                        | Announced Oct 26, 2026, "within the next 12 months"   |
| Apache Ossie reference converters | dbt, Databricks and others both ways. Snowflake, BigQuery (LookML) export only ([interop README](https://github.com/apache/ossie-converters))                                                                                                                                                                                                                                                            | n/a                                                                                                                                                    | n/a                                                                                                                                                                                   | Incubating community code, no release                 |

A few things jump out once the cells are lined up.

**Google is the widest importer and documents no exit.** The blog lists what Knowledge Catalog captures per source: compiled metric SQL and fan-out-safe joins from Looker, metric formulas, relationships and synonyms from Snowflake, measure formulas and join cardinalities from Databricks. It says "overlapping definitions stay side by side, each labeled with its source," so the catalog does not pick a winner. I found no documented way to write those models back out. On paper, Knowledge Catalog is a sink.

**The Google import path differs by source.** Looker uses live sync. dbt is file-based: you run dbt, then start a metadata job that reads the artifacts. Snowflake comes in "via Horizon Catalog," Databricks "via Unity Catalog." The connectors page warns that each run fully overwrites connector-managed entries and that incremental updates are not supported. Here is the documented dbt job:

```bash
gcloud dataplex dbt metadata-jobs create my-dbt-import \
    --project=my-project \
    --location=us-central1 \
    --artifacts-path=. \
    --entry-group=dbt-metadata-ingestion \
    --storage-uri=gs://my-bucket/dbt-imports/
```

`--artifacts-path` is the path to the dbt artifacts (current directory by default), `--entry-group` is the entry group that receives the dbt entries, and `--storage-uri` is the required Cloud Storage prefix where the transformed JSONL is uploaded. The page says gcloud 586.0.0 and later support the integration.

**Snowflake is the only vendor with both directions documented.** Both are preview features, and both are pinned to the old spec version.

**dbt reads Ossie but does not document writing it.** Ossie JSON files placed in the project's Ossie directory (the feature page says `osi/`, the `osi-paths` reference page shows a default of `["OSI"]`, so set it explicitly) get parsed into the dbt manifest alongside native semantic models. The docs list `osi_document.json` among the files written to `target/` but do not describe exporting native MetricFlow models, so that cell reads "not documented." The reference converter's `msi-to-ossie` command fills the gap as community tooling.

**Databricks has an export that is barely documented.** The only page I found is the `EXPORT_TO_OSSIE` error class. The function is disabled unless `spark.databricks.sql.metricView.exportToOssie.enabled` is set to true, it takes the metric view as a `TABLE` argument, it only converts views stored at version `1.1`, and a `NOT_REPRESENTABLE_IN_OSSIE` error exists for views that cannot be expressed. Which constructs trigger that error is not listed. I found no Databricks page describing Ossie import.

**Looker and Oracle are blank.** I found no Google documentation of Looker reading Ossie or another vendor's model. The converters repository has an Ossie to LookML exporter and lists the reverse on its roadmap. Oracle's layer is announced, not shipped.

If you need a broader platform-by-format grid that includes Lightdash, Holistics and Apache Polaris, the [Semantic Model Interchange Matrix, November 2026](https://datalakehousehub.com/blog/semantic-model-interchange-matrix-november-2026/) has one. This scorecard narrows to the vendors in the November news and adds the spec version each one accepts, because that turns out to be the deciding detail.

## The Version Gap: Vendors Speak 0.1.1, the Spec Moved On

Look at the "Ossie in" column again. dbt accepts `0.1.0` or `0.1.1` and raises a parse error for anything else. Snowflake accepts `0.1.1` and raises an error for any other `version`. Snowflake's export emits the wrapper format with a top-level `semantic_model` list, and it uses the default version `"0.1.1"` for views created from native YAML or SQL.

Now look at the Ossie repository. The spec on `main` declares `0.3.0.dev0`. Its version history marks that version "Unreleased" and warns "do not depend on this version in production." It also lists breaking changes against `0.1.1`. Three of them hit vendor import paths directly:

1. The `semantic_model` array is gone. Each document carries one model at the root.
2. `custom_extensions` is renamed to `nonportable_extensions`, and "the old name is not accepted."
3. Metric expressions and keys now refer to dataset fields, not columns of the dataset's `source`, and model-scoped metrics must use qualified `dataset.field` references.

So a model authored against the current spec does not load into the two vendors that document Ossie import, and a Snowflake export needs migration before it validates against `main`. The spec has a "Migrating earlier document shapes" section, and the converters README notes that its Microsoft converter accepts "the single-model `0.1.1` array returned by Snowflake Semantic Views." The community already writes adapters for the vendor-pinned version.

Snowflake gives the cleanest documented round trip. The function and procedure signatures come from Snowflake's reference pages. The YAML body is a minimal model I wrote to fit the input rules those pages document.

```sql
-- Export: read an existing semantic view as Ossie YAML (preview)
SELECT SYSTEM$READ_OSSIE_YAML_FROM_SEMANTIC_VIEW(
  'my_db.my_schema.sales_model'
);

-- Import: create (or replace) a semantic view from Ossie YAML (preview)
CALL SYSTEM$CREATE_SEMANTIC_VIEW_FROM_OSSIE_YAML(
  'my_db.my_schema',
  $$
  version: "0.1.1"
  name: sales_model
  datasets:
    - name: orders
      source: my_db.public.orders
      primary_key:
        - order_id
      fields:
        - name: order_date
          expression:
            dialects:
              - dialect: SNOWFLAKE
                expression: order_date
          dimension:
            is_time: true
  metrics:
    - name: total_revenue
      expression:
        dialects:
          - dialect: SNOWFLAKE
            expression: "SUM(total_amount)"
  $$
);
```

The read function takes a fully qualified view name and returns the YAML as a VARCHAR. The role needs SELECT or USAGE on the view. The create procedure takes a schema name that must include the database, plus the YAML as a dollar-quoted string. The role needs CREATE SEMANTIC VIEW on the schema and SELECT on every `datasets[*].source`. An existing view with the same name is replaced with its grants kept.

Note the `version: "0.1.1"` line. Snowflake accepts the flat shape on import, but the export always returns the `semantic_model` wrapper. The procedure prefers a `SNOWFLAKE` expression, falls back to `ANSI_SQL`, and silently skips the field or metric if neither exists. An expression written only in `OSSIE_SQL_2026` is not read.

The dev list knows about the gap. On November 2, 2026, Yufei Gu opened a [dev@ossie thread on stability expectations for the first release](https://lists.apache.org/thread/23f8fchdywvdz6vx5yl3dgqxf52yq7lc). It says the first Apache release will be "either 0.2.0-incubating or 0.3.0-incubating," proposes that 0.x stays beta with breaking changes allowed in minor releases, and argues that "Downstream projects and converters need a version to latch onto." That is a discussion, not a decision. Until a release exists, every vendor implementation is pinned to `0.1.1` or to its own reading of a moving branch.

## A Loss Test: Round-Trip One Sample Model and Record What's Dropped

A "yes" cell hides what each "yes" keeps. The honest way to find out is to run a model through each path and diff what comes back. This section describes the method, not results. I have not run it against every vendor in the table, and I will not print numbers I did not measure.

The Ossie project already built most of the test kit. The `compliance/portability` directory in `apache/ossie` holds a measurement ladder, rungs M0 through M8, and a grader. Each rung adds exactly one capability on top of the one below it, "so a difference in a converter's output localizes to a single construct." The rungs are:

| Rung | Construct added                                                  |
| ---- | ---------------------------------------------------------------- |
| M0   | One dataset, one field, one `SUM` metric                         |
| M1   | A calculated column (`amount * 1.1`)                             |
| M2   | `SUM`, `COUNT`, `COUNT(DISTINCT)`, `AVG`, `MIN`, `MAX`           |
| M3   | A filtered aggregate, as `CASE WHEN` and as `FILTER (WHERE ...)` |
| M4   | Two datasets, a relationship, a cross-dataset metric             |
| M5   | A metric composed from two others                                |
| M6   | `YEAR`, `DATE_TRUNC`, `DATEDIFF`                                 |
| M7   | Window functions with `ORDER BY`                                 |
| M8   | Ratio to total                                                   |

Every fixture is authored in a portable dialect, `ANSI_SQL` or `OSSIE_SQL_2026`, on purpose. The manifest explains that a vendor-tagged input exercises only one converter. Here is the M4 fixture, the rung where joins enter the picture, copied from the repository with its license header removed:

```yaml
version: "0.3.0.dev0"
name: m4_sales
description: "M4: two datasets, a relationship, and a cross-dataset metric."
datasets:
  - name: sales
    source: samples.sales.orders
    fields:
      - name: amount
        expression:
          dialects:
            - dialect: ANSI_SQL
              expression: amount
        datatype: Decimal
      - name: customer_id
        expression:
          dialects:
            - dialect: ANSI_SQL
              expression: customer_id
        datatype: Integer
  - name: customers
    source: samples.sales.customers
    primary_key: [customer_id]
    fields:
      - name: customer_id
        expression:
          dialects:
            - dialect: ANSI_SQL
              expression: customer_id
        datatype: Integer
relationships:
  - name: sales_to_customer
    from: sales
    to: customers
    from_columns: [customer_id]
    to_columns: [customer_id]
metrics:
  - name: revenue_per_customer
    expression:
      dialects:
        - dialect: ANSI_SQL
          expression: SUM(sales.amount) / COUNT(DISTINCT customers.customer_id)
    datatype: Decimal
```

Read it from the bottom up. The model-scoped metric `revenue_per_customer` uses qualified `dataset.field` references and divides a sum from `sales` by a distinct count from `customers`, so it only means anything if the relationship is honored. The relationship declares `sales` as the many side (`from`) and `customers` as the one side (`to`). The `primary_key` on `customers` tells a consumer the one side is unique. Every expression carries `ANSI_SQL`, which Snowflake's import reads. The `version` line targets `0.3.0.dev0`, so vendors that accept only `0.1.1` need a migration step first, and that step belongs in the test log.

### The procedure

For each path you care about, run four steps:

1. **Validate the input.** Run the fixture through `validation/validate.py` from the same Ossie commit. The ladder README calls conformance "a floor, not the measurement."
2. **Go out.** Load the fixture into the target. For Snowflake, the create procedure above. For dbt, the JSON form in the Ossie directory plus `dbt compile`. For a community converter, its export command.
3. **Come back.** Export the result to Ossie again. For Snowflake, the read function. Where no export is documented, use the reference converter and record that the return leg is community code.
4. **Grade.** Diff the returned document against the input with the ladder's grader.

The grader's documented invocation is:

```bash
python grade.py --input model.ossie.yaml --returned returned.ossie.yaml \
    --converter dbt [--diagnostics warnings.txt] [--json]
```

It scores each metric and field into a fixed outcome vocabulary: PORTABLE (with a TAG_PRESERVED sub-flag), REWRITTEN, SURVIVED_VENDOR_ONLY, PLACEHOLDER, ADDED, RELABELED, DROPPED_DIAGNOSED, DROPPED_SILENT, and REJECTED. Pass the converter's or platform's warnings with `--diagnostics`, because DROPPED_DIAGNOSED and DROPPED_SILENT differ only by them. With `sqlglot` installed, the grader compares normalized expression trees, so a cosmetic rewrite (a requalified column) clears and an unproven one gets flagged for a human. The README states the limit plainly: "True semantic equivalence of SQL is undecidable in general."

The ladder covers metrics and field expressions only. Add these checks by hand:

- **Join cardinality.** Check that the relationship, its direction, and the one side's key survived. Then run the M4 metric on the same rows in source and target. A matching document with a different total means fan-out.
- **Hierarchies.** Record whether each hierarchy survives in a vendor extension, comes back flat, or disappears.
- **Access rules.** Record what happens to row filters and masks. Expect "not carried," and write it down anyway.
- **Agent context.** Record descriptions, labels and synonyms per element.

Pin the Ossie commit, converter commit, platform release and date for every run. The converters repository's interop runner already records "Commit IDs and dirty-checkout flags" and registers 28 converter projects with explicit skips for missing directions.

## What Each Conversion Drops, According to Its Own Docs

Several vendors and converters document their own losses. These are documented behaviors, not my measurements. Expect each one as a row in your loss log.

**Snowflake semantic view to Ossie (export).** Non-equi relationships (ASOF and RANGE) are silently dropped. Field labels are lost on a round trip. Data types are not included. Only the `SNOWFLAKE` dialect comes back. Table-level metrics and filters move into dataset `custom_extensions`. The page lists what survives: names, descriptions, sources, keys, field classification, equi-joins, model-level metrics and `ai_context`. Synonyms, verified queries and custom instructions ride inside the `SNOWFLAKE` vendor extension. Access policies are not mentioned.

**Ossie to Snowflake semantic view (import).** Fields and metrics without a `SNOWFLAKE` or `ANSI_SQL` expression "are dropped without an error." An unrecognized `source` string sets no base table. `ai_context` is stored in extension metadata, not as a native construct.

**Ossie to dbt (import).** Unsupported metric types or constructs are dropped with warning `I078`, and parsing continues. Dataset sources must resolve to a dbt model, so sources, seeds, snapshots and external tables fail. Ossie files in installed packages are ignored.

**dbt MetricFlow to Ossie (community converter).** The README says this direction "is lossy" and names each loss. Conversion metrics, private metrics and natural-key entities are dropped. Cumulative metrics keep only their base aggregation. Metrics with window, grain, offset or time-spine semantics are dropped. The reverse direction rejects composite keys and splits ratios into generated `_numerator` and `_denominator` metrics.

**Ossie to LookML (community converter).** Dropped by name: `nonportable_extensions`, `unique_keys`, metric `datatype`, relationship `ai_context`, and `ai_context` keys other than `synonyms` and `instructions`. Every join becomes `left_outer` and `many_to_one`. Window functions cannot become LookML measures and are flagged for manual rewrite.

**Ossie and Databricks metric views (community converter).** Its compliance test runs rungs M0 through M3 and reports every element PORTABLE. That covers four rungs of nine, and the converter, not a Databricks feature. Relationships have no metric view form, so `deploy` keeps them in the Ossie model rather than emitting joins. It handles metric view YAML `1.1` only.

**Google Knowledge Catalog (import).** The dbt page lists limits: no direct dbt Cloud connection, truncation of trailing fields in deeply nested schemas, and lineage only for BigQuery-backed entries. With no documented export, there is no return leg to grade.

Line these up against the five categories and a pattern shows. Simple metrics and plain dimensions travel. Joins travel when they are equi-joins and many-to-one. Time semantics, windowed measures and conversion metrics are the first to fall off. Hierarchies and access rules have no portable home at all.

## Where Ossie Fits Once Its First Incubating Release Ships

The first Apache release changes one thing in this scorecard: it gives vendors a fixed target other than `0.1.1`. Today dbt and Snowflake pin the December 2025 version, and nothing newer is released. Once a `0.2.0-incubating` or `0.3.0-incubating` artifact exists, the "Ossie in" column gets a clear test: which release does each platform accept.

It does not fix hierarchies or access control, because neither is in the core spec. It does not make vendor extensions portable either. The spec states that core semantics "MUST NOT depend on extensions" and that behavior defined only through extensions is non-portable. So Snowflake's verified queries or synonyms inside a `SNOWFLAKE` extension stay Snowflake's, even inside an Ossie file.

What the release does give you is a stable fixture set to grade against. With a tagged spec and a tagged ladder, a loss log from January means the same thing in June.

## Picking a Home for the Canonical Model

Given this table, put the canonical definition in the format with the most documented exits.

- **Author where you can export.** Snowflake is the only vendor here with documented Ossie import and export. dbt plus the reference converter gives a documented import and a community export. A model that lives only in a sink, such as a catalog with no export, cannot be your source of truth.
- **Keep a portable copy in Git.** Store an Ossie document with `ANSI_SQL` expressions next to the native model. It reads on both documented import paths today.
- **Write expressions for the strictest consumer.** Equi-joins, many-to-one relationships, declared primary keys and no window measures in the shared layer.
- **Keep access rules native.** Nothing carries them, so define them in each platform and audit them separately.
- **Run the loss test on every upgrade.** Pin versions and diff the outcome log.

Buyers now ask about exactly this. [SaaS Buyers Now Inspect Your Semantic Layer](https://datalakehousehub.com/blog/saas-procurement-semantic-layer-over-dashboards/) covers why procurement teams want proof that definitions can leave a platform. A dated loss log is that proof.

## Conclusion

The November news made imports into Google's catalog generally available and put Oracle on the board with a semantic layer due within a year. The documentation tells a narrower story. Google imports five vendor formats and documents no export. Snowflake documents both directions in preview, pinned to Ossie `0.1.1`. dbt reads `0.1.x`. Databricks names an export function on an error page. Looker and Oracle document neither direction. Before you choose a canonical home, run your own model through the Ossie ladder and keep the loss log.

## Keep Going

If this piece was useful, I have written a lot more on lakehouse architecture, catalogs and the semantic layers that sit on top of them. _Architecting an Apache Iceberg Lakehouse_ (Manning) covers how the table, catalog and semantic layers fit together. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [Techzine: Google Agentic Data Cloud gets cross-cloud lakehouse (Nov 4, 2026)](https://www.techzine.eu/news/analytics/145556/google-agentic-data-cloud-gets-cross-cloud-lakehouse/)
- [Google Cloud blog: Expanded semantic model support in Knowledge Catalog (Oct 29, 2026)](https://cloud.google.com/blog/products/data-analytics/expanded-semantic-model-support-in-knowledge-catalog/)
- [Google Cloud blog: Open Knowledge Format (Jun 12, 2026)](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
- [Knowledge Catalog: Import metadata from dbt Core and Cloud](https://docs.cloud.google.com/knowledge-catalog/docs/dbt-transfer)
- [Knowledge Catalog: Manage Looker (Google Cloud core) resources](https://docs.cloud.google.com/knowledge-catalog/docs/manage-looker-core-metadata)
- [Knowledge Catalog: Connectors](https://docs.cloud.google.com/knowledge-catalog/docs/connectors)
- [DBTA: Oracle Expands Autonomous AI Lakehouse (Nov 4, 2026)](https://www.dbta.com/Editorial/News-Flashes/Oracle-Expands-Autonomous-AI-Lakehouse-With-Semantic-and-Iceberg-Capabilities-177363.aspx)
- [Oracle press release: Business Semantic Layer (Oct 26, 2026)](https://www.oracle.com/news/announcement/ai-world-oracle-advances-autonomous-ai-lakehouse-with-business-semantic-layer-and-expanded-support-for-iceberg-data-2026-10-26/)
- [dbt: Apache Ossie semantic layer documents](https://docs.getdbt.com/docs/build/ossie-semantic-models)
- [dbt: osi-paths](https://docs.getdbt.com/reference/project-configs/osi-paths)
- [Snowflake: SYSTEM$READ_OSSIE_YAML_FROM_SEMANTIC_VIEW](https://docs.snowflake.com/en/sql-reference/functions/system_read_ossie_yaml_from_semantic_view)
- [Snowflake: SYSTEM$CREATE_SEMANTIC_VIEW_FROM_OSSIE_YAML](https://docs.snowflake.com/en/sql-reference/stored-procedures/system_create_semantic_view_from_ossie_yaml)
- [Databricks: Unity Catalog metric views](https://docs.databricks.com/aws/en/business-semantics/metric-views)
- [Databricks: Metric view YAML syntax reference](https://docs.databricks.com/aws/en/business-semantics/metric-views/yaml-reference)
- [Databricks: EXPORT_TO_OSSIE error class](https://docs.databricks.com/gcp/en/error-messages/export-to-ossie-error-class)
- [Apache Ossie repository](https://github.com/apache/ossie) and [ossie.apache.org](https://ossie.apache.org/)
- [Apache Ossie converters repository](https://github.com/apache/ossie-converters)
- [dev@ossie: Stability expectations for the first release (Nov 2, 2026)](https://lists.apache.org/thread/23f8fchdywvdz6vx5yl3dgqxf52yq7lc)
