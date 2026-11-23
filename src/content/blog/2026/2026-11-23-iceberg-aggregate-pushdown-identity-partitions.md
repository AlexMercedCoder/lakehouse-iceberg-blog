---
title: "Answering GROUP BY From Iceberg Metadata: Aggregate Pushdown on Identity Partitions"
description: "When Spark answers COUNT, MIN and MAX from Iceberg file metadata, why GROUP BY turns it off today, and how PR #16176 extends pushdown to identity partitions."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Apache Iceberg"
tags:
  - Apache Iceberg
  - aggregate pushdown
  - Spark
  - query optimization
  - metadata
slug: "iceberg-aggregate-pushdown-identity-partitions"
draft: false
canonicalURL: https://datalakehousehub.com/blog/iceberg-aggregate-pushdown-identity-partitions/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/iceberg-aggregate-pushdown-identity-partitions/).

Spark can already answer COUNT, MIN and MAX on Iceberg tables from file metadata, without reading data, but only when the query has no GROUP BY. An October 29, 2026 thread revived PR #16176, which also pushes these aggregates down when every grouping column is an identity partition field.

Here is the query that started this for me. A table is partitioned by `region`. Someone runs `SELECT region, count(*) FROM events GROUP BY region` to check that last night's load landed in every region. Every number that query needs already sits in Iceberg's manifests. Each data file records its partition tuple and its row count. Spark still launches a full scan, opens every Parquet file, decodes the rows, shuffles them by region and adds them up.

Drop the GROUP BY and the picture changes. `SELECT count(*) FROM events` comes back from metadata alone, with no Spark tasks reading data files. Add the GROUP BY back and you pay for a full table scan again. That gap is the subject of this piece.

The gap is a deliberate limit in the Spark integration, with a TODO comment sitting right next to it in the source. Aaron Niskode-Dossett, a data engineer at Etsy, posted to the Iceberg dev list on October 29, 2026 to ask the community to look at a stale pull request that closes it. He was clear that the PR was not his. He wrote that he had "frequently wanted these types of queries in spark to run much faster, and many of my users do as well."

This article covers when Spark answers an aggregate from Iceberg metadata today, why identity partitions make GROUP BY safe, and what the proposed change does. For the filter side of pushdown, see the [Iceberg Predicate Pushdown KB](https://iceberglakehouse.com/iceberg/iceberg-predicate-pushdown/). This piece stays on aggregates.

## How Metadata-Only Aggregates Work

An Iceberg table is a tree of metadata files. The table metadata points at a snapshot. The snapshot points at a manifest list. The manifest list points at manifests, and each manifest holds one entry per data file. That per-file entry is where the aggregate answers live.

Each data file entry carries a set of fields that Spark can read without touching the file itself:

- `record_count`, the number of rows in the file.
- `partition`, the tuple of partition values for that file under the spec it was written with.
- `value_counts` and `null_value_counts`, per-column counts of values and nulls.
- `nan_value_counts`, per-column counts of NaN values for floating point columns.
- `lower_bounds` and `upper_bounds`, per-column minimum and maximum values, stored as serialized bytes.

With those fields, three aggregates fall out with simple arithmetic. `COUNT(*)` is the sum of `record_count` across files. `COUNT(col)` is the sum of `value_counts` minus `null_value_counts` for that column. `MAX(col)` is the largest upper bound across files, and `MIN(col)` is the smallest lower bound.

The Iceberg API models this directly. The `org.apache.iceberg.expressions` package has `CountStar`, `CountNonNull`, `MaxAggregate` and `MinAggregate` classes. Each one knows how to compute its value from a `DataFile` instead of from a row. `CountStar` reads `recordCount()` and returns nothing usable if the count is negative. `CountNonNull` subtracts the null count from the value count for the column's field ID. `MaxAggregate` reads the upper bound for the field ID and converts the bytes back to the column type.

An `AggregateEvaluator` wraps a list of these bound aggregates. The Spark integration feeds it every data file in the scan, one at a time, through `update(DataFile)`. At the end it checks `allAggregatorsValid()`. If any aggregate hit a file where the needed statistic was missing, the evaluator reports invalid and the whole pushdown is abandoned.

When the evaluator succeeds, Spark gets a tiny in-memory result. The Iceberg connector wraps it in a `SparkLocalScan`, which implements Spark's `LocalScan` interface. A local scan hands Spark a fixed array of rows instead of a set of file splits. Spark never schedules a read task against your object store. Planning still reads manifests, so the cost of the query becomes the cost of planning, not the cost of scanning.

Two properties of this design matter for everything below.

First, the answer is only as good as the statistics. If a writer did not collect bounds for a column, there is nothing to take a maximum over. If the bounds were truncated, the maximum is wrong. The column metrics configuration on the table decides what gets collected, and the [Iceberg Metrics Mode KB](https://iceberglakehouse.com/iceberg/iceberg-metrics-mode/) covers those settings in detail.

Second, the statistics describe the file as written. They do not know about rows that later commits marked as deleted through delete files. A file with 1,000 rows and a position delete file removing 50 of them still says `record_count` is 1,000. Any metadata-only answer has to account for that, and the current code accounts for it by refusing to push down at all.

## What Spark Checks Before It Skips the Scan

Spark's DataSource V2 API gives connectors a hook for this. A scan builder that implements `SupportsPushDownAggregates` receives an `Aggregation` object through `pushAggregation`. The object lists the aggregate functions and the GROUP BY expressions. The connector returns `true` if it can produce the result itself, and `false` if Spark has to compute it from rows.

In Iceberg's Spark module, `SparkScanBuilder` implements that hook. Reading the current `main` branch for the Spark 4.1 module, the decision runs through a fixed sequence of gates. Every gate has to pass. Any single failure sends the query back to a normal batch scan.

1. **The read targets the main table.** The builder checks that the table is a regular table and not a metadata table such as `files` or `snapshots`.
2. **The feature is on.** The session property `spark.sql.iceberg.aggregate-push-down.enabled` defaults to `true`. The per-read option `aggregate-push-down-enabled` overrides it for one DataFrame read.
3. **There is no GROUP BY.** Today, if `groupByExpressions()` is non-empty, the builder logs "group by aggregation push down is not supported" and returns `false`.
4. **Every aggregate converts.** Each Spark aggregate function has to map to an Iceberg aggregate expression and bind to the table schema. Only `COUNT(*)`, `COUNT(col)`, `MIN(col)` and `MAX(col)` convert, and `COUNT(DISTINCT col)` does not, since manifests carry no distinct counts. `SUM` and `AVG` do not convert either. A query mixing `COUNT(x)` and `SUM(x)` gets no pushdown for either.
5. **The metrics mode supports each aggregate.** Columns in mode `none` block everything. Columns in mode `counts` allow `COUNT` but block `MIN` and `MAX`. String and binary columns block `MIN` and `MAX` in every mode, because their bounds can be truncated.
6. **No file in the scan has delete files.** The builder plans the files with column stats included, then walks every `FileScanTask`. If any task has attached deletes, it logs "detected row level deletes" and gives up.
7. **Every aggregator is valid at the end.** Missing bounds, negative record counts, or NaN values in float and double columns invalidate the result.

Gate 4 is all-or-nothing on purpose. Iceberg's own test suite has a case named `testAggregateNotPushDownIfOneCantPushDown` that runs `SELECT COUNT(data), SUM(data)` and asserts that neither aggregate is pushed. Spark either replaces the whole aggregate with a local scan or it does not.

There is also a gate that lives in Spark rather than in Iceberg. Spark's `V2ScanRelationPushDown` rule only attempts aggregate pushdown when no filters remain above the scan after filter pushdown. That makes the interaction with WHERE clauses important.

Iceberg's `pushPredicates` sorts filters into three groups. Some filters select entire partitions, so Iceberg evaluates them completely during planning and Spark does not need to re-check them. Some filters only prune files and still need row-level checks in Spark. Some filters cannot be converted at all. Only the first group leaves nothing behind for Spark.

So `SELECT max(amount) FROM sales WHERE region = 'east'` on a table partitioned by `region` keeps pushdown, because the filter selects whole partitions. `SELECT max(amount) FROM sales WHERE amount > 100` loses it, because the filter needs row-level evaluation. Iceberg's tests `testAggregatePushDownWithDataFilter` and `testAggregatePushDownWithPartitionFilter` check exactly this split, running the same `MIN` query against an unpartitioned table and a partitioned one.

## When Spark Falls Back to a Scan Today

It helps to turn those gates into concrete queries you will recognize. Assume a table partitioned by `region`, with an integer `amount` column, a string `customer` column and default metrics settings.

| Query shape                                          | Pushed today | Reason                                             |
| ---------------------------------------------------- | ------------ | -------------------------------------------------- |
| `SELECT count(*) FROM sales`                         | Yes          | Sum of `record_count`                              |
| `SELECT min(amount), max(amount) FROM sales`         | Yes          | Bounds exist under the default `truncate(16)` mode |
| `SELECT max(customer) FROM sales`                    | No           | String bounds can be truncated                     |
| `SELECT count(*), sum(amount) FROM sales`            | No           | `SUM` does not convert, so nothing is pushed       |
| `SELECT count(*) FROM sales WHERE region = 'east'`   | Yes          | Filter selects whole partitions                    |
| `SELECT count(*) FROM sales WHERE amount > 100`      | No           | Filter stays above the scan                        |
| `SELECT region, count(*) FROM sales GROUP BY region` | No           | Any GROUP BY disables pushdown                     |
| Any of the above after a merge-on-read DELETE        | No           | Delete files attached to scan tasks                |

Read the GROUP BY row next to the WHERE row above it. Iceberg pushes `count(*)` with `WHERE region = 'east'`. You can run that once per region and get every count from metadata. Ask for all the regions at once with GROUP BY and you get a full scan. The information content is identical. Only the query shape differs.

The TODO comment in `canPushDownAggregation` names this asymmetry and defers the fix to a "next phase."

The metrics mode rows also hide a trap for wide tables. Iceberg's `write.metadata.metrics.max-inferred-column-defaults` property defaults to 100. Columns beyond that limit in a pre-order traversal of the schema do not get default metrics. An aggregate on column 140 of a 200-column table falls back, even though the table-level default mode looks fine. Setting an explicit `write.metadata.metrics.column.<name>` mode for the columns you aggregate on fixes that for files written afterward.

## Why Identity Partitions Make GROUP BY Safe

A metadata-only GROUP BY needs one guarantee to hold. Every row in a data file must belong to the same group, and the manifest must say which group that is. If both are true, each file's stats can be added to one bucket, and the buckets are the answer.

Iceberg's partitioning gives you the first half for free. Writers split rows so that every data file holds rows from exactly one partition. The partition tuple for that file is stored in its manifest entry. The question is whether that tuple tells you the GROUP BY key.

For an identity partition, it does. An identity transform stores the source column's value unchanged. A file in partition `region = 'east'` contains only rows where `region` is `'east'`. The partition value in the manifest is the exact group key. There is no rounding and no hashing to undo.

Compare that with the other transforms:

- **`bucket(N, col)`** stores a hash bucket number. A file in bucket 3 holds many distinct values of `col`. You cannot group by `col` from bucket numbers.
- **`truncate(W, col)`** stores a prefix or a rounded-down number. A file in partition `'abc'` holds `'abcd'`, `'abcz'` and anything else with that prefix.
- **`year`, `month`, `day`, `hour`** store a time unit. A file in day `2026-10-29` holds many distinct timestamps. Grouping by the raw timestamp column is impossible from the partition value.

The time transforms raise an obvious follow-up about `GROUP BY day(ts)` on a table partitioned by `day(ts)`, where the partition value does match the group key. The proposed change does not attempt it. It only accepts GROUP BY expressions that are plain column references, and it requires an identity partition field on that column. A transform expression in the GROUP BY ends the attempt.

Identity partitioning also solves a subtle problem with the group key itself. The aggregates read bounds and counts from column statistics, which can be truncated or missing. The group key comes from the partition tuple, which is never truncated. A string partition column like `region` produces an exact group key even though `MAX(region)` itself is not pushable on string columns. The key is exact because it comes from a different part of the manifest entry.

Nulls work too. Rows with a null `region` land in files whose partition tuple holds a null, so they form one null group, just as SQL GROUP BY expects. The PR includes a test for exactly that.

## What PR #16176 Changes

The pull request is titled "Spark: Support aggregate pushdown for identity partition column GROUP BY." Its description, quoted in the dev list thread, says it enables aggregate pushdown for queries with GROUP BY on identity partition columns. It points out that today the pushdown is disabled even when the GROUP BY columns are identity partition fields.

The diff touches `SparkScanBuilder.java` and the `TestAggregatePushDown` test class in the `spark/v4.1` module.

It removes the early return for GROUP BY from `canPushDownAggregation`, along with the TODO comment. The metrics mode and aggregate conversion gates still run first, exactly as before.

It adds a branch in `pushAggregation`. When `groupByExpressions()` is non-empty, control goes to a new `pushGroupByAggregation` method. That method does three things.

**Resolve the GROUP BY columns to field IDs.** For each GROUP BY expression, it requires a `NamedReference`, looks up the column in the table schema, and checks that the current partition spec has an identity field with that source field ID. A code comment explains the choice of field IDs over positions as "for spec evolution safety." Any expression that fails these checks logs a reason and ends the attempt.

**Group files by partition value.** It plans the files with stats, the same way the ungrouped path does. For each file, it looks up the spec that file was written with, using the file's own `specId()`. It finds the position of the identity field for each GROUP BY column in that spec and reads the value from the file's partition tuple. That list of values becomes the map key. Each key gets its own `AggregateEvaluator`, and the file updates it.

**Build a local scan with one row per group.** After all files are processed, it checks that every evaluator is valid. Then it builds a result schema of the GROUP BY columns followed by the aggregate columns, writes one row per group, and returns a `SparkLocalScan` holding those rows.

Here is the core of the grouping loop from the diff, trimmed slightly:

```java
for (FileScanTask task : fileScanTasks) {
  if (!task.deletes().isEmpty()) {
    LOG.info("Skipping grouped aggregate pushdown: detected row level deletes");
    return null;
  }

  // resolve partition values using the file's own spec (handles spec evolution)
  PartitionSpec fileSpec = table().specs().get(task.file().specId());
  StructLike partition = task.file().partition();
  List<Object> key = Lists.newArrayListWithCapacity(groupBySourceIds.size());

  for (int sourceId : groupBySourceIds) {
    int pos = findIdentityPartitionPosition(fileSpec, sourceId);
    if (pos < 0) {
      // the file's spec has no identity field for this column
      return null;
    }
    key.add(partition.get(pos, Object.class));
  }

  evaluatorsByPartition
      .computeIfAbsent(key, k -> AggregateEvaluator.create(boundAggregates))
      .update(task.file());
}
```

The delete check is the same rule the ungrouped path uses, so merge-on-read deletes still end pushdown. The `fileSpec` lookup matters for evolved tables, because it resolves the partition position against the spec that wrote this file.

The inner loop builds the group key from the partition tuple. If any file was written under a spec with no identity field for a GROUP BY column, the method returns `null` and the query falls back to a normal scan. The last statement routes the file's stats into the evaluator for its group.

Spark does not hand the whole aggregation to Iceberg here. `SparkScanBuilder` does not override `supportCompletePushDown`, so Spark keeps its own final aggregation on top of the local scan rows. That final step has little work to do, but it is why the plan keeps an aggregate node.

## Correctness Traps: Delete Files, Truncated Stats, Partition Evolution

Metadata answers are fast because they skip the data. That also means a wrong answer arrives fast and looks just as confident as a right one. Three traps matter for grouped pushdown, and the PR handles each one by falling back rather than guessing.

**Delete files.** A data file's `record_count` counts rows as written. Position deletes and equality deletes remove rows without rewriting the file. A grouped count that ignored them overstates every affected partition. The PR keeps the existing rule: if any scan task carries delete files, the whole grouped pushdown is abandoned.

This is conservative. One partition with one delete file disables pushdown for every partition in the query. Copy-on-write tables avoid the problem, and Iceberg's test `testAggregatePushDownInDeleteCopyOnWrite` confirms that pushdown survives a copy-on-write `DELETE`. On merge-on-read tables, metadata answers come back only after rewriting the affected data files.

**Truncated stats.** Under the default `truncate(16)` metrics mode, string bounds are cut to 16 characters. A truncated upper bound is not the true maximum. The existing metrics check already blocks `MIN` and `MAX` on string and binary columns in every mode, and the grouped path runs after that check. So `SELECT region, max(customer) ... GROUP BY region` still falls back. `SELECT region, max(amount) ... GROUP BY region` on a numeric column pushes, as long as the column has bounds.

NaN values are their own trap. `MaxAggregate` refuses to use a file whose NaN count for the column is above zero, because the true maximum depends on how NaN sorts.

**Partition evolution.** Iceberg lets a table change its partition spec without rewriting old files. Old files keep the spec they were written with. That is the feature described in the [Iceberg Partition Evolution KB](https://iceberglakehouse.com/iceberg/iceberg-partition-evolution/), and it is the reason the PR reads each file's own spec.

The PR's tests cover two evolution cases. In the first, a table partitioned by `region` adds `id` as a second identity field. Old files have a one-field tuple and new files have a two-field tuple, but both specs contain `region` as an identity field. The grouped query by `region` returns correct counts and maxima across both generations of files.

In the second, the table removes `region` from the spec and adds `id`. New files are split by `id`, not by region, and their partition tuples say nothing about region. The test checks that the query still returns a count of 2 for each region, which is the full-scan answer. Here the fallback happens early, because `region` is no longer an identity field in the current spec. The per-file check covers the reverse case, where the current spec has the field and an older file's spec does not.

## How to Confirm Pushdown in a Query Plan

Spark's `EXPLAIN` tells you whether the aggregate came from metadata. This session, run on a current Iceberg release, shows ungrouped pushdown, the GROUP BY fallback, and the stats behind both.

```sql
-- Session switch (default is true). The per-read DataFrame option is aggregate-push-down-enabled.
SET spark.sql.iceberg.aggregate-push-down.enabled = true;

CREATE TABLE demo.db.sales (id BIGINT, amount DOUBLE, region STRING)
USING iceberg
PARTITIONED BY (region);

INSERT INTO demo.db.sales VALUES
  (1, 10.0, 'east'), (2, 20.0, 'east'), (3, 5.0, 'west'), (4, 50.0, 'west');

-- 1. Ungrouped: answered from metadata today
EXPLAIN SELECT count(*), min(amount), max(amount) FROM demo.db.sales;

-- 2. Grouped on an identity partition column: scans today
EXPLAIN SELECT region, count(*), max(amount) FROM demo.db.sales GROUP BY region;

-- 3. The per-file stats the pushdown reads
SELECT partition, record_count,
       readable_metrics.amount.lower_bound,
       readable_metrics.amount.upper_bound,
       readable_metrics.amount.nan_value_count
FROM demo.db.sales.files;
```

The `SET` line is only needed if someone turned the default off. For a single DataFrame read, the option `aggregate-push-down-enabled` overrides the session setting.

The first `EXPLAIN` is the baseline. When pushdown succeeds, the physical plan shows a `LocalTableScan` where you expect a batch scan. The Iceberg `SparkLocalScan` describes itself as `IcebergLocalScan(table=..., filters=...)`. Iceberg's tests check for the pushed aggregate names, such as `count(*)` and `max(amount)`, in the lowercased explain text. If you see a `BatchScan` reading the table instead, something in the gate list failed.

The second `EXPLAIN` shows the gap. On today's code, the plan has a `BatchScan` of the table under a hash aggregate. The PR's tests assert the opposite for this exact shape. With the patch applied, the explain output contains `localtablescan`, and the query returns one row per region.

The third query is your debugging tool. The `files` metadata table exposes each data file's partition tuple and record count. Its `readable_metrics` column decodes the per-column bounds and counts into readable values. If `lower_bound` or `upper_bound` is null for the column you aggregate, the file has no bounds and `MIN` or `MAX` falls back. If `nan_value_count` is above zero, `MAX` and `MIN` fall back for that column.

When the plan shows a scan you did not expect, check the driver logs. Every fallback in `SparkScanBuilder` logs a line at INFO level that starts with "Skipping aggregate pushdown," and the PR's grouped path uses "Skipping grouped aggregate pushdown." The rest of the line names the reason, such as "detected row level deletes" or "is not an identity partition field."

## PR Status and How to Test It

As of this writing, PR #16176 is an open proposal, not shipped behavior. Aaron's October 29 message described it as a PR that "had some activity but has gone stale," and asked the list what people thought. The thread had no replies when I read it. Nobody on the list has committed to merging it, and I am not going to predict whether it lands or in what form. Check the PR page on GitHub for its current review state before planning around it.

The diff targets the `spark/v4.1` module only. Iceberg keeps separate source trees for each supported Spark version, and changes often land in the newest version first and get backported later. If you run an older Spark line, expect the change to reach you later than it reaches Spark 4.1, if it reaches you at all.

If you want to help move it forward, the most useful thing is evidence. Here is my test plan.

1. **Build the branch.** Check out the PR branch from the Iceberg repository and build the Spark 4.1 runtime jar with the project's Gradle build. Put that jar on a Spark 4.1 session pointed at a test catalog.
2. **Run the PR's own tests first.** The new test methods in `TestAggregatePushDown` cover a count-only GROUP BY, a GROUP BY with `MIN` and `MAX`, a GROUP BY on a non-partition column that must not push down, multiple files per partition, both spec evolution cases, and null partition values. They are the contract the PR claims to meet.
3. **Reproduce your real query shapes.** Copy the schema and partition spec of a production table into a test catalog, load a sample, and run your common GROUP BY queries with `EXPLAIN`. Look for `LocalTableScan` in the plan.
4. **Compare answers both ways.** For every query, run it once with pushdown on and once with `spark.sql.iceberg.aggregate-push-down.enabled` set to `false`. The rows must match exactly. Sort both results by the group key before comparing, since group order is not guaranteed.
5. **Try to break it.** Add a merge-on-read delete and confirm fallback. Evolve the spec and confirm the results stay correct. Write rows with null partition values. Add a string column and ask for its `MAX`. Each of these has a defined expected behavior from the sections above.
6. **Measure planning cost.** Grouped pushdown moves work from executors to the driver. The driver plans every file with column stats and builds one evaluator per partition. On a table with hundreds of thousands of files and many partitions, time the planning phase and watch driver memory. Report what you see, with the table's file count and partition count, on the PR or the dev list.

That last step matters most. The ungrouped path holds one evaluator, and the grouped path holds one per distinct partition key. A few dozen regions is trivial. A high-cardinality identity partition is not, and real numbers from real tables are what the thread is missing.

## Conclusion

Spark already turns `COUNT`, `MIN` and `MAX` into a metadata read on Iceberg tables. It sums `record_count`, subtracts null counts from value counts, and takes the extreme bounds across files. It does this only when every gate passes: a main-table read, the feature enabled, convertible aggregates, metrics that support each aggregate, no leftover filters, no delete files in the scan, and, today, no GROUP BY.

Identity partitions are the case where the GROUP BY rule is stricter than it needs to be. Every file in an identity partition holds one exact group key, and the manifest records that key without truncation. PR #16176 uses that fact. It groups files by the identity partition values from each file's own spec, runs the existing per-file evaluator inside each group, and falls back whenever a file lacks the field, carries deletes, or has unusable stats.

For today, keep the session property on, keep delete files compacted on tables where metadata counts matter, and read `EXPLAIN` output and the "Skipping aggregate pushdown" log lines instead of guessing. If grouped counts on identity partitions are a daily cost for you, build the PR, test it against your own tables, and post what you find on the thread.

## Keep Going

If this piece was useful, I have written a lot more on Apache Iceberg internals and query performance. _Apache Iceberg: The Definitive Guide_ covers the metadata tree, partitioning and partition evolution, and how engines use manifests to plan queries. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [dev@iceberg thread on PR 16176 (October 29, 2026)](https://lists.apache.org/thread/bt639rksgy0s6frv6dgq3l5rgpo4lg2g)
- [apache/iceberg PR #16176 (diff)](https://patch-diff.githubusercontent.com/raw/apache/iceberg/pull/16176.diff)
- [SparkScanBuilder.java (Spark 4.1)](https://github.com/apache/iceberg/blob/main/spark/v4.1/spark/src/main/java/org/apache/iceberg/spark/source/SparkScanBuilder.java)
- [TestAggregatePushDown.java (Spark 4.1)](https://github.com/apache/iceberg/blob/main/spark/v4.1/spark/src/test/java/org/apache/iceberg/spark/sql/TestAggregatePushDown.java)
- [SparkSQLProperties.java](https://github.com/apache/iceberg/blob/main/spark/v4.1/spark/src/main/java/org/apache/iceberg/spark/SparkSQLProperties.java)
- [Iceberg Spark configuration](https://iceberg.apache.org/docs/latest/spark-configuration/)
- [Iceberg table properties](https://iceberg.apache.org/docs/latest/configuration/)
- [Iceberg Spark queries and metadata tables](https://iceberg.apache.org/docs/latest/spark-queries/)
- [Iceberg aggregate expressions](https://github.com/apache/iceberg/tree/main/api/src/main/java/org/apache/iceberg/expressions)
- [Spark V2ScanRelationPushDown.scala](https://github.com/apache/spark/blob/branch-4.0/sql/core/src/main/scala/org/apache/spark/sql/execution/datasources/v2/V2ScanRelationPushDown.scala)
