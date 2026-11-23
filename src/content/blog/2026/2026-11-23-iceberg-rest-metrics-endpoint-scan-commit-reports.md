---
title: "The Iceberg REST Metrics Endpoint: Scan Reports, Commit Reports, and How Catalogs Should Handle Them"
description: "What Iceberg scan and commit reports contain, how the REST reportMetrics endpoint works, and what a catalog should return when it cannot store a report."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Apache Iceberg"
tags:
  - Apache Iceberg
  - REST catalog
  - scan reports
  - table metrics
  - observability
slug: "iceberg-rest-metrics-endpoint-scan-commit-reports"
draft: false
canonicalURL: https://datalakehousehub.com/blog/iceberg-rest-metrics-endpoint-scan-commit-reports/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/iceberg-rest-metrics-endpoint-scan-commit-reports/).

Iceberg clients can send scan and commit reports to a REST catalog's `reportMetrics` endpoint, but the spec doesn't say whether reporting is best-effort. A November 3, 2026 thread asks what a 5xx should mean. It was prompted by a proposed Apache Polaris change that returns 204 instead of 500 when storing a report fails.

Here is the situation behind it. A catalog operator keeps every metrics report that engines send, to spot slow scan planning and charge compute back to the right team. The reports land in a database. One afternoon that database gets slow, and the catalog starts answering the metrics endpoint with HTTP 500. The availability dashboard turns red. Every Spark job keeps running fine, because the Iceberg Java client never acts on that response.

So who was the 500 for? The client ignored it. The operator saw a catalog outage that was not an outage. And nobody got the report that failed to land. That gap between what the server says and what anyone does with it is the subject of this article.

This article covers what the reports carry, how the spec defines the endpoint, and the two readings of its failure semantics from the Iceberg and Polaris dev lists. The thread did not change the spec, so I will separate what is settled from what each implementation still decides.

## Two Different Things Called "Metrics" in Iceberg

Before going further, it helps to separate two features that share a word.

The first is column metrics. When a writer creates a data file, it records per-column statistics such as value counts, null counts, and lower and upper bounds. Those stats live in manifest files and drive file pruning during planning. You control how much gets recorded with the `write.metadata.metrics.*` table properties. That feature has its own page, the [Iceberg Metrics Mode KB](https://iceberglakehouse.com/iceberg/iceberg-metrics-mode/), and nothing in this article changes it.

The second is metrics reporting. This is runtime telemetry about operations, not data. When an engine plans a scan, the Iceberg library measures how long planning took and how many manifests and files it touched. When it commits a snapshot, the library measures the commit duration, the retry count, and the files added and removed. Each measurement set becomes a report object, and a pluggable reporter decides where that object goes.

Column metrics persist in table metadata. Metrics reports are fire-and-forget messages about one operation by one client, and they never enter table metadata.

The REST catalog matters here because it gives reports a natural destination. The [Iceberg REST Catalog](https://iceberglakehouse.com/iceberg/iceberg-rest-catalog/) already sits on the path of every table load and every commit. When a client loads a table through a REST catalog, the Java library wires a reporter that posts each report back to that same catalog. The catalog then sees both sides of the traffic: the metadata requests and the measured cost of acting on them.

## What Scan and Commit Reports Contain

The Iceberg Java library has shipped the `MetricsReporter` and `MetricsReport` APIs since release 1.1.0. Two concrete report types exist today: `ScanReport` and `CommitReport`. Both carry identifying fields about the table and the snapshot, a map of measured values, and a free-form metadata map.

### Scan reports

A scan report is produced when the library finishes planning a scan. Planning is the step where the client reads the manifest list and manifests to decide which data and delete files the engine needs to open. The report describes that step, not the later file reads done by the engine's workers.

The identifying fields in the Java implementation and the REST schema line up:

- `table-name`: the table's name as the client knows it.
- `snapshot-id`: the snapshot the scan planned against.
- `filter`: the scan's row filter, as an Iceberg expression.
- `schema-id`: the schema used for the scan.
- `projected-field-ids` and `projected-field-names`: the columns the query asked for.
- `metrics`: the measured values.
- `metadata`: optional string key-value pairs.

The measured values cover planning cost and pruning results. The Java `ScanMetrics` class names them `total-planning-duration` (a timer), `result-data-files` and `result-delete-files`, the totals and counts of scanned and skipped data and delete manifests, `skipped-data-files` and `skipped-delete-files`, `total-file-size-in-bytes`, `total-delete-file-size-in-bytes`, and counts for `indexed-delete-files`, `equality-delete-files`, `positional-delete-files` and `dvs` (deletion vectors).

One detail matters for anyone storing these. The Java library sanitizes the filter before it puts it in the report. It passes the expression through `ExpressionUtil.sanitize`, which replaces literal values with hashed placeholders. The example in the Iceberg docs shows a predicate on a `data` column rendered as `"(hash-27fa7cc0)"` instead of the real string. You learn which columns a query filtered on. You do not learn the values. That is a sensible default for telemetry that leaves the engine, and it limits what an operator can do with the filter field later.

### Commit reports

A commit report is produced after the library successfully commits a new snapshot. Its identifying fields are `table-name`, `snapshot-id`, `sequence-number`, and `operation` (such as `append`, `overwrite`, or `delete`), plus `metrics` and optional `metadata`.

The measured values describe what the commit did and how hard it was to land. The Java `CommitMetrics` class records `total-duration` and `attempts`. The attempts counter tells you how many tries the commit took. A value of 1 means it landed on the first try, and anything higher means the client hit a conflict or a retryable failure and went around again. The rest come from the snapshot summary: added and removed files, deletes, records, and bytes, plus running table totals. Recent Java versions also include deletion vector counts and manifest counters such as `manifests-created`, `manifests-kept`, and `manifests-replaced`.

### The metadata map

The `metadata` map is where reports get useful for attribution. In the Java library, both report types copy in the process-wide `EnvironmentContext`, which always holds `iceberg-version`. Spark's `SparkCatalog` adds `engine-name`, `engine-version`, `app-id`, and `app-name` to that context when it initializes. Scan reports also copy in the scan's read options.

So a report from a Spark job carries the application ID and name next to the planning cost, with no extra instrumentation in the job.

### What reports do not contain

Reports do not include the authenticated principal, so the catalog has to attach identity from its own auth layer. Reports also do not cover executor file reads, bytes fetched from object storage, or query wall time. A scan report says how many files the plan selected and how big they were. That is a proxy for read cost, not a measurement of the read.

## The Endpoint as the OpenAPI Spec Defines It Today

The Iceberg REST OpenAPI spec defines one operation for this, `reportMetrics`:

```
POST /v1/{prefix}/namespaces/{namespace}/tables/{table}/metrics
```

Its summary, "Send a metrics report to this endpoint to be processed by the backend," is the whole behavioral description. The [Iceberg REST Catalog API Endpoints](https://iceberglakehouse.com/iceberg/iceberg-rest-catalog-api/) reference lists it alongside the other table routes, and its path parameters work the same way as the rest: an optional `prefix` from the config response, a namespace, and a table name.

### The request body

The body is a `ReportMetricsRequest`. In the spec, that schema is an `anyOf` of `ScanReport` and `CommitReport`, with one extra required field, `report-type`, typed as a string. The Java serializer writes the values `scan-report` and `commit-report`. On the server side, the Java parser maps any other value to an `UNKNOWN` type instead of failing.

Here is a scan report body built from the field names in the spec and the Java serializers. The values are illustrative. The structure is what a Java client sends.

```json
{
  "report-type": "scan-report",
  "table-name": "lakehouse.sales.orders",
  "snapshot-id": 3055729675574597004,
  "filter": true,
  "schema-id": 0,
  "projected-field-ids": [1, 2, 5],
  "projected-field-names": ["order_id", "customer_id", "order_ts"],
  "metrics": {
    "total-planning-duration": {
      "count": 1,
      "time-unit": "nanoseconds",
      "total-duration": 2644235116
    },
    "result-data-files": { "unit": "count", "value": 12 },
    "result-delete-files": { "unit": "count", "value": 0 },
    "total-data-manifests": { "unit": "count", "value": 4 },
    "scanned-data-manifests": { "unit": "count", "value": 4 },
    "skipped-data-manifests": { "unit": "count", "value": 0 },
    "total-file-size-in-bytes": { "unit": "bytes", "value": 1610612736 }
  },
  "metadata": {
    "iceberg-version": "Apache Iceberg 1.12.0",
    "engine-name": "spark",
    "app-name": "nightly-orders-rollup"
  }
}
```

`report-type` tells the server which schema to apply. The spec marks every identifying field after it as required for a scan report. The `filter` is a `Predicate`, and the spec now prefers a bare boolean `true` for "no filter" over the older `{"type": "true"}` object. Each entry in `metrics` is a `MetricResult`, which is either a `CounterResult` (`unit` plus `value`) or a `TimerResult` (`time-unit`, `count`, and `total-duration`). The `metadata` block is a string-to-string map, and the spec marks it optional.

A commit report swaps the scan-specific fields for `sequence-number` and `operation`, and keeps `table-name`, `snapshot-id`, `metrics`, and `metadata`.

### A schema detail that bites parsers

The spec's `Metrics` schema is an open map. Its `additionalProperties` is `MetricResult`, so any key is legal. The example embedded in the spec uses the key `total-file-size-bytes`. The Java `ScanMetrics` class emits `total-file-size-in-bytes`. Both are valid against the schema because the schema does not name the keys at all.

So treat metric names as data, not a fixed column list. A server that rejects unfamiliar keys with a 400 breaks the moment a client adds a counter, and recent Java releases have added several.

### The documented responses

The operation lists these responses:

| Status | Meaning in the spec      |
| ------ | ------------------------ |
| 204    | Success, no content      |
| 400    | Bad request              |
| 401    | Unauthorized             |
| 403    | Forbidden                |
| 404    | The table does not exist |
| 419    | Authentication timeout   |
| 503    | Service unavailable      |
| 5XX    | Other server error       |

The shared 503 response says a client retries a non-idempotent request only when the server sends a `Retry-After` header. The generic 5XX response describes a server-side problem the client probably cannot fix. Neither description says anything specific about metrics.

### Discovery through the config endpoint

A client learns which routes a server supports from the `endpoints` list in the `GET /v1/config` response. The metrics route is in the spec's default list for servers that do not send `endpoints`. The Java client checks for it before wiring the REST reporter. A catalog that does not want reports at all can leave the metrics route out of its advertised `endpoints`, and Java clients stop posting to it.

This endpoint stands alone in a way that matters for the semantics debate below. It is not part of any commit. The [multi-table commit endpoint](https://iceberglakehouse.com/posts/iceberg-rest-multi-table-commit-transactions/) bundles table updates into one atomic request, and its failure codes decide whether data changed. The metrics endpoint runs after the commit already succeeded, in a separate HTTP request, and nothing about the table depends on its outcome.

## Best-Effort Telemetry vs. a Retriable Write: The Two Readings

On November 3, 2026, Anand Kumar Sankaran, an Apache Polaris contributor, posted a `[DISCUSS]` thread to the Iceberg dev list titled "REST catalog spec: semantics of the metrics reporting endpoint when the server fails to process a report." He laid out two readings of the endpoint and asked the community to pick one before Polaris changed its server behavior.

### Reading one: best-effort telemetry

Under this reading, the client sends the report and moves on. The catalog is allowed to drop a report it cannot persist, as long as operators can see the drop. A 5xx tells the client nothing it can act on, because the client's real work (the scan or the commit) already finished.

The case for this reading starts with the client code. The Java `RESTMetricsReporter` posts each report on a background executor and catches every exception, logging it as a warning. In Iceberg 1.12.0 that executor is a single-thread pool named `rest-metrics-reporter`, owned by the REST session catalog. A failed post never reaches the engine. Nothing retries it.

### Reading two: a normal REST write

Under this reading, the metrics endpoint is like any other route. If the catalog cannot process the report, it says so with a 5xx, and clients are free to retry. Anand noted that this matters for anyone using reports for auditing or billing, and he was also candid about the catch: a 5xx only helps durability if clients actually retry.

The case for this reading is HTTP semantics. A 204 says "this worked." If the catalog failed to store the report, that statement is false.

### What the Iceberg maintainers said

Three replies shaped the outcome.

Eduard Tudenhöfner replied first. He said the endpoint and metrics reporting are intended to be best-effort. He said reads and writes should not fail because the server failed to store information about a scan or commit. The spec lists 204, 400, 401, 403, 404, 419, 503 and 5XX because those are all possible outcomes, and he said it is up to the catalog to decide whether to throw a 500 or log an error, and that a catalog can also decide to discard reports and return 204. Clients are not expected to retry, because retries add time to the scan or commit path. He did not see a need to change the spec wording and preferred not to be prescriptive.

Yufei Gu agreed that treating the endpoint as best-effort is reasonable, but asked for the spec to say so explicitly. He pressed on where the line sits: if a catalog can answer 204 for a failed metrics write, the same logic sounds like it applies to `updateTable`.

Daniel Weeks drew the line differently. He said the spec does not need to define the endpoint as best-effort, and that "best effort" is probably misleading here. The commit is the critical operation, and the metrics call is a separate operation that the commit does not require. On Yufei's example, he said a server returning a success code when the request failed is clearly wrong and an implementation issue. Whether a client retries or ignores an error from the metrics endpoint is a separate, client-side choice.

Yufei then agreed to leave the spec unchanged, with the reading that the endpoint behaves like a standard REST endpoint and returns an error status when the operation fails. He added that the Java client's choice not to retry is reasonable.

### Where that leaves the question

No spec change came out of the thread, and no vote. The two main positions overlap on several points and differ on one:

- Both agree clients do not need to retry, and the Java client does not.
- Both agree the commit never depends on the report.
- Both agree the spec text stays as it is.
- They differ on whether a catalog that fails to store a report can still answer 204. Eduard's reply allows a catalog to discard reports and return 204. Daniel's reply says a success code for a failed operation is wrong.

My own reading, not a community decision: a catalog that chooses not to keep a report (sampling, or reporting off for that table) has processed it by its own policy, and 204 is honest. A catalog that tried to store a report and hit a database error has failed the operation it attempted. If your catalog depends on this, follow the dev list.

## The Polaris Change and What Clients See Either Way

The Iceberg thread came out of a Polaris dev list discussion about pull request #5395. Apache Polaris implements the Iceberg REST catalog and can persist metrics reports sent to this endpoint. Before the change, a failed database write for a report returned a 500.

### What #5395 does

On October 22, 2026, Vignesh A flagged the PR on the Polaris list. With the change, a `POST .../metrics` no longer returns 500 when the persisting reporter's database write fails. The error is logged and the report is dropped. Errors from other reporters still propagate as before, and authorization is unchanged.

Jean-Baptiste Onofré (JB) leaned toward the change, since the metrics POST is one-way and telemetry-like, and clients gain nothing from seeing a persistence failure. He also agreed with Yufei that a silent drop should not leave operators blind. He proposed a dedicated counter, `polaris.metrics.reports.dropped`, tagged by reporter type, so operators can alert on drops directly. Vignesh agreed to add the counter to the PR. Dmitri Bourlatchkov argued that client-side retries are overkill for metrics, because reports cannot conflict with other writes, and that if the server received a report and cannot persist it, any retry belongs on the server side.

Yufei preferred keeping the 500. His view was that the spec does not call reporting best-effort, that billing or auditing uses make client retries reasonable, and that a behavior change of this kind should go through the Iceberg community first. He also raised a gap that server-side retry cannot close: network and proxy failures happen before the request reaches Polaris, so only the client can retry those.

Anand agreed that server-side buffering or retry is the right place to get durability for reports Polaris has accepted, and offered to take that on as follow-up work. He suggested documenting the persisting reporter as best-effort. He then took the spec question to the Iceberg list.

### After the Iceberg thread

On November 5, Vignesh posted a recap to the Polaris list and asked whether it unblocked #5395. Yufei answered no and pointed back to the Iceberg thread. Vignesh then wrote that he had misread Eduard's reply: a spec that stays unchanged, combined with Daniel's view that a success code for a failed request is wrong, does not unblock a Polaris 204 on persist failure. As of the messages I read, the PR's fate on the Polaris side was still open. I am not going to predict where it lands.

### What a client sees, either way

Here is the useful part for anyone running engines built on the Iceberg Java library against a REST catalog. From the client's point of view, the two behaviors are almost identical today:

|                              | Server returns 500 on persist failure     | Server returns 204 and counts a drop |
| ---------------------------- | ----------------------------------------- | ------------------------------------ |
| Java engine job              | Keeps running. Warning in the driver log. | Keeps running. No warning.           |
| Java client retry            | None                                      | None                                 |
| Report delivered to storage  | No                                        | No                                   |
| Catalog availability metrics | Shows 5xx on the metrics route            | Clean                                |
| Operator signal              | HTTP error rate on one route              | Dedicated drop counter               |

The report is lost in both columns. What changes is who notices. A 500 produces an engine warning nobody reads and a catalog error spike that lands in the wrong alert. A 204 plus a counter gives the operator a narrow, purpose-built metric.

If you build a non-Java client, check what yours does. Anand said in his first post that he had not checked PyIceberg, iceberg-rust, or iceberg-go. I looked at PyIceberg's REST catalog module on `main` and did not find a reference to the metrics route, so I am not going to describe its behavior. Whatever your client does, the safe default matches Java: send asynchronously, never fail the scan or commit, and log failures at a level someone can find.

## Using Reports for Observability and Cost Attribution

The delivery semantics decide the use cases. Reports are excellent for trends and diagnosis, and a poor fit as a system of record.

### Observability that works well

Scan reports answer planning questions that are otherwise hard to see from the catalog. A rising `total-planning-duration` on one table, with `scanned-data-manifests` climbing, points at manifest sprawl and a missing rewrite-manifests job. A high ratio of `result-delete-files` to `result-data-files` tells you merge-on-read deletes are piling up and compaction is behind. When `skipped-data-manifests` stays at zero for queries that filter on a partition column, the partition spec and the query pattern do not match.

Commit reports answer write-side questions. An `attempts` value above 1 on many commits means writers are colliding on the same table. A stream of commits with a handful of `added-data-files` each and tiny `added-files-size-bytes` is the small-files problem showing up in real time, before anyone runs a metadata query. And `total-duration` per commit, grouped by `operation`, shows whether overwrites or deletes are the slow path.

None of this needs every single report. If a small share of reports drop during a database incident, the trend lines still hold. That is exactly the use case where best-effort delivery is fine.

### Cost attribution, with honest limits

The metadata map makes rough chargeback possible. Combine the catalog's own view of the caller (the principal from the auth layer) with the report's `app-name`, `app-id`, and `engine-name`, and you can say which teams and jobs plan the most files and commit the most bytes. That is enough to find the jobs that dominate planning time.

Billing is a harder claim. A scan report measures planning, not reads, and it arrives with no delivery guarantee. The Java client does not retry, and a catalog database incident drops reports under either status-code policy. Anand made the same point on the Polaris list when he concluded that a 500 does not give a reliable audit trail. If you need numbers that hold up in an invoice, take them from the source of truth: snapshot summaries in table metadata for write volume, and engine or storage logs for read volume. Use reports to explain and allocate, and reconcile against those sources.

## Client-Side Reporter Configuration

The client side has two knobs, and both are documented in the Iceberg metrics reporting docs.

`rest-metrics-reporting-enabled` controls whether a `RESTCatalog` posts reports to the catalog's metrics endpoint. It defaults to `true`. `metrics-reporter-impl` registers your own `MetricsReporter` class by its fully qualified name. The default reporter when nothing else is configured is `LoggingMetricsReporter`, which writes each report to the log.

For a REST catalog, the Java library combines the two. It loads the reporter named by `metrics-reporter-impl` and, when REST reporting is on and the server advertises the metrics route, wraps it together with the REST reporter. So a custom reporter adds a destination. It does not replace the catalog.

In Spark, catalog properties go under the catalog's prefix:

```properties
spark.sql.catalog.lake=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.lake.type=rest
spark.sql.catalog.lake.uri=https://catalog.example.com/api/catalog
spark.sql.catalog.lake.warehouse=analytics

# Keep sending reports to the REST catalog (this is the default)
spark.sql.catalog.lake.rest-metrics-reporting-enabled=true

# Also hand every report to a custom reporter on the classpath
spark.sql.catalog.lake.metrics-reporter-impl=com.example.iceberg.PrometheusMetricsReporter
```

The first four lines define a REST catalog with a placeholder URI and warehouse. The next line states the default explicitly, so nobody turns it off by accident in shared config. The last line names a custom class. `com.example.iceberg.PrometheusMetricsReporter` is a stand-in for your own implementation, which only needs to implement the one `report(MetricsReport)` method.

Setting `rest-metrics-reporting-enabled=false` stops the posts entirely. That is the right call for a client talking to a catalog that ignores reports, and it removes a background HTTP call per scan and per commit.

The Java API also accepts reporters per scan, on top of whatever the catalog registered:

```java
TableScan tableScan =
    table
        .newScan()
        .metricsReporter(customReporterOne)
        .metricsReporter(customReporterTwo);

try (CloseableIterable<FileScanTask> fileScanTasks = tableScan.planFiles()) {
  // ...
}
```

This snippet comes from the Iceberg docs. It is handy in tests, where an in-memory reporter lets you assert on `skipped-data-files` after a filter change.

## A Checklist for Catalog Implementers

Until the community says more, these choices are consistent with everything said on both lists:

1. **Decide your policy and write it down.** Say in your docs whether stored reports are best-effort. Anand proposed exactly that for Polaris.
2. **Never let the metrics route block the commit path.** Run report storage off the request thread or behind a bounded queue, so a slow metrics database cannot slow table loads.
3. **Count drops with a dedicated metric.** A counter like the one proposed for Polaris turns a silent loss into an alert.
4. **Keep the route out of your core availability numbers.** Yufei raised excluding the metrics endpoint from the core availability SLO, and JB called it a useful complement.
5. **Parse leniently.** Accept unknown metric keys and unknown `report-type` values. Return 400 only for bodies that are not reports at all.
6. **Validate the table and the caller.** The endpoint documents 403 and 404 for a reason. Do not store reports about tables the caller cannot see.
7. **If you do not store reports, say so through discovery.** Leave the route out of the `endpoints` list in the config response.

## Conclusion

The `reportMetrics` endpoint is small, and the November 2026 threads show why small endpoints still deserve careful semantics. The spec defines the route, the body, and the status codes. It does not say whether delivery is guaranteed. The Iceberg maintainers who replied agreed that clients do not retry and the commit never depends on the report. They did not fully agree on whether a catalog that fails to store a report can still answer 204.

For practitioners, the takeaway is concrete. Treat scan and commit reports as high-value telemetry with no delivery guarantee. Use them to find manifest sprawl, delete-file buildup, commit contention, and the jobs that cost the most to plan. Do not build invoices on them without reconciling against table metadata and engine logs. If you run a catalog, pick a failure policy on purpose, make drops visible, and keep a metrics outage from looking like a catalog outage.

## Keep Going

If this piece was useful, I have written a lot more on how Iceberg catalogs work under the hood. _Apache Polaris: The Definitive Guide_ covers running an Iceberg REST catalog, including its APIs, security model, and operations. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [dev@iceberg: REST catalog spec, semantics of the metrics reporting endpoint when the server fails to process a report (November 2026)](https://lists.apache.org/thread/1nfwnk1j8sppmsry675ygr1jbxyhvrdx)
- [dev@polaris: Metrics endpoint, drop instead of 500 on reporter DB failure (#5395)](https://lists.apache.org/thread/nr26wj17kvfvvgyyxh63mc7y95j8pgbc)
- [Apache Iceberg REST Catalog OpenAPI spec (rest-catalog-open-api.yaml)](https://github.com/apache/iceberg/blob/main/open-api/rest-catalog-open-api.yaml)
- [Apache Iceberg docs: Metrics Reporting](https://iceberg.apache.org/docs/latest/metrics-reporting/)
- [Apache Iceberg source: RESTMetricsReporter.java](https://github.com/apache/iceberg/blob/main/core/src/main/java/org/apache/iceberg/rest/RESTMetricsReporter.java)
- [Apache Iceberg source: ReportMetricsRequestParser.java](https://github.com/apache/iceberg/blob/main/core/src/main/java/org/apache/iceberg/rest/requests/ReportMetricsRequestParser.java)
- [Apache Iceberg source: SnapshotScan.java](https://github.com/apache/iceberg/blob/main/core/src/main/java/org/apache/iceberg/SnapshotScan.java)
- [Apache Iceberg source: CommitMetricsResult.java](https://github.com/apache/iceberg/blob/main/core/src/main/java/org/apache/iceberg/metrics/CommitMetricsResult.java)
