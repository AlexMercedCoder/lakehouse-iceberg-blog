---
title: "Who Can Read Through an Iceberg View? Chain-Aware Authorization in Apache Polaris"
description: "How the Iceberg REST referenced-by parameter carries a view chain to the catalog, and how a Polaris proposal validates it and lets views run as a bound role."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Apache Polaris"
tags:
  - Apache Polaris
  - Apache Iceberg
  - views
  - authorization
  - access control
slug: "iceberg-view-authorization-polaris-chain-aware"
draft: false
canonicalURL: https://datalakehousehub.com/blog/iceberg-view-authorization-polaris-chain-aware/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/iceberg-view-authorization-polaris-chain-aware/).

When a query reads a table through an Iceberg view, the catalog must decide whose permissions apply. The REST spec has an optional `referenced-by` parameter that carries the view chain, but Apache Polaris accepts it and ignores it. A November 4, 2026 proposal sets out to validate that chain and to let a view run as a bound catalog role.

Here is the problem in its plainest form. A finance team owns a table called `payroll.salaries`. They build a view called `payroll.dept_totals` that sums salaries by department and hides every individual row. They want the analytics team to query the view. They do not want the analytics team to read the raw table.

In a classic database, this is a one-line grant. The view runs with its owner's rights, and the analyst never touches the base table. In an Apache Iceberg lakehouse with a REST catalog, the story is different. The query engine reads the view definition, expands the SQL, and then asks the catalog to load `payroll.salaries`. The catalog sees a bare table load from an analyst. It has no idea a view was involved. So it does the only safe thing. It checks the analyst's own grants on the table and refuses.

The finance team now has two bad options. Grant read access on the raw table, which defeats the view, or materialize the aggregate into a second table and keep it in sync. This article covers whose permissions apply at read time. For what a view is and how its metadata is versioned, see the [Iceberg Views KB](https://iceberglakehouse.com/iceberg/iceberg-views/).

## Definer Rights and Invoker Rights, and Why a Lakehouse Needs Both

Every SQL system with views decides which identity gets checked against the objects underneath a view. There are two classic answers.

**Invoker rights** mean the view is a saved query and nothing more. The person running the query needs access to every table and view the definition touches. The view gives the query a stable name and a shared definition, but it grants nothing.

**Definer rights** mean the view carries the authority of whoever defined it, or of an identity the administrator attached to it. The reader needs permission on the view. The objects underneath are checked against the definer. This is the model that makes the payroll example work. The analyst gets `dept_totals`, the definer holds access to `salaries`, and the raw rows never leave the boundary the finance team drew. PostgreSQL works this way by default: access to the tables under a view is checked against the view owner, and PostgreSQL 15 added a `security_invoker` view option to switch to the other model.

A lakehouse needs both models because views do two different jobs.

The first job is sharing logic. Every consumer already has access to the underlying data, and the view should not widen anyone's access by accident. Invoker rights fit.

The second job is sharing a restricted slice of data, such as an aggregate or a masked projection. The reader sees less than the table holds. Definer rights are the only clean way to do that without copying data. The [Iceberg Data Masking](https://iceberglakehouse.com/iceberg/iceberg-data-masking/) page explains why the view layer is a natural place for masking logic. That approach only holds up if the reader cannot bypass the view and read the table directly.

Nesting makes this harder. If a definer view reads from an invoker view, which identity checks the table at the bottom? During review of the Iceberg spec change that introduced `referenced-by`, Russell Spitzer raised exactly this case, a definer view wrapping an invoker view, and asked how other systems handle it. Ryan Blue answered that the catalog decides how references are interpreted. That answer shapes everything that follows. The Iceberg spec carries the chain. It does not say which views are definer views or how to evaluate them.

Lakehouses add one wrinkle databases never had. In a database, the engine and the catalog are one process. In a lakehouse, they are separate services connected by a REST protocol. The catalog holds the grants. The engine holds the query plan. Definer rights require the catalog to know something only the engine knows.

## What the Catalog Sees When an Engine Expands a View

Walk through a read of `payroll.dept_totals` from an engine like Spark or Trino against an Iceberg REST catalog (IRC). The sequence is simple, and every step is a separate HTTP call.

1. The engine calls `loadView` for `payroll.dept_totals`. The catalog returns the view metadata, which includes the SQL text and the schema.
2. The engine parses that SQL and finds a reference to `payroll.salaries`.
3. The engine calls `loadTable` for `payroll.salaries`. The catalog returns table metadata and, when the engine asks for it, short-lived storage credentials.
4. The engine plans the scan and reads Parquet files from object storage with those credentials.

Step 3 is where authorization bites. The catalog has no record that step 1 happened. To the catalog, an analyst asking for `salaries` through a view and an analyst asking for `salaries` directly look identical.

That matters more in a lakehouse than in a database, because of credential vending. In Apache Polaris, the privilege that lets a principal read table data is `TABLE_READ_DATA`. The Polaris access control docs describe it as enabling a principal to read data "by receiving short-lived read-only storage credentials from the catalog." The engine then reads files directly from the bucket, outside the catalog's view. So the decision at `loadTable` time is the decision. Credentials for `salaries` mean access to every raw row.

Polaris uses a role-based access control (RBAC) model. Privileges such as `TABLE_READ_DATA` and `VIEW_READ_PROPERTIES` are granted to catalog roles. Catalog roles are granted to principal roles. Principal roles are granted to principals. The [Polaris RBAC Model KB](https://iceberglakehouse.com/iceberg/polaris-rbac-model/) walks through that hierarchy. What matters here is a gap. There is no `VIEW_READ_DATA` privilege in the current Polaris docs. View privileges cover creating, dropping, listing and reading or writing view properties. Reading a view's metadata is one permission. Reading the data underneath is a separate permission on each table.

So today, in stock Polaris, every Iceberg view behaves as an invoker view at the catalog boundary. That is the safe default. It never leaks data. It also means the payroll example has no clean answer.

Views also travel between engines through multiple SQL dialect representations, a story the [2026 Guide to Iceberg View Federation](https://datalakehousehub.com/blog/iceberg-view-federation-portable-sql-2026/) covers. Portability meets authorization in one place. A definer view only works if every engine that reads it sends the same context to the catalog. A view that is portable in SQL but not portable in its security behavior is a trap.

## The `referenced-by` Parameter in the Iceberg REST Spec

The Iceberg community closed the context gap at the protocol level. Apache Iceberg PR #13810, authored by Prashant Singh, started life as a proposal to add a "loaded-via" hint to `loadTable` and ended up as the `referenced-by` query parameter. The PR description states the motivation directly: let the client tell the catalog that a load happens in the context of a view, so the catalog can support definer and invoker security modes.

During review, the parameter grew beyond `loadTable`. Nested views reference other views, so `loadView` needed it too. Long-running jobs request fresh storage credentials in the same view context, so `loadCredentials` needed it as well.

In the current `rest-catalog-open-api.yaml` on the Iceberg main branch, `referenced-by` is a shared parameter definition. Three operations reference it:

| Operation         | Path                                                                 | What the chain tells the catalog                     |
| ----------------- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| `loadTable`       | `GET /v1/{prefix}/namespaces/{namespace}/tables/{table}`             | This table is being read through these views         |
| `loadView`        | `GET /v1/{prefix}/namespaces/{namespace}/views/{view}`               | This view is being expanded inside these outer views |
| `loadCredentials` | `GET /v1/{prefix}/namespaces/{namespace}/tables/{table}/credentials` | These credentials are for a read through these views |

The parameter is an optional query string value. It is a comma-separated list of fully qualified view names. The list is ordered with the outermost view first, then any intermediate views, down to the view that directly references the entity being loaded. A single view reading a table produces a list of one.

Each entry joins the namespace and the view name with the namespace separator. That separator is advertised by the server through the `namespace-separator` key in the `/config` response and defaults to the unit separator byte `0x1F`, URL-encoded as `%1F`. When parsing, the server treats the last occurrence of the separator as the boundary between namespace and view name. View names that contain commas must encode them as `%2C`.

Here is the spec's own nested example turned into a full request. A view `quarterly_view` in the namespace `prod.analytics` reads from `monthly_view`, which reads from a table. The engine, while loading that table, sends:

```http
GET /v1/{prefix}/namespaces/prod%1Fanalytics/tables/orders?referenced-by=prod%1Fanalytics%1Fquarterly_view,prod%1Fanalytics%1Fmonthly_view
Authorization: Bearer <analyst token>
X-Iceberg-Access-Delegation: vended-credentials
```

Walk through each piece.

- `prod%1Fanalytics` in the path is the namespace `prod.analytics`, encoded with the default separator, exactly as in any table load.
- `referenced-by` carries two entries. The first, `prod%1Fanalytics%1Fquarterly_view`, is the outermost view the user actually queried. The second, `prod%1Fanalytics%1Fmonthly_view`, is the view whose SQL names `orders` directly.
- The bearer token still belongs to the analyst. `referenced-by` does not change who is calling. It adds a claim about why they are calling.
- The shipped `X-Iceberg-Access-Delegation` header asks the catalog to vend storage credentials, so the authorization decision and the credential decision happen on the same request.

The table name `orders` is my illustration. The `referenced-by` value is verbatim from the spec.

The Iceberg Java client has the plumbing on the main branch. `RESTUtil.encodeReferencedBy` builds the value from a list of view identifiers, using the separator the server advertised. It returns nothing for an empty chain, so a direct table read sends no parameter at all. `RESTSessionCatalog` passes the encoded chain into the table, view and credentials calls through a `LoadContext` object.

Notice what the parameter does not carry. There is no catalog name in any entry. There is no flag saying whether a view is definer or invoker. There is no signature proving the engine really expanded those views. Each of those gaps shows up later in this article.

## The Trust Problem: Any Client Can Claim a Chain

The obvious objection came up in the review of PR #13810, and it is the right one to start with. `referenced-by` is a claim made by the client. The catalog cannot verify it. An analyst with a Python script and a bearer token can send `referenced-by=payroll%1Fdept_totals` on a `loadTable` call for `payroll.salaries` without ever running the view. If the catalog grants definer access on the strength of that string alone, the analyst walks away with credentials for the raw salary files.

A reviewer on the PR raised exactly this spoofing risk. The response from the spec side was that the specification does not define authorization at all, and it does not define a "trusted engine" either. Catalogs decide how to use the parameter. Sung Yun suggested documenting trust as a concept without prescribing how a catalog establishes it, using RFC 2119 requirement keywords so that a server uses the chain for authorization only when the caller is a trusted engine under the catalog's own policy.

That leaves a clear division of labor.

- **The engine** is responsible for sending an honest chain. A shared, multi-tenant query engine that enforces its own access checks is the kind of client that earns trust. A notebook running arbitrary user code is not, because the user controls the HTTP client.
- **The catalog** is responsible for deciding which callers it believes. That is a policy decision, made per deployment, and it lives in the catalog's authorization layer.
- **The spec** is responsible for the wire format and nothing else.

In the Polaris discussion, Yufei Gu made the same point from the operator's side. Whether a client can be trusted to provide a view chain should be controlled by the system administrator, and he did not see a need to enforce it in the Polaris service provider interface (SPI) or API. Laurent Goujon, who wrote the Polaris proposal, agreed with the framing. (Laurent posted from a Dremio address. I work at Dremio too, so count that as my disclosure.) The proposal leaves it to whoever grants client access to define which clients are trustworthy and how the authorizer checks that. Prashant Singh added that a trusted engine is required for this to work end to end.

This is the most important point before planning any definer-view rollout. Without a trust model, `referenced-by` is an audit hint. With one, it becomes an authorization input. A spoofed chain under invoker semantics changes nothing. Only definer semantics turn the chain into a grant, so only definer semantics need trusted callers.

## Part 1 of the Polaris Proposal: Parse, Validate, Forward

On November 4, 2026, Laurent Goujon opened a discussion on the Polaris dev list titled "Chain-aware authorization for views (Iceberg referenced-by)." He filed the full design as Polaris issue #5979 and opened draft PR #5980 for the first half. His opening email states the current state plainly: Polaris accepts the `referenced-by` parameter but drops it, so no authorizer can act on it.

The proposal has two parts. Part 1 is a change to the authorizer SPI, the extension point that lets Polaris run its built-in RBAC, Open Policy Agent (OPA), or Apache Ranger as the decision maker. Part 2 is a reference implementation for the built-in authorizer. Only Part 1 is in the draft PR.

Part 1 does four things.

**It exposes the chain to authorizers.** A new accessor, `SingleTargetAuthorizationIntent#referencedBy()`, hands the parsed chain to whichever authorizer is configured. Polaris parses the raw query string and splits it into individual view identifiers. It does not interpret them.

**It validates the chain.** A chain that cannot be parsed is rejected with HTTP 400. A chain deeper than a configurable limit, 10 entries by default, is rejected with 400. A chain that repeats an entry is rejected with 400, which catches cycles.

**It adds the chain to load events.** Polaris emits events when tables and views are loaded. With the change, those events carry the chain, so audit and lineage consumers see that a table was read through a view even when no authorizer acts on it.

**It changes no decision.** The built-in authorizer, the OPA integration and the Ranger integration all keep their current behavior. The chain arrives at the authorizer, and every shipped authorizer ignores it. Laurent was explicit that the PR does not change any access decision.

That last point is why Part 1 drew quick support. Jean-Baptiste Onofré (JB) gave a +1 and suggested focusing there first. Yufei Gu supported it and preferred to keep the SPI generic. On November 12, Laurent asked if the PR was ready to leave draft. Yufei gave a +1 the next day, and Prashant followed on November 16. Nothing is merged as of this writing. Treat every name in this section as proposed.

### Who resolves the chain

Yufei asked whether Polaris should resolve the chain or leave that to authorizers. Laurent's answer: Polaris handles parsing, splitting and basic validation. The authorizer does the evaluation, because authorizers interpret the chain differently. Ignoring it is one valid interpretation.

JB pushed on the consequence. The spec identifiers have no catalog part. So Polaris maps each entry to a securable in the target catalog. An entry can be missing there. Worse, it can match an unrelated view with the same name if the engine included a view from another catalog. JB asked for the `referencedBy()` javadoc to say clearly that entries are names asserted by the client, interpreted in the target catalog and not resolved by Polaris. An authorizer that needs to confirm an entry exists, or that it really is a view, has to resolve it itself. For custom authorizer authors, the chain is a list of strings, not verified entities.

### A visible behavior change

JB also flagged a user-facing effect. Polaris ignores the parameter today, even when a client sends it. After Part 1, a malformed chain, a repeated entry or a chain longer than ten entries returns a 400, even when the authorizer ignores the chain. He was comfortable with strict validation but pointed out that users will see it.

Laurent proposed a configuration flag to turn chain handling off. JB suggested making it overridable at the catalog level, like other Polaris feature flags, so an operator can disable it for one catalog. When disabled, Polaris behaves exactly as today: no parsing, no validation, no chain in events, and an empty `referencedBy()`. JB's preference was to ship it enabled by default with strict validation, as long as the change appears in the changelog and documentation. The flag's final name was not settled in the thread, so I am not going to invent one here.

### OPA as the first consumer

JB proposed OPA as the first real consumer of the chain. The idea is to add the chain to the OPA input document, alongside the existing targets and secondaries in the resource section. That is additive, with no new privilege and no persistence change, and it tests the SPI against a real use case before anyone touches the built-in RBAC model.

## Part 2: Binding a View to a Catalog Role with `CATALOG_ROLE_EXECUTE_AS`

Part 2 shows what a policy using the chain looks like. Laurent included it as a proof of concept for the SPI. It is not in the PR, and the thread leaned toward settling Part 1 first.

The design has two new privileges in the built-in authorizer.

**`CATALOG_ROLE_EXECUTE_AS` binds a view to a catalog role.** An administrator grants it with the view as the grantee. The effect is that reads through that view evaluate as the bound catalog role rather than as the caller. In the payroll example, the finance administrator creates a catalog role called something like `payroll_aggregator`, grants it `TABLE_READ_DATA` on `payroll.salaries`, and binds `payroll.dept_totals` to that role.

**A new catalog privilege marks callers allowed to assert a chain.** This is the trust model made concrete. A governed engine's service principal gets it. An analyst's personal principal does not. The email thread does not name this privilege, so I will not guess.

With both in place, the built-in authorizer evaluates the chain and switches to the bound role at each bound view. Since the chain is ordered outermost first, my reading is that the walk starts at the view the user queried and moves toward the target. Views with no binding leave the current context alone. The target table is then checked against the context the walk produced.

Run the payroll read through that logic.

1. A governed query engine, calling as a principal that holds the chain-assertion privilege, loads `payroll.dept_totals` for the analyst.
2. The engine calls `loadTable` for `payroll.salaries` with `referenced-by=payroll%1Fdept_totals`.
3. The authorizer sees a trusted caller and a chain of one. `dept_totals` is bound to `payroll_aggregator`. The authorizer switches context.
4. `payroll_aggregator` holds `TABLE_READ_DATA` on `salaries`. The load succeeds and Polaris vends credentials.

Now the same analyst runs a Python script that sends the same chain directly. In this design the chain counts only for callers that hold the assertion privilege, and the analyst's principal lacks it. So the authorizer evaluates the analyst's own grants. The analyst has no `TABLE_READ_DATA` on `salaries`, so the load is denied.

For contrast, here is how you set up the parts that exist today with the shipped Polaris CLI. These commands grant the analyst's catalog role permission to see the view, and grant a separate role read access on the base table:

```bash
# Shipped Polaris CLI syntax. The analyst role can load the view's metadata.
polaris privileges \
  view \
  grant \
  --catalog finance_catalog \
  --catalog-role analyst_role \
  --namespace payroll \
  --view dept_totals \
  VIEW_READ_PROPERTIES

# A separate role holds data access on the base table.
polaris privileges \
  table \
  grant \
  --catalog finance_catalog \
  --catalog-role payroll_aggregator \
  --namespace payroll \
  --table salaries \
  TABLE_READ_DATA
```

The first command lets members of `analyst_role` read the view's metadata. The second gives `payroll_aggregator` the right to receive read credentials for `salaries`. Both privileges are shipped and documented. What is missing is the link saying "reads through `dept_totals` run as `payroll_aggregator`." That link is what `CATALOG_ROLE_EXECUTE_AS` proposes. Until it, or an equivalent policy in OPA, lands, the analyst's read of `salaries` is checked against `analyst_role`, and it fails.

### Open questions on Part 2

Prashant raised two questions that any implementation has to answer.

The first is how a view becomes a definer view. Part 2 requires an explicit binding. Prashant asked whether an implicit ownership model like PostgreSQL's fits better, while noting that not every platform treats ownership as a privilege. Laurent's position is that the Iceberg spec deliberately does not mark views as invoker or definer, and Polaris should leave that choice to authorizers, because there are as many models as providers. Prashant confirmed the open-ended design in the IRC spec was intentional.

The second is audit. When a load is evaluated against a bound role, Prashant asked whether the authorizer should also return an effective principal. Without one, audit records for credential vending show an identity that differs from the role that made the decision.

Neither question has an answer yet. Watch the issue before designing around Part 2.

## Related Polaris Work: `listAccessibleCatalogs`

A second authorization thread ran on the Polaris dev list a week earlier. On October 28, 2026, Dennis Huo proposed a way for a data-plane client to list the catalogs it can access. Today you need the catalog name before you can configure an Iceberg REST client, and Polaris' existing `listCatalogs` is a management API that requires a root-level `CATALOG_LIST` privilege and returns the full catalog model, storage configuration included.

The proposal adds an operation named `listAccessibleCatalogs` for readers with no management permissions. After review, the path moved to `/polaris/discovery/v1/catalogs` to avoid overlapping with existing routes. The response is an array of objects, `{"catalogs": [{"name": "..."}]}`, so properties can be added later without a breaking change. Pagination follows existing Polaris list conventions. Dmitri Bourlatchkov approved draft PR #5891 on October 31.

The authorization rule is what ties it to this article. At JB's request, the wording says the list includes exactly the catalogs for which the caller is authorized to call `getConfig`. Listing never leaks the existence of a catalog the caller cannot use. Same principle as the view chain work: the catalog makes the decision based on who is asking.

## What Engines Have to Send, and What Operators Should Do Now

None of the server-side work matters until engines send the chain. Prashant wrote on November 5 that he had just merged his final PR to make the Iceberg Spark connector send `referenced-by` (apache/iceberg #13979), and that he had worked with the Trino community for about six months on trinodb/trino #31542. He added that, as far as he knew, no existing client was sending the parameter to Polaris yet. Clients still have to be released.

Engines also own the cross-catalog case. Because entries carry no catalog name, the catalog sees only its own views. Laurent's example: view A, view B and table X live in catalog 1, view C lives in catalog 2, and view B is a definer view. Nothing in `referenced-by` tells catalog 2 that the security context changed at view B. The agreed safe default is to evaluate view C as the original user. JB put it well: the worst case is an access denied, not a data leak. Prashant said the Spark implementation fails closed. JB described the Trino PR as sending only same-catalog Iceberg views and failing the load by default when a foreign definer view sits mid-chain. Prashant also noted that Spark runs cycle detection before sending the chain.

If you run Polaris today, here is a practical checklist.

1. **Assume invoker semantics.** Grant `TABLE_READ_DATA` on base tables to every role that reads through a view. Do not design restricted-slice views as a security boundary yet.
2. **Separate engine principals from human principals.** Every trust model in the discussion depends on telling a governed engine apart from an arbitrary client.
3. **Test clients against the new 400s.** Once Part 1 merges, malformed, repeated or over-deep chains get rejected. Know where the per-catalog switch lives before you upgrade.
4. **Keep chains within one catalog.** Cross-catalog definer chains are a documented limitation of `referenced-by`.
5. **Watch issue #5979 and PR #5980.** Names and defaults in this article are proposed, not shipped.

## Conclusion

Iceberg views have always been portable in their SQL. They have not been portable in their security behavior, because the catalog never knew a view was involved in a read. The `referenced-by` parameter fixes the information gap on `loadTable`, `loadView` and `loadCredentials`. It does not decide anything by itself, and it cannot prove its own honesty.

The Polaris proposal splits the work cleanly. Part 1 makes Polaris parse, validate and forward the chain without changing a single decision, and it has broad support. Part 2 sketches a definer model built on `CATALOG_ROLE_EXECUTE_AS` and a trusted-caller privilege, and it remains a discussion. With Spark and Trino support arriving, the question of whose permissions apply when someone reads through a view is finally getting a real answer.

## Keep Going

If this piece was useful, I have written a lot more on catalogs and access control for the lakehouse. _Apache Polaris: The Definitive Guide_ covers Polaris' RBAC model, catalog roles and credential vending in depth. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [Polaris dev list: Chain-aware authorization for views (Iceberg referenced-by)](https://lists.apache.org/thread/psl1qvvvyt9j2ovgz7zw5t8ky75rjp6q)
- [Polaris dev list: Catalog discovery for data-plane clients](https://lists.apache.org/thread/5w2dk760omggpzpz9pwylhb1wtlqf9rv)
- [apache/iceberg PR #13810: referenced-by parameter](https://github.com/apache/iceberg/pull/13810)
- [Iceberg REST catalog OpenAPI spec (main)](https://github.com/apache/iceberg/blob/main/open-api/rest-catalog-open-api.yaml)
- [Iceberg RESTUtil.java (main)](https://github.com/apache/iceberg/blob/main/core/src/main/java/org/apache/iceberg/rest/RESTUtil.java)
- [Iceberg RESTSessionCatalog.java (main)](https://github.com/apache/iceberg/blob/main/core/src/main/java/org/apache/iceberg/rest/RESTSessionCatalog.java)
- [Apache Polaris docs: Access Control](https://polaris.apache.org/in-dev/unreleased/managing-security/access-control/)
- [Apache Polaris docs: Command Line Interface](https://polaris.apache.org/in-dev/unreleased/command-line-interface/)
