---
title: "Turning Off Credential Vending with the X-Iceberg-Access-Delegation none Value"
description: "Iceberg's REST spec now accepts none in X-Iceberg-Access-Delegation. See what it signals, how catalogs react, and when engines should use their own credentials."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Apache Iceberg"
tags:
  - Apache Iceberg
  - REST catalog
  - credential vending
  - access delegation
  - security
slug: "iceberg-access-delegation-none-credential-vending-opt-out"
draft: false
canonicalURL: https://datalakehousehub.com/blog/iceberg-access-delegation-none-credential-vending-opt-out/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/iceberg-access-delegation-none-credential-vending-opt-out/).

The `X-Iceberg-Access-Delegation` header tells an Iceberg REST catalog which storage access mechanism a client wants, such as vended credentials or remote signing. A vote that closed October 28, 2026 added a `none` value, which means the client can work without any delegation and will use its own storage credentials.

Here is the problem that value solves. You run Spark on Kubernetes, and every executor pod already has a cloud identity bound to it through workload identity. The pods can read the bucket on their own. Then someone copies a quickstart config into the job, and that config includes `header.X-Iceberg-Access-Delegation=vended-credentials`. Now the catalog mints a short-lived, downscoped token on every table load, hands it to the engine, and the engine uses that token instead of the identity your platform team set up for it. Nothing is broken. You are just running two access paths, and only one of them is the one you audit.

The reverse case hurts more. A Python job uses PyIceberg, which sends `vended-credentials` by default, against a catalog that sits on an on-premises object store with no token service. The catalog cannot vend and the client asked for vending. In Apache Polaris, that request fails at table load with an HTTP 400 error.

Until this fall, a client had no explicit way to say "I do not need anything from you for storage." Its only option was to omit the header and hope the server read silence the right way. This article covers the header that negotiates vending and the cases where an engine should decline it.

If you want the background on how vending itself works, read the [REST Catalog Credential Vending knowledge base entry](https://iceberglakehouse.com/iceberg/rest-catalog-credential-vending/) first. This piece assumes you know what a vended credential is and focuses on when to say no to one.

## The Header and the Values It Started With

The Iceberg REST catalog specification is an OpenAPI document that defines how engines talk to a catalog over HTTP. It lives in the Iceberg repository as `open-api/rest-catalog-open-api.yaml`. If you need a map of the endpoints themselves, the [Iceberg REST Catalog API Endpoints](https://iceberglakehouse.com/iceberg/iceberg-rest-catalog-api/) page walks through them. The part that matters here is one reusable header parameter called `data-access`, which the spec names `X-Iceberg-Access-Delegation` on the wire.

The spec attaches that header to five operations. They are `createTable`, `registerTable`, `loadTable`, and the two server-side scan planning calls (submitting a plan and fetching a plan's results). Those are the moments when a client is about to touch files in object storage.

The header value is a comma-separated list. Before this fall the spec allowed two entries:

- `vended-credentials` asks the catalog to return short-lived storage credentials scoped to the table. The catalog places them in the `storage-credentials` field of the `LoadTableResult` response, or in older servers, in the `config` map under keys such as `s3.access-key-id`, `s3.secret-access-key` and `s3.session-token`.
- `remote-signing` asks the catalog to sign each storage request on the client's behalf. The client never holds a storage key at all. It sends the request it wants to make to a signer endpoint, and the response carries a signed request. The spec communicates signer settings through the `remote-signing-config` field.

A client sends both values when it can handle either. The example value in the spec is literally `vended-credentials,remote-signing`.

Notice what this design leaves out. A client can say which delegation styles it understands. It cannot say that it understands none of them because it already has storage access through some other route. The only way to express that was to omit the header entirely. That omission is ambiguous. A missing header can mean "I have my own credentials," and it can also mean "I am an older client that predates this header." Catalog implementers had to pick one reading, and they did not all pick the same one.

Engine defaults made the ambiguity worse, because engines disagree about what to send when the user configures nothing. The Iceberg Java client builds its HTTP headers from any catalog property that starts with `header.` and adds no delegation value of its own. Trino documents `iceberg.rest-catalog.vended-credentials-enabled` as defaulting to `false`, and only adds the header when you turn it on. PyIceberg goes the other way. Its REST catalog sets `X-Iceberg-Access-Delegation: vended-credentials` on every session unless you override it. So the same catalog, with the same table, sees a header from one engine and silence from another, and both engines think they are doing the normal thing.

## What the `none` Value Adds to the Spec

The change started as a question, not a feature request. On September 23, 2026, Youngrae Kim opened a thread on the Iceberg dev list titled "[DISCUSS] REST spec: expected server behavior when X-Iceberg-Access-Delegation cannot be satisfied." The Polaris project had hit a concrete case. A client asks for `vended-credentials` against an S3-compatible store with no Security Token Service (STS), and the server has no way to mint a token. Should the server return the table with no credentials, or reject the request?

Alex Dutra suggested a stricter rule that requires an error when no requested mechanism is available. Daniel Weeks pushed back on making the header a negotiation at all, arguing that the catalog should be the authority on access. Alex Dutra then pointed out the real gap: the header has no way to say "I can work with my own credentials." He proposed a new constant called `local`. Daniel Weeks preferred `none`, on the reasoning that the value should express what the client does not need from the catalog rather than describe what the client plans to do. With `none`, he wrote, the catalog can at least skip generating credentials. Yufei Gu and Dmitri Bourlatchkov agreed.

Youngrae Kim opened [Iceberg PR #18480](https://github.com/apache/iceberg/pull/18480) on October 13 with exactly that scope. It adds `none` to the enum and one sentence defining it. A proposed second sentence, saying explicitly that a server can fail a request it cannot satisfy, was dropped from this PR after Daniel Weeks noted that a server can always reject a request. Youngrae offered to raise that wording separately.

The vote ran for three days, and the result was posted October 28. It passed with seven +1 votes and no 0 or -1 votes. The binding votes came from Yufei Gu, Sung Yun and Eduard Tudenhöfner. The non-binding votes came from Christian Thiel, Alex Dutra, Dmitri Bourlatchkov and Manish Malhotra.

Here is the parameter as it reads today on the main branch of the spec. This is the shipped text, copied from the OpenAPI file:

```yaml
data-access:
  name: X-Iceberg-Access-Delegation
  in: header
  description: >
    Optional signal to the server that the client supports delegated access
    via a comma-separated list of access mechanisms.  The server may choose
    to supply access via any or none of the requested mechanisms.


    The value `none` signals that the client is able to operate without any
    access delegation mechanism.


    Specific properties and handling for `vended-credentials` and `remote-signing`
    are documented in the `LoadTableResult` schema section of this spec document.

  required: false
  schema:
    type: array
    items:
      type: string
      enum:
        - vended-credentials
        - remote-signing
        - none
  style: simple
  explode: false
  example: "vended-credentials,remote-signing"
```

The wording is narrow on purpose. `required: false` means the header is still optional. Omitting it remains legal. The `style: simple` and `explode: false` pair is how OpenAPI describes a comma-separated array in one header, which is why `vended-credentials,remote-signing` is valid on the wire.

The new sentence says the client "is able to operate without" delegation. It does not tell the server what to do. It does not forbid the server from returning credentials anyway. It does not say how the server should treat `none` mixed with other values, such as `none,vended-credentials`. Those choices stay with each catalog.

The spec gained a clear client signal, and server behavior stays an implementation decision.

## What a Server Does When It Cannot Honor the Header

The original question in the September thread was about the awkward middle case. The client asks for one or more mechanisms. The catalog can provide none of them. The spec text says the server chooses to supply access "via any or none of the requested mechanisms," and the thread surfaced two very different readings of that phrase.

The first reading says the server returns HTTP 200 with the table metadata and no delegated access. The client then inspects the response. If `storage-credentials` is empty, `remote-signing-config` is absent and the `config` map holds no keys, the client knows it got nothing and either falls back to its own credentials or fails.

The second reading says the server rejects the request outright. Apache Polaris takes this path. When the inability is a fixed property of the catalog, such as an S3-compatible store with no STS, Polaris returns HTTP 400 with a message naming the reason. Youngrae Kim's argument for this choice was practical. A 200 with no credentials only moves the failure to the first data read, where the error comes from the storage SDK and says nothing about the catalog.

The community did not mandate either reading. Daniel Weeks described the Polaris behavior as "perfectly fine as an implementation choice" but argued against requiring catalogs to fail. He laid out two other legitimate server responses. The catalog can offer a different mechanism than the one requested (you asked for signing, it returns credentials), and the client errors out if it cannot use it. Or the catalog can return only the metadata, which signals that this client sees the table definition but has no access to the files.

Yufei Gu summarized the outcomes most participants accepted as reasonable:

1. The client requests mechanism A, and the server provides A.
2. The client requests A and B, and the server provides A, B or both.
3. The client sends `none`, and the server provides no delegated access.
4. The client requests A, the server cannot provide A, and the server fails the request.

Case 3 is the one the vote added.

Polaris shows what a real server does with `none` today, because its main branch already handles the value. Its `DefaultAccessDelegationModeResolver` class checks for `NONE` before anything else. If the client's header includes `none`, alone or alongside other values, the resolver returns an empty result and no credentials are vended. The source comment says the client "has said that it can operate without delegated access." In effect, Polaris treats `none` exactly like a request with no header at all, even when `none` appears next to `vended-credentials`.

A header of `none,vended-credentials` is contradictory, and the spec does not say who wins. Polaris lets `none` win. Another catalog can reasonably pick the other value, or reject the combination. Do not send mixed values and expect portable behavior.

Sending `none` still beats silence, because a request that carries `none` documents its intent. A request with no header reads identically whether it came from a carefully configured Spark job or from an old client library, and that distinction saves time when you read access logs during an incident.

One more rule of thumb comes out of the thread. Clients should treat the response, not the request, as the source of truth. Daniel Weeks pointed out that with `storage-credentials` and `remote-signing-config` now in the spec, the catalog states clearly what it is providing. A client that sends `none` and still receives credentials has to decide what to do with them, and the sensible default is to ignore them and use its configured identity.

## When a Client Should Decline Vended Credentials

Vending is a good default for many shops, and the [REST Catalog Credential Vending for Iceberg](https://iceberglakehouse.com/posts/rest-catalog-credential-vending-zero-copy-security/) article makes that case well. One catalog governs who sees which table, and engines never hold long-lived bucket keys. This section covers the other side. These are the situations where I tell teams to send `none` (or omit the header, where their client does not yet accept `none`) and let the engine bring its own credentials.

### The engine already has workload identity

Workload identity means the compute platform attaches a cloud identity to the running process, such as a Kubernetes service account mapped to a cloud role. The storage SDK inside the engine picks up those credentials automatically.

Dmitri Bourlatchkov described this case on the Polaris dev list on November 3. If the engine has ambient credentials, catalog vending is useless overhead. He went further and called it a possible security gap, because the catalog now exposes a second set of credentials to a client that is supposed to authenticate through a different channel. If your platform team built workload identity so that every storage call traces back to one audited identity, vended tokens quietly undo that.

Here `none` is the honest signal, and the catalog skips the token minting call.

### The object store has no token service

Credential vending depends on a token service in the storage layer. On AWS, that is STS. On Azure, the catalog generates Shared Access Signature (SAS) tokens. On Google Cloud Storage, it downscopes an OAuth token. Many S3-compatible stores that run on-premises, and most local emulators used in tests, have no equivalent.

In that setup the catalog literally has nothing to vend. Clients in this environment carry static keys or another local credential source, and they should say so. If a client sends `vended-credentials` here, Polaris rejects the load with HTTP 400. Sending `none` or no header gets a clean load and lets the engine use the keys it already has. Polaris already exposes a catalog setting for exactly this storage type, covered in the next section.

### Batch jobs with their own IAM boundary

Some pipelines run under a dedicated cloud role that grants write access to one bucket prefix. That role is the reviewed security boundary. Vended credentials add a second boundary computed by the catalog, and a permission error can then come from either side.

For these jobs I prefer one boundary. If the Identity and Access Management (IAM) role is the one your security team reviews, send `none` and let the job use it. If the catalog's grants are the reviewed boundary, keep vending and shrink the role. Pick one on purpose.

### Catalogs configured for user credentials

Some hosted catalogs expose a "user credentials" mode where the caller's own cloud identity reads storage and the catalog vends nothing. The PyIceberg configuration docs include an example for Google's BigLake Metastore Iceberg REST endpoint in that mode. Because PyIceberg sends `vended-credentials` by default, the docs tell you to override the header with an empty string, which makes PyIceberg fall back to Google Application Default Credentials (ADC). With `none` in the spec, servers and clients that adopt the value get a named, explicit way to express the same intent.

### When vending is still the right call

Do not send `none` reflexively. If your engines run in shared clusters where many users submit jobs, vending is the mechanism that keeps one user from reading another user's tables. The [cross-cloud credential vending guide for Apache Polaris](https://iceberglakehouse.com/posts/polaris-cross-cloud-credential-vending/) explains how one catalog mints the right token for S3, Azure and Google Cloud Storage, and in mixed-cloud setups that convenience is hard to replace with ambient identity. The question to ask is simple. Does this engine already hold storage access that someone reviewed? If yes, decline vending. If no, keep it.

## The Catalog Side: Polaris Storage Options That Skip Vending

The `none` value is a client signal. Catalog operators want a matching control on their side, because, in Dmitri Bourlatchkov's words on the Polaris list, servers "cannot assume that all clients are well-behaving." A client can still send `vended-credentials` against a catalog whose admins decided no tokens should leave it. Apache Polaris is working through that question right now.

Polaris already has one shipped switch. Its management API defines `stsUnavailable` on the AWS storage configuration. The management spec says that setting it to `true` "effectively disables vending storage credentials to clients" and that it is "intended for configuring catalogs with S3-compatible storage implementations that do not support STS." Polaris also has a feature flag in its server configuration, `SKIP_CREDENTIAL_SUBSCOPING_INDIRECTION`, but a separate dev-list proposal moved it toward test-only use, which left Azure and Google Cloud Storage catalogs without a typed, per-catalog way to turn vending off.

On October 23, 2026, Dmitri Bourlatchkov proposed two new management API properties to close that gap:

- `AzureStorageConfigInfo.skipSasTokenGeneration`
- `GcpStorageConfigInfo.skipCredentialDownscoping`

Each name follows the native mechanism on its platform. Setting either one disables credential vending for the catalog, the same way `stsUnavailable` does for S3. Vignesh contributed the implementation as [Polaris PR #5884](https://github.com/apache/polaris/pull/5884), which also adjusts `DefaultAccessDelegationModeResolver`. Dmitri wrote that after that PR, a client that requests `vended-credentials` from a catalog with `skipCredentialDownscoping` set gets a clear error saying vending is not available.

Ayush Saxena, Vignesh and Jean-Baptiste Onofré gave early +1s. Jean-Baptiste asked for an up-front, consistent error across all three clouds when a client asks only for vended credentials from an opted-out catalog, and for both properties to default to `false` so existing catalogs keep vending.

Then the thread turned into a design debate that is unresolved as of this writing. Yufei Gu first asked why a new setting is needed when clients with ambient credentials can simply omit the header. Dmitri answered with the misbehaving-client point above. The admin wants a guarantee that the server enforces, whatever the client sends.

Yufei accepted that need but disputed the location. Polaris is moving toward a separate storage configuration entity that several catalogs, namespaces or tables can share. If the vending switch lives on the storage configuration, then disabling vending for one namespace forces you to duplicate the storage configuration. Yufei's view is that storage configuration describes what the storage supports, while catalog, namespace or table settings decide whether to use that capability. Dmitri's view is that vending is part of how files are accessed, so it belongs with storage configuration. On November 4 he asked for more community opinions before deciding.

I am not going to predict the outcome. Two facts are safe to rely on today. First, `stsUnavailable` exists and works for S3-compatible storage. Second, the Azure and GCS properties named above are proposals tied to PR #5884. They do not appear in the management API spec on the Polaris main branch as of November 23, 2026. Do not write automation against them yet.

If you run Polaris and want the broader operational picture around storage configuration and deployment settings, [Running Apache Polaris in Production](https://iceberglakehouse.com/posts/apache-polaris-in-production/) covers that ground. The point for this article is narrower. Client opt-out and server opt-out are separate controls, and a secure deployment eventually wants both.

## Where Access Enforcement Moves When the Catalog Stops Vending

Turning off vending does not turn off access control. It moves it.

With vending on, the catalog sits on two paths. It authorizes the metadata request (can this principal load this table) and it shapes the storage credential (this token reads only this table's location). A principal with no grant on the table gets no metadata and no token. Two checks, one policy.

With vending off, the catalog still authorizes the metadata request. Loading a table still requires the right catalog privileges. The storage read, though, now runs on whatever identity the engine carries. The cloud IAM policy on the bucket becomes the only control on the files. If that policy grants the engine's role read access to the entire warehouse bucket, the engine can read any table's files once it knows the paths, whether or not the catalog ever authorized the load.

That gap is why Daniel Weeks called client-owned access "a bit of an anti-pattern" when the catalog also controls access. In his view, if the catalog delegates access, it should be the sole source of truth.

In practice, this gives you a short decision table:

| Setup                                 | Who enforces table-level file access   | What you must maintain                           |
| ------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| Vended credentials                    | The catalog, through downscoped tokens | Catalog grants. Broad catalog-side storage role. |
| Remote signing                        | The catalog, by signing each request   | Catalog grants. Signer availability.             |
| `none` with workload identity         | Cloud IAM on the engine's identity     | Bucket and prefix policies per engine role.      |
| `none` with static keys (on-premises) | The object store's own access policies | Key rotation and per-key bucket policies.        |

With `none`, the catalog decides who sees metadata and the storage layer decides who reads files. Keeping those aligned is now your job. If you grant a new analyst role on a table in the catalog, the storage side does not change on its own. If you revoke a grant in the catalog, the engine's IAM role still reads the files.

The REST spec main branch sharpens this. `LoadTableResult` now includes a `read-restrictions` field with row filters and column projections that the reader applies. That enforcement lives in the engine. An identity with broad bucket access can read the underlying Parquet files directly, outside any engine-side restriction, so confirm the storage identity cannot bypass the engine.

None of this makes `none` wrong. It makes it a decision with a cost. Workload identity with tightly scoped roles per engine is a solid design. Workload identity with one role that reads the whole lake, combined with `none`, means the catalog's table grants protect metadata only.

## Verifying the Behavior From a Client

Test the catalog directly first, then test each engine.

Start with a raw `loadTable` call. The path below is the spec's `/v1/{prefix}/namespaces/{namespace}/tables/{table}` route. The prefix comes from your catalog's `GET /v1/config` response (in Polaris it resolves to the catalog name), and `$TOKEN` is a bearer token for a principal that can read the table.

```bash
# Shipped REST spec route. Swap in your catalog URI, prefix, namespace and table.
BASE="$CATALOG_URI/v1/$PREFIX/namespaces/sales/tables/orders"

# 1. Ask for vended credentials
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "X-Iceberg-Access-Delegation: vended-credentials" \
     "$BASE" | jq '{creds: .["storage-credentials"], config_keys: (.config | keys)}'

# 2. Send the new none value
curl -s -H "Authorization: Bearer $TOKEN" \
     -H "X-Iceberg-Access-Delegation: none" \
     "$BASE" | jq '{creds: .["storage-credentials"], config_keys: (.config | keys)}'

# 3. Send no header at all, and capture the status code
curl -s -o /dev/null -w "%{http_code}\n" \
     -H "Authorization: Bearer $TOKEN" "$BASE"
```

The first call shows what vending looks like on your catalog. On a vending-capable catalog you see one or more entries in `storage-credentials`, each with a `prefix` and a `config` map, or credential keys such as `s3.session-token` in the top-level `config` map on older servers. If the catalog cannot vend, look for a 4xx status and an error message instead.

On a catalog that understands `none`, you see no `storage-credentials` entries and no credential keys in `config`, with a 200 status. If you get credentials back, the catalog ignored the value. If you get a 400, read the error message, because a catalog release that predates the value has no reason to accept it. Both are useful to know before you roll the change out to a fleet of jobs.

The third call shows how the catalog reads silence. Compare it to the second. On the Polaris main branch the two behave the same, because the resolver treats `none` and a missing header identically.

Next, set the header in each engine. In Spark with the Iceberg runtime, any catalog property prefixed with `header.` becomes an HTTP header, because the Iceberg Java client builds request headers from those properties.

```bash
spark-sql \
  --conf spark.sql.catalog.lake=org.apache.iceberg.spark.SparkCatalog \
  --conf spark.sql.catalog.lake.catalog-impl=org.apache.iceberg.rest.RESTCatalog \
  --conf spark.sql.catalog.lake.uri=$CATALOG_URI \
  --conf spark.sql.catalog.lake.warehouse=analytics \
  --conf spark.sql.catalog.lake.header.X-Iceberg-Access-Delegation=none
```

The last line is the only change from the Polaris quickstart, which sets the same property to `vended-credentials`. The engine still needs a working storage credential of its own, through workload identity, an instance profile or a local key provider, because the catalog will not supply one.

PyIceberg needs the override more than any other client, because it sends `vended-credentials` unless told otherwise. Set the property in your `.pyiceberg.yaml` or pass it to `load_catalog`:

```yaml
catalog:
  lake:
    type: rest
    uri: https://catalog.example.com/api/catalog
    warehouse: analytics
    header.X-Iceberg-Access-Delegation: none
```

For Trino, the default already omits the header, because `iceberg.rest-catalog.vended-credentials-enabled` defaults to `false`. Leave it off for engines that bring their own credentials.

Finally, turn on request logging at your catalog or its proxy and confirm the header arrives as you expect.

## Conclusion

The `none` value is a small spec change with a clear job. It gives an engine a named way to tell an Iceberg REST catalog that it has its own storage access and needs no delegation. The spec says nothing more than that, and server behavior stays an implementation choice. Polaris already treats `none` like a missing header on its main branch. Its server-side counterpart for Azure and Google Cloud Storage is still under debate on the dev list.

Use `none` when the engine holds reviewed storage access through workload identity, local keys or a dedicated job role. Keep vending when the catalog is the only place your table permissions live. Either way, write down which layer enforces file access, test each engine against the catalog directly, and check the catalog logs.

## Keep Going

If this piece was useful, I have written a lot more on Iceberg catalogs and how they govern storage access. _Apache Polaris: The Definitive Guide_ covers catalog setup, storage configuration and credential vending in depth. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [[RESULT][VOTE] REST spec: Add none to X-Iceberg-Access-Delegation header values (dev@iceberg)](https://lists.apache.org/thread/c5ldjw25fplxjfplfx8fnvbkv598yy3p)
- [[VOTE] REST spec: Add none to X-Iceberg-Access-Delegation header values (dev@iceberg)](https://lists.apache.org/thread/hc2764vozz7ygx5fjj64104hotrof0lk)
- [[DISCUSS] REST spec: expected server behavior when X-Iceberg-Access-Delegation cannot be satisfied (dev@iceberg)](https://lists.apache.org/thread/6zspb6cpb6j2po5lm57mq1sgcp2hppkf)
- [[DISCUSS] Typed Storage Config options for skipping credential vending in Azure / GCS (dev@polaris)](https://lists.apache.org/thread/ww0op2znoxsh6wkgydo9o512joqtrcpz)
- [Reply in the Polaris typed storage thread referencing PR 5884](https://lists.apache.org/thread/wl3b2b3dnk7wn0l8w8clj4r0rr70rgpk)
- [Iceberg REST catalog OpenAPI spec, main branch](https://github.com/apache/iceberg/blob/main/open-api/rest-catalog-open-api.yaml)
- [Iceberg RESTUtil.java (header property handling)](https://github.com/apache/iceberg/blob/main/core/src/main/java/org/apache/iceberg/rest/RESTUtil.java)
- [Polaris management API spec, main branch](https://github.com/apache/polaris/blob/main/spec/polaris-management-service.yml)
- [Polaris DefaultAccessDelegationModeResolver.java, main branch](https://github.com/apache/polaris/blob/main/runtime/service/src/main/java/org/apache/polaris/service/catalog/DefaultAccessDelegationModeResolver.java)
- [Polaris docs: Using Polaris with Spark](https://github.com/apache/polaris/blob/main/site/content/in-dev/unreleased/getting-started/using-polaris/_index.md)
- [PyIceberg configuration docs](https://github.com/apache/iceberg-python/blob/main/mkdocs/docs/configuration.md)
- [PyIceberg REST catalog source](https://github.com/apache/iceberg-python/blob/main/pyiceberg/catalog/rest/__init__.py)
- [Trino metastore and REST catalog docs](https://trino.io/docs/current/object-storage/metastores.html)
