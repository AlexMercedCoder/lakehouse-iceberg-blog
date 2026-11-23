---
title: "Managing Iceberg Catalogs as Code with the Apache Iceberg Terraform Provider"
description: "Declare Iceberg namespaces and tables in Terraform with the Apache Iceberg provider v0.2.0: REST config, OAuth2, SigV4, schema evolution and iceberg_tables."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Data Engineering"
tags:
  - Apache Iceberg
  - Terraform
  - infrastructure as code
  - REST catalog
  - catalog management
slug: "iceberg-terraform-provider-catalogs-as-code"
draft: false
canonicalURL: https://datalakehousehub.com/blog/iceberg-terraform-provider-catalogs-as-code/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/iceberg-terraform-provider-catalogs-as-code/).

The Apache Iceberg Terraform Provider lets teams declare Iceberg catalog objects in Terraform and review changes as pull requests. Version 0.2.0, announced November 4, 2026, adds an `iceberg_tables` data source, SigV4 request signing, OAuth2 improvements and better schema-evolution handling. This guide shows a namespace-and-table workflow against a REST catalog.

Here is the problem this solves. A platform team runs a REST catalog with forty namespaces. Some were created by a Spark notebook, some by a dbt run, and a few by an engineer who typed `CREATE NAMESPACE` into a SQL editor during an incident. Nobody can say which table properties are intentional, and the reasons live in old chat threads, if anywhere.

Cloud infrastructure went through the same mess. The fix was to describe the desired state in files, check those files into Git, and let a tool compute the difference between the files and reality. If you want a refresher on how that model works, the [Terraform glossary entry on DataLakehouseHub](https://datalakehousehub.com/knowledgebase/terraform/) covers state, plans and providers in a few minutes of reading. The Iceberg provider applies that model to the catalog itself. Namespaces and tables become resources. A schema change becomes a diff a reviewer reads before it touches production metadata.

Every resource name, attribute and provider argument below comes from the provider's own docs and examples at the v0.2.0 tag, plus the install snippet added to the README after the release.

## What v0.2.0 Ships and What the Provider Manages

The announcement email lists the headline features but not the full resource list, so start with the release itself. Matt Topol posted the `[ANNOUNCE]` message to the Iceberg dev list on November 4, 2026. The GitHub release and the Terraform Registry entry for `apache/iceberg` version 0.2.0 are both dated October 29, 2026. The provider is also listed on the OpenTofu Registry, and the README describes it as a provider for both Terraform and OpenTofu.

The release went through two candidates. RC0 drew a non-binding -1 over out-of-date LICENSE and NOTICE files, which led to a CI check for the license inventory. RC1 passed with four binding +1 votes (Kevin Liu, Russell Spitzer, Sung Yun and Matt Topol), one non-binding +1 from Alex Stephen, and no -1 votes. This is an Apache release with signed source artifacts, and the registry binaries are convenience builds made from that source.

At the v0.2.0 tag, the README and docs list two resources and three data sources:

| Kind        | Name                | What it does                                                                 |
| ----------- | ------------------- | ---------------------------------------------------------------------------- |
| Resource    | `iceberg_namespace` | Manages a namespace and its properties                                       |
| Resource    | `iceberg_table`     | Manages a table, including schema, partition spec, sort order and properties |
| Data source | `iceberg_namespace` | Reads an existing namespace's properties                                     |
| Data source | `iceberg_table`     | Reads an existing table's schema, partition spec, sort order and properties  |
| Data source | `iceberg_tables`    | Lists table names in one namespace (new in 0.2.0)                            |

There are no resources for views, principals, roles, grants or catalogs. Keep that list in mind, because it decides where Terraform ends in your workflow.

The GitHub release notes group the 0.2.0 changes into a few buckets. New features are AWS SigV4 request signing (#118), OAuth2 client credentials authentication (#127) and the `iceberg_tables` data source (#71). Table handling gained complete optimistic-concurrency requirements on commits (#134), a fix so every partition source ID is kept on read (#145), and enforcement of reserved field IDs (#124). The documentation for provider configuration and examples was completed in #106. The rest is build, CI and dependency work, including a move to Go 1.27.3 and a switch from MinIO to RustFS for the local test stack.

A few changes landed on `main` after the tag and are not part of 0.2.0. Those include a `profile` option for SigV4 (#168), a stricter check that rejects field ID reuse (#135), and smarter reuse of existing schema IDs (#144). If you read the docs on the default branch, you will see some of these. Pin your provider version and read the docs for the version you run.

## Configuring the Provider Against a REST Catalog

The provider talks to Iceberg REST catalogs only. If you need a refresher on the protocol it speaks, including the `/v1/config` handshake and how commits work, read the [Iceberg REST Catalog Spec guide](https://iceberglakehouse.com/apache-iceberg-rest-catalog/). Everything below rides on top of that spec.

Start with the `terraform` block. The README on `main` documents the source address as `apache/iceberg`. I add a version pin, which is standard Terraform practice, so a registry update never changes behavior under a running pipeline.

```hcl
terraform {
  required_providers {
    iceberg = {
      source  = "apache/iceberg"
      version = "0.2.0"
    }
  }
}

provider "iceberg" {
  catalog_uri = "https://catalog.example.com"
  warehouse   = "analytics"
}
```

The provider block takes five top-level arguments in 0.2.0. Only one is required.

- `catalog_uri` (required) is the base address of the REST catalog deployment. Do not append `/v1`. The underlying Iceberg Go client adds the API version path itself and calls `/v1/config` first. If the catalog lives under a base path, include it, as in `https://catalog.example.com/iceberg`.
- `type` defaults to `rest`. Any other value returns an unsupported catalog type error, so you normally leave it out.
- `warehouse` is passed to the catalog as the `warehouse` property during configuration. Its format is whatever your catalog server expects.
- `token` is a static bearer token. It is marked sensitive.
- `headers` is a map of extra HTTP headers, also sensitive, for catalogs that authenticate with an API key or need routing headers.

There is no `prefix` argument. The REST config response can return a server-chosen prefix, and the Go client applies it automatically. Put the deployment URI in `catalog_uri` and let the server handle the prefix.

### Picking an authentication mode

Version 0.2.0 offers four ways to authenticate, and the choice depends on what sits in front of your catalog.

| Mode                      | Arguments     | Fits                                                                       |
| ------------------------- | ------------- | -------------------------------------------------------------------------- |
| Static bearer token       | `token`       | Short-lived tokens issued by another system, local development             |
| Custom headers            | `headers`     | API-key catalogs, gateways that need extra headers                         |
| OAuth2 client credentials | `auth.oauth2` | Catalogs with a token endpoint, such as the REST spec's `/v1/oauth/tokens` |
| AWS SigV4                 | `auth.sigv4`  | AWS Glue's Iceberg REST endpoint and catalogs behind a SigV4 gateway       |

The static token pattern from the docs keeps the secret out of `.tf` files by declaring a sensitive variable and setting `TF_VAR_iceberg_token` in the environment:

```hcl
variable "iceberg_token" {
  type      = string
  sensitive = true
}

provider "iceberg" {
  catalog_uri = "https://catalog.example.com"
  token       = var.iceberg_token
}
```

Static tokens expire, which makes them a poor fit for a CI pipeline that runs for months. The OAuth2 client credentials flow in 0.2.0 fixes that. The provider fetches a token from the token endpoint and refreshes it on its own.

```hcl
provider "iceberg" {
  catalog_uri = "https://catalog.example.com"

  auth = {
    oauth2 = {
      credential = "${var.client_id}:${var.client_secret}"
      scope      = "PRINCIPAL_ROLE:ALL"
    }
  }
}
```

The `credential` value is formatted as `client_id:client_secret`. A value with no colon is treated as a client secret with an empty client ID. The nested block also accepts `scope` (default `catalog`), `audience`, `resource` and `server_uri`. The token endpoint defaults to `{catalog_uri}/v1/oauth/tokens`, so set `server_uri` when your identity provider issues tokens somewhere else. The `PRINCIPAL_ROLE:ALL` scope in the docs example is the scope format Apache Polaris uses, which makes this block a direct fit for a Polaris deployment.

Two rules prevent confusing failures. `auth.oauth2` cannot be combined with `token` or `auth.sigv4`. And when `auth.oauth2` is set, any `Authorization` entry in `headers` is not sent, while the other headers also go to the token endpoint.

### SigV4 for AWS-signed catalogs

The SigV4 block signs every request with AWS Signature Version 4. The docs example targets the AWS Glue Iceberg REST endpoint:

```hcl
provider "iceberg" {
  catalog_uri = "https://glue.us-east-1.amazonaws.com/iceberg"
  warehouse   = "123456789012"

  auth = {
    sigv4 = {
      region       = "us-east-1"
      signing_name = "glue"
    }
  }
}
```

The `signing_name` defaults to `execute-api`, which suits API Gateway fronted catalogs. Glue needs `glue`. The region comes from `region` or, when that is absent, from the AWS environment such as `AWS_REGION`. The provider errors out when neither supplies one. Credentials come from `access_key_id`, `secret_access_key` and the optional `session_token` when you set them, and from the standard AWS credential chain otherwise. In a CI runner with an attached role, leave the keys out.

One detail helps teams running a SigV4 gateway in front of a catalog that does its own OAuth. If `token` or an `Authorization` header is also set, SigV4 keeps signing and forwards that value as `Original-Authorization`, which matches the Java client. Headers from `headers` are set before signing, so they are covered by the signature.

## Declaring Namespaces and Tables

With the provider configured, the core workflow fits in one file. This example extends the provider's own `examples/main.tf` with a nested type from the `iceberg_table` resource example and a field doc string.

```hcl
resource "iceberg_namespace" "analytics" {
  name = ["analytics"]

  user_properties = {
    owner = "data-platform"
  }
}

resource "iceberg_table" "events" {
  namespace = iceberg_namespace.analytics.name
  name      = "events"

  schema = {
    fields = [
      {
        name     = "event_id"
        type     = "long"
        required = true
      },
      {
        name     = "event_type"
        type     = "string"
        required = true
        doc      = "Producer-defined event category"
      },
      {
        name     = "event_time"
        type     = "timestamp"
        required = true
      },
      {
        name = "tags"
        type = "list"
        list_properties = {
          element_type     = "string"
          element_required = true
        }
        required = false
      }
    ]
  }

  user_properties = {
    "write.format.default" = "parquet"
  }
}
```

Read it from the top. A namespace `name` is a list of identifier segments, not a dotted string. A catalog that supports nesting takes a value like `["analytics", "production"]`. The table takes its `namespace` as the same kind of list and its `name` as a plain string. Pointing `namespace` at `iceberg_namespace.analytics.name` puts an edge in the Terraform graph, so the namespace exists before the table and outlives it on destroy.

The `schema` block holds an ordered list of `fields`. Each field needs `name`, `type` and `required`. Primitive types are strings such as `long`, `string`, `timestamp` or `decimal(10,2)`. Complex types use a companion block. A `list` field takes `list_properties` with `element_type` and `element_required`. A `map` field takes `map_properties` with `key_type`, `value_type` and `value_required`. A `struct` field takes `struct_properties` with its own nested `fields` list. The optional `doc` attribute carries column documentation into the Iceberg schema, where engines and catalogs can surface it.

Field IDs are optional. When you omit `id`, the provider assigns one. Nested elements have their own optional IDs too: `element_id` for lists and `key_id` and `value_id` for maps. In 0.2.0 the provider rejects any declared ID outside the range Iceberg allows, since the spec reserves the highest IDs for metadata columns.

Tables also accept optional `partition_spec` and `sort_order` blocks. A partition field declares `name`, `transform` and `source_ids`, a list of source field IDs, plus an optional `field_id`. A sort field declares `source_id`, `transform`, `direction` (`asc` or `desc`) and `null_order` (`nulls-first` or `nulls-last`). Both blocks reference columns by ID, not by name. That is a strong argument for writing explicit `id` values on any column you partition or sort by, so the reference in HCL never depends on auto-assignment order.

### Properties: user versus server

Both resources split properties into two maps. `user_properties` is what you declare. `server_properties` is read-only and holds everything the catalog returns, including values the server set on its own, such as defaults it injects at creation.

The two resources treat removal a little differently, and it is easy to miss. The namespace docs state that only properties listed in Terraform get changed, and every other property on the server stays the same. For tables, the v0.2.0 update code sets any key you add or change and removes keys that were in Terraform's previous state but are gone from your configuration. Keys that Terraform never managed are left alone in both cases. In practice, deleting a line from `user_properties` on a table removes that property from the table on the next apply. That is the behavior you want, but call it out in code review so nobody deletes a line expecting a no-op.

### Bringing existing objects under management

Most catalogs already have tables. Both resources support import with a dot-separated identifier:

```shell
terraform import iceberg_namespace a.b.c
terraform import iceberg_table a.b.table_name
```

For a table, the last segment is the table name and the rest is the namespace. Write the matching resource block first, run the import, then run `terraform plan`. A clean plan means your HCL matches the catalog. A noisy plan tells you exactly which columns, IDs or properties you transcribed wrong. The `iceberg_table` data source, covered later, gives you the current schema to copy from.

## Schema Evolution Through Plan and Apply

Schema changes are where a catalog-as-code workflow earns its keep, and where it can hurt you. The provider maps your edited `schema` block to Iceberg schema evolution, and the rules come straight from how Iceberg tracks columns.

Iceberg identifies a column by its field ID, not its name. The provider follows that. It matches each planned field to an existing column by `id` when one is set, and by name otherwise. That leads to the single most important rule in the docs. Renaming a column without keeping its `id` reads as dropping the old column and adding a new one, and the old column's data is gone from the table's current schema.

To rename safely, pin the existing ID:

```hcl
schema = {
  fields = [
    {
      id       = 1        # keep the id of the column being renamed
      name     = "user_id"
      type     = "long"
      required = true
    }
  ]
}
```

Get the current ID from the `iceberg_table` data source or from `terraform state show` before you write the rename. Then read the plan. If it shows the old field disappearing and a new one appearing with a different ID, stop.

### What the provider accepts

Adding a column is always allowed. Deleting a column is allowed too, which is why reviewers need to read schema diffs line by line. Reordering fields is fine because matching happens by ID or name, not position. Making a required column optional is allowed. Widening a primitive type is allowed when Iceberg defines the promotion, such as `int` to `long`, `float` to `double`, or raising a decimal's precision while keeping its scale.

### What the provider refuses

Before it commits, the 0.2.0 provider validates every field that exists in both the current and the planned schema. The apply fails with an `invalid schema evolution` error in these cases:

- **Optional to required.** Existing rows contain nulls, so Iceberg forbids tightening a column. The error says changing a field from optional to required is not an allowed schema evolution.
- **Invalid type promotion.** Changing `string` to `long`, or `long` back to `int`, fails because Iceberg defines no such promotion.
- **Container kind changes.** Turning a `struct` into a `list` or a `map` into a `struct` fails. Nested fields carry their own IDs and get checked on their own.

Separately, the provider rejects field IDs outside the permitted range with an `invalid field id` error. These checks run during apply, not during plan, so a plan shows the change and the apply refuses it. Put a disposable apply against a test catalog in your pipeline if you want the error before merge.

### What gets committed

When the schema changes, the provider sends two updates in one REST commit. It adds a new schema with an ID one higher than the largest existing schema ID, then sets that schema as current. Property, partition and sort changes ride in the same commit.

The 0.2.0 release also made commits carry the full set of optimistic-concurrency requirements (#134). The table UUID is always asserted. Adding a schema asserts the last assigned field ID, setting the current schema asserts the current schema ID, and partition and sort changes assert their own last-assigned and default IDs. In REST terms, a schema change produces a request shaped like this (values illustrative, field names from the REST spec):

```json
{
  "requirements": [
    {
      "type": "assert-table-uuid",
      "uuid": "9c12d441-03fe-4693-9a96-a0705ddf69c1"
    },
    { "type": "assert-last-assigned-field-id", "last-assigned-field-id": 4 },
    { "type": "assert-current-schema-id", "current-schema-id": 0 }
  ],
  "updates": [
    {
      "action": "add-schema",
      "schema": { "type": "struct", "schema-id": 1, "fields": [] }
    },
    { "action": "set-current-schema", "schema-id": 1 }
  ]
}
```

Those assertions are the safety net for a shared catalog. If a Spark job added a column between your plan and your apply, the last-assigned field ID no longer matches, the catalog rejects the commit, and nothing half-applies. You rerun the plan, see the new column as drift, and decide what to do with it.

## Reading Existing Catalogs with the iceberg_tables Data Source

Not every table belongs in your Terraform configuration. Ingestion jobs create tables on the fly, and another team's workspace owns its own namespaces. The three data sources let a configuration read that state without claiming ownership of it.

The new `iceberg_tables` data source lists the tables in one namespace. It returns two sorted lists. `tables` holds short names such as `events` and `orders`. `identifiers` holds dot-separated full identifiers such as `analytics.raw.events`, which match the `id` format of the `iceberg_table` resource. Listing is non-recursive, so tables in child namespaces do not appear.

```hcl
data "iceberg_tables" "raw" {
  namespace = ["analytics", "raw"]
}

output "table_identifiers" {
  value = data.iceberg_tables.raw.identifiers
}
```

The docs show the main use case: feed the list into `for_each` on some downstream resource, one instance per table. That pattern fits anything keyed by table, such as a monitoring check. When a new table lands in the namespace, the next plan shows one new downstream instance, and a reviewer sees it.

There is one ordering trap, and the docs spell it out. If the same configuration creates tables and then lists them, referencing only the namespace creates an implicit dependency on the namespace resource, not on the tables. The data source can read before the tables exist and return an incomplete list. Add an explicit `depends_on` that names each `iceberg_table` resource.

The single-object data sources fill in the rest. `iceberg_namespace` takes a `name` and returns `id` and `server_properties`. `iceberg_table` takes `namespace` and `name` and returns the current `schema`, `partition_spec`, `sort_order` and `server_properties`. The docs example reads a column name with `data.iceberg_table.events.schema.fields[0].name`. Missing objects fail the run with a `Namespace not found` or `Table not found` error, and a listing failure partway through pagination surfaces as `failed to list tables` with the catalog's message. That guard is useful: a pipeline that assumes `analytics.raw` exists finds out at plan time.

## Failure Modes and Warning Signs

A declarative tool does exactly what the files say. These cases are ranked by damage.

**Renaming a table or moving it to another namespace in HCL.** In 0.2.0, both `namespace` and `name` on `iceberg_table` force replacement. Change either and Terraform plans a destroy followed by a create. Destroy calls the catalog's drop table operation. What happens to data files after that depends on the catalog's drop behavior, but the table you had is gone and the new one starts empty. The `name` on `iceberg_namespace` forces replacement too. The warning sign is the `-/+` marker and the phrase "forces replacement" in the plan. Treat any plan that replaces an `iceberg_table` as a blocking review item, and consider a `lifecycle { prevent_destroy = true }` block on production tables.

**Renaming a column without its ID.** The plan looks like a rename to a casual reader, but it is a drop plus an add. The fix is the explicit `id` pattern above. The warning sign is a field whose `id` changes in the plan output.

**Engines changing the table behind Terraform's back.** Spark, Flink and other engines can evolve a schema or a partition spec directly. On the next plan, Terraform sees the live table diverge from HCL and proposes to put it back. For a column an engine added, that means a proposed drop. Read every plan on a shared catalog for columns you did not write. Decide per table who owns the schema. If ingestion owns it, read the table through the data source instead of managing it as a resource.

**Leaving `partition_spec` or `sort_order` undeclared on an engine-partitioned table.** Both attributes are optional and computed. In the v0.2.0 update code, when the planned value for either one is unknown during an update, the provider commits an unpartitioned spec or an unsorted order. If engines manage partitioning on a table, declare the spec in HCL so an unrelated property change does not reset it, and read the plan for those attributes.

**Secrets in state.** The provider marks `token`, `headers` and the OAuth2 and SigV4 credentials as sensitive, which hides them in plan output. The docs warn that sensitive values can still end up in Terraform state. Store state in an encrypted backend with tight access, the same as any state file that holds database passwords.

**Duplicate credentials.** Setting the same `Authorization` header through both `token` and `headers` sends two credentials. The docs say to pick one mechanism. With OAuth2 the provider drops the header for you, but static tokens do not get that protection.

**Apply-time errors after a green plan.** Schema evolution checks run in the update step. A pull request can show a clean plan and still fail on merge with `invalid schema evolution`. Running apply against a disposable catalog in CI catches this before merge.

## Running It in a Pipeline

Each catalog environment gets its own root module and its own state. A pull request runs `terraform plan` against that environment with read-only catalog credentials, and the plan output goes into the PR as a comment. A merge runs `terraform apply` with write credentials, using OAuth2 client credentials or a SigV4 role so nothing expires mid-quarter.

For the pre-merge apply test, the repository ships a local stack in `dev/docker-compose.yml`. It runs the `apache/iceberg-rest-fixture:1.10.1` image on port 8181, backed by a RustFS object store. Point a test workspace at `http://localhost:8181`, which is also the `catalog_uri` in the provider's own examples, apply your change, and tear it down. This catches invalid schema evolution and bad field IDs before a reviewer approves. It does not prove behavior against your production catalog.

A few habits keep the repository healthy as it grows:

- **Split by ownership, not by size.** One module per domain team, each owning its namespaces. The `iceberg_namespace` data source lets one module reference another team's namespace without managing it.
- **Write explicit field IDs on new tables.** Auto-assignment works, but explicit IDs make renames, partition specs and sort orders readable in review.
- **Document columns in HCL.** The `doc` attribute turns the Terraform file into the place where column meaning gets reviewed.
- **Import before you manage.** For existing tables, import first and get to a clean plan before you change anything.
- **Pin the provider.** Changes on `main` after 0.2.0 already alter field ID handling. Upgrade deliberately and read the plan on the first run after an upgrade.

Drift detection works the same way as in any Terraform setup. A scheduled `terraform plan` with `-detailed-exitcode` returns a distinct exit code when the live catalog differs from the files, and your scheduler can alert on it.

## Where Terraform Ends and Catalog RBAC Tooling Begins

The provider manages namespaces and tables. It has no resources for principals, principal roles, catalog roles or privilege grants in 0.2.0. Access control still needs a home, and it is a different problem with a different tool.

The [Governance-as-Code for the Lakehouse](https://iceberglakehouse.com/posts/governance-as-code-lakehouse-rest-catalog/) guide covers that side. It uses Terraform for cloud IAM, declares catalog principals, roles and grants in YAML applied through the Polaris CLI, and handles masking and row filters as SQL and policy code. That pipeline answers "who can read this table." This provider answers "what tables exist and what do they look like."

The two fit together without overlap. Namespaces and tables come from the Terraform provider. Grants on those namespaces come from the RBAC pipeline, which runs after the objects exist. Keep the namespace names in one shared variable file or naming convention, so both repositories refer to the same objects. If the two drift apart, the RBAC apply fails on a namespace that does not exist, which is the failure you want.

Until the provider documents more object types, do not reach for workarounds such as generic HTTP providers calling management endpoints. The REST spec covers namespaces, tables and views, but catalog management APIs differ by server, and a hand-rolled resource has none of the commit safety described above.

## Conclusion

The Apache Iceberg Terraform Provider turns namespaces and tables into reviewed code. Version 0.2.0 makes it practical for production: OAuth2 client credentials and SigV4 handle long-running pipelines and AWS catalogs, the `iceberg_tables` data source lets configurations read what other systems create, and complete optimistic-concurrency requirements keep commits safe on a shared catalog.

The mental model to keep is simple. Iceberg tracks columns by ID, so your HCL should too. The provider refuses schema changes Iceberg forbids, but it happily drops a column or replaces a table if the files say so, which means the plan is the review artifact that matters. Pair this provider with a separate RBAC pipeline for grants, pin the version, and read every plan.

## Keep Going

If this piece was useful, I have written a lot more on Apache Iceberg catalogs and table management. _Apache Iceberg: The Definitive Guide_ covers schema evolution, partitioning and catalog behavior in depth, and _Apache Polaris: The Definitive Guide_ covers the REST catalog and access-control side. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [[ANNOUNCE] Apache Iceberg Terraform Provider v0.2.0 released, dev@iceberg.apache.org](https://lists.apache.org/thread/t53xb61k1gg3qmf5rc4zbmfc3g2zfqvs)
- [[RESULT][VOTE] Release Apache Iceberg Terraform Provider v0.2.0 RC1, dev@iceberg.apache.org](https://lists.apache.org/thread/zfc96ktz5vhxn1gymv9lohlzj3prq9jm)
- [apache/terraform-provider-iceberg on GitHub (README, docs/, examples/)](https://github.com/apache/terraform-provider-iceberg)
- [v0.2.0 release notes](https://github.com/apache/terraform-provider-iceberg/releases/tag/v0.2.0)
- [Terraform Registry: apache/iceberg 0.2.0](https://registry.terraform.io/providers/apache/iceberg/0.2.0)
- [Governance-as-Code for the Lakehouse](https://iceberglakehouse.com/posts/governance-as-code-lakehouse-rest-catalog/)
- [Terraform, DataLakehouseHub knowledge base](https://datalakehousehub.com/knowledgebase/terraform/)
