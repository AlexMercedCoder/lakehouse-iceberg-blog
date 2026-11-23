---
title: "The Iceberg Catalog Federation Matrix: Which Platforms Can Mount Which Catalogs"
description: "A dated matrix of which lakehouse platforms can mount which Iceberg catalogs, read-only or read-write, built only from vendor docs as of November 2026."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Apache Iceberg"
tags:
  - Apache Iceberg
  - catalog federation
  - data platforms
  - vendor documentation
  - comparison
slug: "iceberg-catalog-federation-matrix-2026-11"
draft: false
canonicalURL: https://datalakehousehub.com/blog/iceberg-catalog-federation-matrix-2026-11/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/iceberg-catalog-federation-matrix-2026-11/).

Catalog federation means one platform reads tables registered in another platform's catalog without copying metadata. In November 2026, Google and Oracle both announced federation with Databricks Unity Catalog, and Google added Snowflake Horizon and AWS Glue. This matrix lists, for each platform pair, whether federation is read-only or read-write and what it requires.

This page covers the decision side: who can mount whom today, and how far that access goes. The mechanism side, meaning how an engine opens connections to several catalogs and plans one query across them, lives on IcebergLakehouse.com in the [Catalog Federation KB](https://iceberglakehouse.com/iceberg/catalog-federation/) and in [Multi-Engine Catalog Federation with Apache Polaris](https://iceberglakehouse.com/posts/multi-engine-catalog-federation-apache-polaris-multicloud/). Read those for how it works. Read this one for what each vendor documents as of November 23, 2026.

Here is the problem this grid exists to solve. A data platform team owns Iceberg tables in Unity Catalog. The analytics team runs BigQuery. A finance group sits on Oracle. Someone in a planning meeting says "every platform supports Iceberg now, so they can all just read each other's tables." Then the first ticket arrives. The BigQuery side can list the tables but cannot write a derived table back. The Oracle side sees Unity tables that have UniForm enabled but not the ones created natively as Iceberg. The Snowflake side writes to AWS Glue just fine, but a table it dropped with PURGE last week left every data file sitting in S3.

None of those outcomes is a bug. Each one is written down in a vendor's documentation, usually in a sentence near the bottom of a setup page. The sentences live on a dozen pages with different dates and different words for the same idea. Google says "federated catalog." Databricks says "foreign catalog." Snowflake says "catalog-linked database." Oracle says "mount." AWS says "federated catalog" too, but means something with a different credential model than Google does.

So I opened the pages, recorded what each one says, and put a date and a link in every cell. Where a vendor does not say, the cell says "not documented." If a vendor does not document a pairing, you are the one who discovers how it behaves.

Disclosure: I work at Dremio, which ships its own federated catalog. I kept it out of the grid because the matrix covers the platforms in the November announcements and the catalogs they named.

## What Counts as Federation in This Matrix

A cell in this matrix counts as federation only when three things hold. The consuming platform connects to the remote catalog with its own credentials. It discovers namespaces and tables from that catalog rather than from a list someone typed in. And it reads the Iceberg data files in place, from the storage the remote catalog points to, without a copy job.

That definition rules out a few things vendors sometimes group under the same word. It rules out replication, where a pipeline copies data files or metadata into a second catalog on a schedule. It rules out one-way sync, where the owning catalog pushes table pointers to a second catalog that serves them read-only. And it rules out query federation over JDBC, where the consuming engine sends SQL to the remote warehouse and gets rows back. All three are useful. None of them is the thing this matrix measures.

Google's federated catalogs keep a local copy of table definitions. The [October 13, 2026 Google Cloud post](https://cloud.google.com/blog/products/data-analytics/cross-cloud-conversational-analytics-with-borderless-lakehouse) says the Lakehouse runtime catalog "periodically syncs schemas, snapshot pointers, and table definitions" on a refresh schedule with a 300-second minimum. I still count that as federation, because the remote catalog stays the source of truth and the sync is a cache of pointers, not a copy of tables.

Snowflake Open Catalog goes the other way. Its [overview page](https://docs.snowflake.com/en/user-guide/opencatalog/overview) says tables from an external catalog "are synced to Open Catalog" and "are read-only in Open Catalog," and that "only a Snowflake external catalog is provided." That is push-based sync from one source. It gets a row so you can see why it does not count.

Databricks sits on the line too. Its [Snowflake catalog federation page](https://docs.databricks.com/aws/en/query-federation/snowflake-catalog-federation) (updated November 5, 2026) reads Iceberg tables straight from storage when it can. When a table fails the criteria, such as metadata stored outside the table location, Databricks falls back to querying Snowflake over JDBC. Views always go over JDBC. The matrix cell describes the direct-read path, and the fallback is called out in the notes.

The [Polaris federation post](https://iceberglakehouse.com/posts/multi-engine-catalog-federation-apache-polaris-multicloud/) has a full section, "Federation Is Not the Same as Replication," that separates shared catalog access, metadata mirroring, interoperability and migration. I use the narrowest meaning here because a narrow definition gives a grid you can test.

## How the Matrix Was Built

Every cell comes from a page I opened on November 23, 2026, ranked in three tiers.

Product documentation from Google, AWS, Databricks, Snowflake, Oracle and Apache Polaris carries the most weight. When a doc page and a blog post disagree, the doc page wins, and the disagreement goes in the notes. Dated vendor announcements, such as release notes and engineering blogs, supply launch stage and fill in dates. Press coverage comes last. The two November 4, 2026 stories that set off this update are [Techzine's report on Google's Agentic Data Cloud](https://www.techzine.eu/news/analytics/145556/google-agentic-data-cloud-gets-cross-cloud-lakehouse/) and [SiliconANGLE's interview from Oracle AI World](https://siliconangle.com/2026/11/04/semantic-layer-turns-lakehouses-ai-decision-backbones-oracleaiworld/). Press never fills a cell by itself.

Dates follow one rule. If a page shows a "last updated" date, the cell uses it. If it shows none, as is true of every Snowflake and AWS Lake Formation page I opened, the cell says "undated" and gives the date I read it.

Each cell holds one of five values:

- **Read**: documented read access. Writes are either ruled out or not mentioned.
- **Read/write**: documented reads and writes to the remote catalog from the consuming platform.
- **Pass-through**: the consuming catalog forwards operations, so the remote catalog decides what works.
- **Not documented**: no page I found names the pairing.
- **Sync only**: a push-based copy of pointers, not federation.

"Read" never means "writes are forbidden" unless the note says so. Some vendors state read-only outright. Others only describe reads and say nothing about writes. I mark both as Read and quote the source in the notes so you can see which kind it is.

## The Matrix, as of November 23, 2026

Rows are the platforms doing the mounting. Columns are the catalogs being mounted. "Self" marks a platform's own catalog. Each cell gives the access level, the page it comes from, and that page's date.

| Mounting platform                                | Databricks Unity Catalog                                                                                                                                                                                                                                                                    | Snowflake (Horizon, Open Catalog, Polaris)                                                                                                                                                                                                                                                                                | AWS Glue Data Catalog                                                                                                                                                       | Google Lakehouse runtime catalog                                                                                                                                                      | Other documented targets                                                                                                                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Google Cloud Lakehouse** (formerly BigLake)    | **Read**, stated read-only ([doc](https://docs.cloud.google.com/lakehouse/docs/set-up-cross-cloud-connection-databricks), updated 2026-11-09)                                                                                                                                               | **Read**, Horizon only, stated read-only ([doc](https://docs.cloud.google.com/lakehouse/docs/set-up-cross-cloud-connection-snowflake), updated 2026-11-16)                                                                                                                                                                | **Read**, stated read-only ([doc](https://docs.cloud.google.com/lakehouse/docs/set-up-cross-cloud-lakehouse-aws-glue), updated 2026-11-21)                                  | Self                                                                                                                                                                                  | Workday Data Lake, SAP Business Data Cloud ([doc](https://docs.cloud.google.com/biglake/docs/set-up-cross-cloud-lakehouse), updated 2026-11-19). Open Catalog and Polaris: not documented                                                    |
| **AWS Glue Data Catalog** (with Lake Formation)  | **Read** ([doc](https://docs.aws.amazon.com/lake-formation/latest/dg/catalog-federation-databricks.md), undated, read 2026-11-23. [AWS blog](https://aws.amazon.com/blogs/big-data/access-databricks-unity-catalog-data-using-catalog-federation-in-the-aws-glue-data-catalog), 2026-01-12) | **Read**, Horizon and Polaris catalogs ([doc](https://docs.aws.amazon.com/lake-formation/latest/dg/catalog-federation-snowflake.md), undated, read 2026-11-23. [AWS blog](https://aws.amazon.com/blogs/big-data/access-snowflake-horizon-catalog-data-using-catalog-federation-in-the-aws-glue-data-catalog), 2026-01-14) | Self                                                                                                                                                                        | Not documented ([doc](https://docs.aws.amazon.com/lake-formation/latest/dg/catalog-federation.md), read 2026-11-23)                                                                   | Workday Data Connect, other Iceberg REST catalogs ([What's New](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-glue-catalog-federation-remote-apache-iceberg-catalogs), GA 2025-11-24)                                               |
| **Databricks Unity Catalog**                     | Self                                                                                                                                                                                                                                                                                        | **Read** ([doc](https://docs.databricks.com/aws/en/query-federation/catalog-federation), updated 2026-11-05)                                                                                                                                                                                                              | **Read** ([doc](https://docs.databricks.com/aws/en/query-federation/catalog-federation), updated 2026-11-05)                                                                | **Read**, stated read-only ([doc](https://docs.databricks.com/gcp/en/query-federation/google-cloud-lakehouse), updated 2026-11-03)                                                    | External Hive metastore, Salesforce Data 360, Palantir Foundry, Workday Data Connect, all read ([doc](https://docs.databricks.com/aws/en/query-federation/catalog-federation), updated 2026-11-05). Open Catalog and Polaris: not documented |
| **Snowflake** (catalog-linked database)          | **Read/write** ([tutorial](https://docs.snowflake.com/en/user-guide/tutorials/tables-iceberg-set-up-bidirectional-access-to-unity-catalog), undated, read 2026-11-23)                                                                                                                       | **Read/write** for Open Catalog ([doc](https://docs.snowflake.com/user-guide/tables-iceberg-externally-managed-writes), undated, read 2026-11-23). Horizon in another account listed as a source                                                                                                                          | **Read/write** via Glue Iceberg REST ([doc](https://docs.snowflake.com/user-guide/tables-iceberg-externally-managed-writes), undated, read 2026-11-23)                      | **Read**, listed as a catalog source, write not documented ([doc](https://docs.snowflake.com/user-guide/tables-iceberg-configure-catalog-integration-rest), undated, read 2026-11-23) | S3 Tables, Microsoft OneLake, Tabular, any Iceberg REST catalog ([doc](https://docs.snowflake.com/user-guide/tables-iceberg-configure-catalog-integration-rest), undated, read 2026-11-23)                                                   |
| **Oracle Autonomous AI Database / AI Lakehouse** | **Read**, UniForm tables only ([doc](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/query-external-data-apache-iceberg.html), created 2026-11-17)                                                                                                               | **Read**, Polaris certified, Horizon supported ([doc](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/query-external-data-apache-iceberg.html), created 2026-11-17)                                                                                                                            | **Read**, same region as S3 ([doc](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/query-external-data-apache-iceberg.html), created 2026-11-17) | **Read**, stated read-only ([doc](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/query-external-data-apache-iceberg.html), created 2026-11-17)            | OCI Data Catalog, Delta Sharing providers, database links ([doc](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/manage-catalogs.html), undated, read 2026-11-23)                                                 |
| **Apache Polaris 1.7.0**                         | Not documented by name ([doc](https://polaris.apache.org/releases/1.7.0/federation/iceberg-rest-federation/), release 2026-08-02)                                                                                                                                                           | Not documented by name. Another Polaris deployment is the named example ([doc](https://polaris.apache.org/releases/1.7.0/federation/iceberg-rest-federation/), release 2026-08-02)                                                                                                                                        | **Pass-through**, named as an example remote ([doc](https://polaris.apache.org/releases/1.7.0/federation/iceberg-rest-federation/), release 2026-08-02)                     | BigQuery Metastore federation, **Pass-through** including commits ([doc](https://polaris.apache.org/releases/1.7.0/federation/bigquery-metastore-federation/), release 2026-08-02)    | Hive Metastore, optional build ([doc](https://polaris.apache.org/releases/1.7.0/federation/hive-metastore-federation/), release 2026-08-02)                                                                                                  |
| **Snowflake Open Catalog**                       | Not documented                                                                                                                                                                                                                                                                              | **Sync only**, from Snowflake ([overview](https://docs.snowflake.com/en/user-guide/opencatalog/overview), undated. [release notes](https://docs.snowflake.com/en/user-guide/opencatalog/release-notes), 2024-11-07 entry)                                                                                                 | Not documented                                                                                                                                                              | Not documented                                                                                                                                                                        | "External Iceberg catalogs other than Snowflake aren't currently supported" ([release notes](https://docs.snowflake.com/en/user-guide/opencatalog/release-notes), read 2026-11-23)                                                           |

Three patterns jump out before any footnotes. Read is the default. Of the cells that name a specific pairing, only Snowflake's row carries Read/write, and Polaris passes writes through to whatever the remote supports. The Google, AWS, Databricks and Oracle rows are read across the board.

The second pattern is that the grid is not symmetric. Unity Catalog can be mounted by Google, AWS, Snowflake and Oracle. Unity Catalog in turn mounts Snowflake, Glue and Google. Only AWS (which names "Snowflake Polaris" catalogs), Snowflake and Oracle name Polaris or Open Catalog as a mount target. Google and Databricks do not. If your plan puts an open source Polaris deployment at the center, expect to rely on the generic Iceberg REST path rather than a named connector.

The third pattern is that the dates cluster in November 2026. Every dated doc page in the Google, Databricks and Oracle rows was updated or created in November 2026. Google moved its remote catalog providers to general availability on November 2, 2026, per the [Lakehouse release notes](https://docs.cloud.google.com/lakehouse/docs/release-notes). The same feature was labeled preview in Google's [July 29, 2026 launch post](https://cloud.google.com/blog/products/data-analytics/introducing-the-borderless-lakehouse).

## Cell Notes: Google and AWS

**Google Cloud Lakehouse.** Google renamed BigLake to Lakehouse on April 20, 2026, and the BigLake metastore became the Lakehouse runtime catalog, per the [cross-cloud setup page](https://docs.cloud.google.com/biglake/docs/set-up-cross-cloud-lakehouse). That page, updated November 19, 2026, lists five supported remote catalogs: Databricks Unity Catalog, AWS Glue, Snowflake Horizon Catalog, Workday Data Lake, and SAP Business Data Cloud through the SAP BDC connector. All three per-catalog guides I opened carry the same sentence: "Federated catalogs in Lakehouse are read-only views of the remote catalog." Changes happen in the source system.

Each guide adds its own requirements. The Unity guide needs a Databricks metastore admin to turn on external data access, which is off by default. The service principal needs the `EXTERNAL USE SCHEMA` privilege, or background refresh and credential vending fail. The Snowflake guide syncs only Iceberg tables and accepts a refresh interval of `0s` or at least `300s`. Authentication is a Snowflake programmatic access token in Secret Manager or Workload Identity Federation with a Snowflake service user. The Glue guide asks for an AWS IAM role that trusts the Lakehouse service account and holds read permissions on Glue, S3 and S3 Tables, plus Lake Formation grants if Lake Formation governs the tables.

On launch stage, the [release notes](https://docs.cloud.google.com/lakehouse/docs/release-notes) list Unity Catalog, Glue, Horizon and Workday Data Lake as generally available remote catalog providers as of November 2, 2026. The July 29 launch post promised "bi-directional access," but the current docs describe only read-only federated catalogs, so the cell says Read.

**AWS Glue Data Catalog.** AWS made catalog federation to remote Iceberg catalogs generally available in all commercial regions on [November 24, 2025](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-glue-catalog-federation-remote-apache-iceberg-catalogs). The [Lake Formation guide](https://docs.aws.amazon.com/lake-formation/latest/dg/catalog-federation.md) lists three named targets: Snowflake, Databricks Unity Catalog and Workday Data Connect. The Snowflake page says it connects to "Snowflake Horizon and Snowflake Polaris catalogs." The January 12, 2026 AWS blog post on Unity says "Catalog federation supports read operations," and neither doc page describes writes.

The AWS row has two limits that matter in production. Glue rejects federated tables whose metadata exceeds 5 MB per REST API call. And the Snowflake page says nested namespaces in a Polaris catalog are not supported, so only three-part `catalog.database.table` names federate. Tables with deeper nesting stay invisible. For Unity, federation reads Iceberg metadata, so Delta tables need UniForm turned on, and the Unity guide says queries against tables outside Amazon S3 fail with "Object storage location is not supported."

Google is not in the AWS row as a target. The Lake Formation guide names no Google page, and I found no AWS doc that does. Glue accepts Iceberg REST catalogs in general, so the cell says "not documented" rather than "no." Whether that generic path works is something you test.

## Cell Notes: Databricks, Snowflake, Oracle and Polaris

**Databricks Unity Catalog.** The [catalog federation overview](https://docs.databricks.com/aws/en/query-federation/catalog-federation), updated November 5, 2026, lists its targets with an access level for each. External Hive metastores, AWS Glue, Snowflake, Salesforce Data 360, Palantir Foundry and Workday Data Connect are all read-only. Only internal Hive metastores "allow reads and writes." The Google Cloud Lakehouse target has its own page, updated November 3, 2026, which says "Foreign tables in a Google Cloud Lakehouse catalog are read-only" and requires Databricks Runtime 18 LTS or above.

Two Databricks pages pull against the overview, and I recorded both. The Snowflake page asks for the `MODIFY` permission on federated Iceberg tables and talks about "read/write consistency between writes to the external catalog," without saying Databricks itself writes. The Glue page describes a Data Editor preset with "read and modify privileges." I kept both cells at Read because the overview states the access level directly.

**Snowflake.** Snowflake's row is the only one with documented writes into named remote catalogs. The [catalog-linked database page](https://docs.snowflake.com/en/user-guide/tables-iceberg-catalog-linked-database) says Snowflake can create schemas and externally managed Iceberg tables in the remote catalog. The [write support page](https://docs.snowflake.com/user-guide/tables-iceberg-externally-managed-writes) names Glue, Unity Catalog and Open Catalog. The [Unity tutorial](https://docs.snowflake.com/en/user-guide/tutorials/tables-iceberg-set-up-bidirectional-access-to-unity-catalog) says a catalog-linked database "is writable" by default and that tables created from Snowflake appear in both systems.

The write path has documented holes. `CREATE ICEBERG TABLE ... AS SELECT` is not supported against Unity or Glue, so you create an empty table and run `INSERT INTO ... SELECT`, which is not atomic. Equality delete files are not supported. Glue does not honor the purge flag, so dropping a table through Snowflake leaves the files in storage. Remote access control for users and roles is not synced. Google Cloud Lakehouse is listed as a catalog source on the [REST integration page](https://docs.snowflake.com/user-guide/tables-iceberg-configure-catalog-integration-rest), but the write page does not mention it, so that cell is Read.

**Oracle.** Oracle's cells come from the [Query Apache Iceberg Tables page](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/query-external-data-apache-iceberg.html), which carries a creation date of November 17, 2026. It certifies Unity Catalog "for UniForm only" and says "Native Iceberg tables through Databricks Unity Catalog Iceberg REST are not supported." It certifies Snowflake Polaris, supports Horizon with the same steps, supports Glue in the same region as the S3 data, and says Google Lakehouse runtime catalog access "is read-only."

This is where the doc and the announcements diverge. An [Oracle blog post from June 18, 2026](https://blogs.oracle.com/autonomous-ai-database/mount-databricks-unity-catalog) mounts Unity with `DBMS_CATALOG.MOUNT_ICEBERG` and says the endpoint covers managed Iceberg tables as well as UniForm tables. An [October 28, 2026 post](https://blogs.oracle.com/autonomous-ai-database/optimize-iceberg-tables-ai-lakehouse) shows AI Lakehouse writing an Iceberg table and committing it through a catalog, and says "Writing support varies by catalog, storage, authentication, and release." The doc page is newer and more specific, so the cells follow it.

**Apache Polaris 1.7.0.** Polaris, released August 2, 2026 per the [download page](https://polaris.apache.org/downloads/1.7.0/), federates through an `EXTERNAL` catalog type. The [Iceberg REST federation page](https://polaris.apache.org/releases/1.7.0/federation/iceberg-rest-federation/) says it "exposes whatever table/namespace operations the remote service implements," and unsupported features return the remote error directly. That is why the cell says Pass-through. The page names another Polaris deployment, AWS Glue and custom REST services as example remotes. It does not name Unity Catalog or Horizon.

Federation is off by default and needs `ENABLE_CATALOG_FEDERATION`. Hive Metastore and BigQuery Metastore federation are optional extensions that ship only when you build Polaris with the `NonRESTCatalogs` Gradle property set to include them. Both allow only `IMPLICIT` authentication, which means one identity per deployment. The BigQuery page says committing table metadata needs read/write access to the warehouse bucket, so commits pass through.

## The Write-Path Gap

Read the grid again and count the write cells. Snowflake has three. Polaris passes writes through. Everyone else reads.

A read through a federated catalog is a lookup. The consuming platform asks the remote catalog where the current metadata file lives, gets back a location and maybe a short-lived storage credential, and reads files. A stale pointer means a slightly older snapshot. Nothing breaks.

A write is a commit. The writer produces new data files and a new metadata file, then asks the owning catalog to swap the table pointer from the old metadata to the new one, but only if nobody else moved it first. That conditional swap is the whole point of an Iceberg catalog. A platform that holds a cached copy of the pointer, as Google's federated catalogs do on a refresh schedule, cannot do the swap locally. It has to send the commit to the owner and handle a rejection when another writer won. That requires write credentials on the remote storage, a write grant in the remote catalog, and agreement on who runs table maintenance afterward.

Snowflake's documented write cells show what that agreement costs. The Unity tutorial requires `CREATE TABLE`, `MODIFY` and `EXTERNAL USE SCHEMA` for the Databricks service principal, plus `MANAGE` to drop tables. The limits list covers non-atomic CTAS, no equality deletes and Glue's purge behavior.

The [Bidirectional Iceberg Writes with Horizon Catalog](https://datalakehousehub.com/blog/snowflake-horizon-catalog-bidirectional-iceberg-writes/) post covers the reverse direction, external engines writing into Snowflake-managed tables through Horizon's REST endpoint. That is engine-to-catalog writing, not catalog-to-catalog federation, so it is not a cell here. It is still the cleaner design when you need writes: send the engine straight to the owning catalog instead of routing commits through a mount.

My rule of thumb from the grid: treat a federated mount as a read path. Plan writes so each table has one owning catalog and every writer talks to that owner directly. Where Snowflake documents more, read its limits page first.

## Identity and Credentials Across a Mount

The second thing a mount has to settle is whose identity reaches the remote catalog and who hands out storage credentials. The Iceberg REST spec gives a client a way to ask. The `X-Iceberg-Access-Delegation` header in the [REST catalog OpenAPI spec](https://github.com/apache/iceberg/blob/main/open-api/rest-catalog-open-api.yaml) lets a client signal support for `vended-credentials` or `remote-signing`, and the value `none` says the client needs neither.

Each row resolves this differently:

- **AWS Glue** offers two modes on the connection, set with `CREDENTIAL_VENDING_MODE`. `AWS_VENDED` (the default) has Lake Formation issue S3 credentials by assuming an IAM role you register. `SOURCE_VENDED` takes credentials from the remote catalog's `loadTable` response, so revoking access in Unity or Snowflake takes effect on the next table load.
- **Google** authenticates to each remote with a service principal, a service user or an IAM role, and reads data with credentials the remote platform vends. The overview page says user identity federation, where the end user's own identity reaches the remote catalog, is supported only for Databricks Unity Catalog.
- **Snowflake** prefers vended credentials and falls back to an external volume when the remote catalog does not vend. Remote role grants are not synced, so you govern access twice.
- **Polaris** stores the remote catalog's OAuth, bearer or SigV4 settings on the external catalog. Polaris 1.7.0 added an optional IAM `sessionPolicy` for SigV4 federation to narrow the vended AWS credentials.

Here is what a mount looks like on the two platforms with the most complete docs. First Snowflake mounting Unity Catalog, copied from Snowflake's [Unity catalog integration page](https://docs.snowflake.com/en/user-guide/tables-iceberg-configure-catalog-integration-rest-unity):

```sql
CREATE OR REPLACE CATALOG INTEGRATION unity_catalog_int_oauth_vended_credentials
CATALOG_SOURCE = ICEBERG_REST
TABLE_FORMAT = ICEBERG
REST_CONFIG = (
  CATALOG_URI = '<databricks_workspace_url>/api/2.1/unity-catalog/iceberg-rest'
  CATALOG_NAME = '<catalog_name>'
  ACCESS_DELEGATION_MODE = VENDED_CREDENTIALS
)
REST_AUTHENTICATION = (
  TYPE = OAUTH
  OAUTH_TOKEN_URI = '<databricks_workspace_url>/oidc/v1/token'
  OAUTH_CLIENT_ID = '<client_id>'
  OAUTH_CLIENT_SECRET = '<oauth_secret>'
  OAUTH_ALLOWED_SCOPES = ('all-apis')
)
ENABLED = TRUE;

CREATE OR REPLACE DATABASE my_linked_db
   LINKED_CATALOG = (
      CATALOG = 'unity_catalog_int_oauth_vended_credentials'
   );
```

The integration points `CATALOG_URI` at Unity's Iceberg REST endpoint, the same `/api/2.1/unity-catalog/iceberg-rest` path that AWS Glue's Databricks connector uses. `ACCESS_DELEGATION_MODE = VENDED_CREDENTIALS` asks Unity for storage credentials instead of using a Snowflake external volume. The OAuth block authenticates as a Databricks service principal. The `CREATE DATABASE ... LINKED_CATALOG` statement is the mount. Per Snowflake's docs it is writable by default, which is why this row reads differently from the others.

Now Google mounting the same catalog, from Google's [Unity Catalog setup page](https://docs.cloud.google.com/lakehouse/docs/set-up-cross-cloud-connection-databricks):

```bash
gcloud biglake iceberg catalogs create FEDERATED_CATALOG_NAME \
    --project="PROJECT_ID" \
    --primary-location="REGION" \
    --catalog-type="federated" \
    --federated-catalog-type="unity" \
    --unity-service-principal-application-id="UNITY_SERVICE_PRINCIPAL_APPLICATION_ID" \
    --unity-instance-name="UNITY_INSTANCE_NAME" \
    --unity-catalog-name="UNITY_CATALOG_NAME" \
    --refresh-interval="REFRESH_INTERVAL" \
    --namespace-filters="NAMESPACE_FILTERS" \
    --cross-cloud-cache="CROSS_CLOUD_CACHE_MODE" \
    --federated-catalog-identity-mode="IDENTITY_MODE"
```

The shape differs in ways that match the grid. `--catalog-type="federated"` makes a read-only view. `--refresh-interval` sets how stale the cached pointers get. `--namespace-filters` limits which schemas sync. `--federated-catalog-identity-mode` is where the Unity-only user identity option lives.

## Which Pattern Fits Which Org Shape

Four org shapes come up often, and each maps to a different part of the grid.

**One primary platform, analysts elsewhere.** Tables live in Unity Catalog, and a BigQuery or Oracle team needs to query them. This is the best-documented shape on the grid. Google, AWS, Snowflake and Oracle all mount Unity. Expect read-only access, and check Oracle's UniForm-only limit first.

**Two platforms that both write.** Snowflake and Databricks teams each produce tables the other consumes. The documented path is Snowflake's catalog-linked database writing into Unity, plus Databricks reading Snowflake through catalog federation. Decide which catalog owns each table, and write that down, because the grid has no symmetric read/write pair.

**Several clouds, one governance team.** Glue on AWS is the governance anchor, and Unity and Snowflake hold other domains. Glue federation with Lake Formation gives you one place to grant row and column filters over remote tables. It is read-only, and the [Iceberg Across the Hyperscalers](https://iceberglakehouse.com/posts/iceberg-across-the-hyperscalers/) piece explains why the catalog choice, more than storage, is what locks you in.

**An open catalog at the center.** You run Apache Polaris and want every platform to mount it. The grid says that is the least documented shape. Snowflake, AWS and Oracle name Polaris-style catalogs, and Google and Databricks do not. Polaris itself can federate outward to REST catalogs, Hive and BigQuery Metastore. The [Open Catalog Architecture](https://datalakehousehub.com/blog/open-catalog-architecture-agentic-lakehouse/) post covers how to lay out namespaces and access when a catalog serves both people and agents.

## Changelog and Revision Policy

This matrix is a dated record, and it gets revised when vendors ship. A cell changes when a vendor doc page changes, not when a press release does.

- **2026-11-23, first edition.** Seven rows, five catalog columns. Triggered by the November 4, 2026 announcements from Google and Oracle. Notable open items: Oracle's docs and blogs disagree on native Iceberg tables through Unity. Databricks pages disagree on write privileges for Glue and Snowflake. Google's July launch post described bi-directional access that the current docs do not.

The next review is due when any of these land: a Google doc page that adds writes to federated catalogs, an Oracle doc update that removes the UniForm-only limit, a Databricks or Google page that names Polaris, or a new Polaris release that changes federation.

## Conclusion

Catalog federation in November 2026 is a read story with one documented write exception. Every major platform can now mount Unity Catalog, and Google, AWS and Databricks mount each other's catalogs in most directions. Almost all of it is read-only, the requirements differ by pairing, and the dates on the docs are weeks old. Use the grid to scope what you promise, use the cell notes to find the limits, and verify the doc page again before you build.

## Keep Going

If this piece was useful, I have written a lot more on lakehouse catalogs and how engines share Iceberg tables. _Apache Polaris: The Definitive Guide_ covers the open catalog, its REST interface, credential vending and federation in depth. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [Techzine: Google Agentic Data Cloud gets cross-cloud lakehouse (2026-11-04)](https://www.techzine.eu/news/analytics/145556/google-agentic-data-cloud-gets-cross-cloud-lakehouse/)
- [SiliconANGLE: Semantic layer turns lakehouses into AI decision backbones (2026-11-04)](https://siliconangle.com/2026/11/04/semantic-layer-turns-lakehouses-ai-decision-backbones-oracleaiworld/)
- [Google: Set up cross-cloud Lakehouse](https://docs.cloud.google.com/biglake/docs/set-up-cross-cloud-lakehouse)
- [Google: Cross-cloud connection for Databricks Unity Catalog](https://docs.cloud.google.com/lakehouse/docs/set-up-cross-cloud-connection-databricks)
- [Google: Cross-cloud connection for Snowflake Horizon Catalog](https://docs.cloud.google.com/lakehouse/docs/set-up-cross-cloud-connection-snowflake)
- [Google: Cross-cloud Lakehouse for AWS Glue](https://docs.cloud.google.com/lakehouse/docs/set-up-cross-cloud-lakehouse-aws-glue)
- [Google: Lakehouse release notes](https://docs.cloud.google.com/lakehouse/docs/release-notes)
- [Google Cloud blog: Introducing the borderless Lakehouse (2026-07-29)](https://cloud.google.com/blog/products/data-analytics/introducing-the-borderless-lakehouse)
- [Google Cloud blog: Cross-cloud conversational analytics (2026-10-13)](https://cloud.google.com/blog/products/data-analytics/cross-cloud-conversational-analytics-with-borderless-lakehouse)
- [AWS: Catalog federation to remote Iceberg catalogs](https://docs.aws.amazon.com/lake-formation/latest/dg/catalog-federation.md)
- [AWS: Federate to Snowflake Iceberg Catalog](https://docs.aws.amazon.com/lake-formation/latest/dg/catalog-federation-snowflake.md)
- [AWS: Federate to Databricks Unity Catalog](https://docs.aws.amazon.com/lake-formation/latest/dg/catalog-federation-databricks.md)
- [AWS What's New: Glue catalog federation (2025-11-24)](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-glue-catalog-federation-remote-apache-iceberg-catalogs)
- [AWS blog: Introducing catalog federation in the Glue Data Catalog (2025-11-26)](https://aws.amazon.com/blogs/big-data/introducing-catalog-federation-for-apache-iceberg-tables-in-the-aws-glue-data-catalog)
- [AWS blog: Access Unity Catalog data via Glue federation (2026-01-12)](https://aws.amazon.com/blogs/big-data/access-databricks-unity-catalog-data-using-catalog-federation-in-the-aws-glue-data-catalog)
- [AWS blog: Access Snowflake Horizon data via Glue federation (2026-01-14)](https://aws.amazon.com/blogs/big-data/access-snowflake-horizon-catalog-data-using-catalog-federation-in-the-aws-glue-data-catalog)
- [Databricks: Catalog federation](https://docs.databricks.com/aws/en/query-federation/catalog-federation)
- [Databricks: Snowflake catalog federation](https://docs.databricks.com/aws/en/query-federation/snowflake-catalog-federation)
- [Databricks: Hive metastore federation for AWS Glue](https://docs.databricks.com/aws/en/query-federation/hms-federation-glue)
- [Databricks: Google Cloud Lakehouse catalog federation](https://docs.databricks.com/gcp/en/query-federation/google-cloud-lakehouse)
- [Snowflake: Catalog-linked databases](https://docs.snowflake.com/en/user-guide/tables-iceberg-catalog-linked-database)
- [Snowflake: Catalog integration for Iceberg REST catalogs](https://docs.snowflake.com/user-guide/tables-iceberg-configure-catalog-integration-rest)
- [Snowflake: Catalog integration for Unity Catalog](https://docs.snowflake.com/en/user-guide/tables-iceberg-configure-catalog-integration-rest-unity)
- [Snowflake: CREATE CATALOG INTEGRATION (Iceberg REST)](https://docs.snowflake.com/en/sql-reference/sql/create-catalog-integration-rest)
- [Snowflake: Write support for externally managed Iceberg tables](https://docs.snowflake.com/user-guide/tables-iceberg-externally-managed-writes)
- [Snowflake: Bidirectional access to Unity Catalog tutorial](https://docs.snowflake.com/en/user-guide/tutorials/tables-iceberg-set-up-bidirectional-access-to-unity-catalog)
- [Snowflake Open Catalog overview](https://docs.snowflake.com/en/user-guide/opencatalog/overview)
- [Snowflake Open Catalog release notes](https://docs.snowflake.com/en/user-guide/opencatalog/release-notes)
- [Oracle: Query Apache Iceberg Tables](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/query-external-data-apache-iceberg.html)
- [Oracle: Manage Catalogs](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/manage-catalogs.html)
- [Oracle release note: Iceberg REST catalog support (2025-10-07)](https://docs.oracle.com/iaas/releasenotes/autonomous-database-serverless/2025-10-broader-and-enhanced-iceberg-rest-catalog-support.htm)
- [Oracle blog: Mount Databricks Unity Catalog (2026-06-18)](https://blogs.oracle.com/autonomous-ai-database/mount-databricks-unity-catalog)
- [Oracle blog: Catalog federation and Oracle SQL intelligence (2026-10-28)](https://blogs.oracle.com/autonomous-ai-database/optimize-iceberg-tables-ai-lakehouse)
- [Apache Polaris 1.7.0: Iceberg REST Federation](https://polaris.apache.org/releases/1.7.0/federation/iceberg-rest-federation/)
- [Apache Polaris 1.7.0: Hive Metastore Federation](https://polaris.apache.org/releases/1.7.0/federation/hive-metastore-federation/)
- [Apache Polaris 1.7.0: BigQuery Metastore Federation](https://polaris.apache.org/releases/1.7.0/federation/bigquery-metastore-federation/)
- [Apache Polaris 1.7.0 download page](https://polaris.apache.org/downloads/1.7.0/)
- [Apache Iceberg REST catalog OpenAPI spec](https://github.com/apache/iceberg/blob/main/open-api/rest-catalog-open-api.yaml)
