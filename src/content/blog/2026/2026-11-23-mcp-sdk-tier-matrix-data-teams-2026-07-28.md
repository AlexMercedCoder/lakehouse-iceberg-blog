---
title: "The MCP SDK Tier Matrix for Data Teams: Which SDKs Support the Stateless 2026-07-28 Spec"
description: "A dated matrix of every official MCP SDK: tier, latest release, 2026-07-28 stateless spec support and conformance, for data teams."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "AI & Agents"
tags:
  - Model Context Protocol
  - SDKs
  - data engineering
  - conformance
  - comparison
slug: "mcp-sdk-tier-matrix-data-teams-2026-07-28"
draft: false
canonicalURL: https://datalakehousehub.com/blog/mcp-sdk-tier-matrix-data-teams-2026-07-28/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/mcp-sdk-tier-matrix-data-teams-2026-07-28/).

Teams building an MCP server for lakehouse data should pick an SDK that supports the stateless 2026-07-28 spec. On October 30, 2026, the official Ruby SDK reached Tier 1, with mcp gem 1.2.0 supporting the new spec. This matrix lists each official SDK's tier, spec support and conformance status, with a date on every row.

Here is the problem I keep seeing. A data platform team decides to expose its catalog, its semantic layer or a set of governed SQL views to AI agents through the Model Context Protocol (MCP). Somebody picks the language the team already knows, installs the official SDK, and ships a prototype in a week. Then the agent client upgrades to the 2026-07-28 protocol revision, sends a request with no `initialize` handshake, and the server answers with an error the client cannot recover from.

Nothing in that story is a bug in the team's code. The SDK simply targets an older revision. MCP now has ten official SDKs, and they do not move at the same speed. Six sit at Tier 1, one at Tier 2 and three at Tier 3. Some shipped 2026-07-28 support on the day the spec went stable. Some have no documented support for it at all.

This article is a reference, not a protocol explainer. If you want the reasoning behind the stateless redesign, read [MCP 2026-07-28 Spec: Stateless MCP for Data Platforms](https://iceberglakehouse.com/posts/mcp-2026-07-28-stateless-spec-data-platforms/) first. What follows tracks which SDKs implement that change, at what tier, with what conformance evidence, and what that means when you are choosing a language for a data server. Every claim in the matrix carries a date and a link, and where a project does not document something, the cell says "not documented."

## Why the SDK Choice Got Harder in 2026

Before the 2026-07-28 revision, picking an MCP SDK was mostly a question of taste. A client opened a connection, sent `initialize`, got capabilities back, and then called tools inside a session.

The 2026-07-28 revision changed the shape of the protocol itself. The [spec changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog) removes the `initialize` and `notifications/initialized` handshake, removes protocol-level sessions and the `Mcp-Session-Id` header from Streamable HTTP, and moves the protocol version and client capabilities into each request's `_meta` field. An SDK that does not implement this cannot talk to a client that only speaks the modern era.

The spec reached stable status on July 28, 2026, according to the [specification releases page on GitHub](https://github.com/modelcontextprotocol/modelcontextprotocol/releases). The release candidate had been published on May 29, 2026. That gave SDK maintainers about two months to align with the final wire format, and the projects used that window very differently.

For a data team, the stakes are specific. Data servers tend to sit behind load balancers, run as multiple replicas and front expensive query engines. The stateless model fits that deployment pattern far better than sticky sessions did, which is the core argument of [MCP Stateless Gateways for Data Agents](https://iceberglakehouse.com/posts/mcp-stateless-specifications-scalable-data-gateways-ai-agents/). You only get that benefit if your SDK actually serves the modern lifecycle. So the language decision is now also a protocol-revision decision.

## What MCP SDK Tiers Mean and Who Assigns Them

The tier system comes from [SEP-1730](https://modelcontextprotocol.io/seps/1730.md), a Specification Enhancement Proposal (SEP), which is the MCP project's formal change process. The [SDK Tiers page](https://modelcontextprotocol.io/community/sdk-tiers) defines three tiers. The SDK Working Group runs the system and makes the final tier assignment. Maintainers cannot simply declare themselves Tier 1.

Tier 1 is "Fully Supported." These SDKs implement every non-experimental feature, including optional capabilities such as sampling and elicitation. Tier 2 is "Commitment to Full Support," meaning the SDK is actively maintained and working toward full coverage. Tier 3 is "Experimental," which covers SDKs that are partial, early or specialized. Experimental features and protocol extensions, such as Tasks and MCP Apps, are not required at any tier.

The requirements that matter most for a data team sit in a single table on that page. I have pulled the rows I check first:

| Requirement             | Tier 1                                | Tier 2                      | Tier 3                 |
| ----------------------- | ------------------------------------- | --------------------------- | ---------------------- |
| Conformance tests       | 100% pass rate                        | 80% pass rate               | No minimum             |
| New protocol features   | Before the new spec version's release | Within 6 months             | No timeline commitment |
| Issue triage            | Within 2 business days                | Within a month              | No requirement         |
| Critical bug resolution | Within 7 days                         | Within two weeks            | No requirement         |
| Stable release          | Required, with clear versioning       | At least one stable release | Not required           |

Source: [SDK Tiers](https://modelcontextprotocol.io/community/sdk-tiers), checked November 23, 2026.

Read the "New protocol features" row carefully. A Tier 1 SDK commits to shipping a new spec revision before that revision is released. A Tier 2 SDK gets six months. A Tier 3 SDK makes no promise. If your agent clients upgrade on release day, only a Tier 1 SDK is obliged to keep up with them.

Conformance is measured with the official [conformance test suite](https://github.com/modelcontextprotocol/conformance). Each SDK runs the suite against its default branch and publishes results. The pass rate counts only applicable required tests, so experimental features and disputed tests do not count.

Advancement follows four steps. Maintainers self-assess, open an issue in the main `modelcontextprotocol/modelcontextprotocol` repository with evidence, pass the conformance threshold on their latest stable release, and get Working Group approval. The Ruby SDK's path shows the timing in practice. Per the [Ruby Tier 1 announcement](https://blog.modelcontextprotocol.io/posts/ruby-sdk-tier-1/), it reached Tier 3 in March 2026 at v0.8.0, Tier 2 in July 2026 with v1.0.0, applied for Tier 1 in August and was confirmed in September, with the assessment run at v1.2.0.

Tiers also move down. If any conformance test fails continuously for four weeks on a Tier 1 SDK's latest stable release, the SDK becomes eligible to drop to Tier 2. A Tier 2 SDK becomes eligible to drop to Tier 3 when more than 20% of tests fail for four weeks. Issues left unaddressed for two months are also grounds for relegation, and the Working Group decides and records each case.

One more obligation is easy to miss. The [feature lifecycle policy](https://modelcontextprotocol.io/community/feature-lifecycle) requires Tier 1 SDKs to mark deprecated API surfaces with the language's native mechanism in their next release, for example `[Obsolete]` in .NET or `@deprecated` JSDoc in TypeScript. They should also emit a runtime warning when code exercises a deprecated feature. A Tier 1 SDK that keeps failing to surface deprecations can be relegated too.

For a data team, the practical reading is simple. A tier describes what the maintainers commit to next, as well as what the code does today.

## What 2026-07-28 Requires From an SDK

To read the matrix, you need to know what "supports 2026-07-28" means at the SDK level. Three groups of changes do most of the work. I will describe them only as far as they affect the SDK you choose. The design reasoning lives in the [stateless-spec article](https://iceberglakehouse.com/posts/mcp-2026-07-28-stateless-spec-data-platforms/).

### The stateless lifecycle (SEP-2575)

SEP-2575 is titled "Make MCP Stateless." Per the [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog), it removes the `initialize` handshake. Every request now carries `io.modelcontextprotocol/protocolVersion` and `io.modelcontextprotocol/clientCapabilities` in `_meta`. Servers must implement a new `server/discover` method that advertises supported versions, capabilities and identity.

SEP-2575 also replaces the HTTP GET stream and `resources/subscribe` with `subscriptions/listen`, a single long-lived POST response stream for change notifications the client opts into. It removes `ping` and `logging/setLevel`. It also removes SSE stream resumability, so a broken response stream loses the in-flight request and the client must reissue it.

For an SDK, this is a transport and dispatcher rewrite. The SDK has to validate per-request metadata, route `server/discover`, answer version mismatches with `UnsupportedProtocolVersionError` (code `-32022`), and run handlers without a session object to lean on.

### Multi round-trip requests (SEP-2322)

Older revisions let a server send its own requests back to the client in the middle of a tool call, for elicitation, sampling or roots. SEP-2322 replaces that with the Multi Round-Trip Request (MRTR) pattern. The server returns an interim result with `resultType: "input_required"` and an `inputRequests` field. The client gathers the answers and retries the original request with `inputResponses`.

Every result now carries a required `resultType` field, either `"complete"` or `"input_required"`. For an SDK, this changes handler return types. The Rust SDK's 3.0.0 notes say that `call_tool`, `get_prompt` and `read_resource` handlers now return MRTR-aware response enums. The Python v2 docs say `ctx.elicit()` fails on a 2026-07-28 connection with `NoBackChannelError`, and point developers to a resolver pattern instead.

### The deprecations (SEP-2577)

SEP-2577 deprecates three features: Roots, Sampling and Logging. They still work during the deprecation window, but new implementations should not adopt them. The changelog suggests replacements. Pass directories or files through tool parameters or resource URIs instead of Roots. Call LLM provider APIs directly instead of Sampling. Log to `stderr` or use OpenTelemetry instead of Logging.

The [feature lifecycle policy](https://modelcontextprotocol.io/community/feature-lifecycle) sets a minimum deprecation window of twelve months, counted from the release of the revision that first marks the feature Deprecated. So none of these three features can be removed before a revision released on or after July 28, 2027, outside the expedited path for active security risks.

### The smaller items that still bite

A few minor changes show up in SDK release notes often enough to matter. SEP-2243 requires `Mcp-Method` and `Mcp-Name` headers on Streamable HTTP POST requests and adds `x-mcp-header` for custom headers mapped from tool parameters. SEP-2549 requires `ttlMs` and `cacheScope` on list results and `resources/read`. The error code for "resource not found" moved from `-32002` to `-32602`. Rust rmcp 3.5.1, for example, fixed "default missing cache hints for 2026-07-28 peers."

### Dual-era serving

The last requirement is optional in the spec, but most data servers need it. The [versioning page](https://modelcontextprotocol.io/specification/2026-07-28/basic/lifecycle) defines "modern" (2026-07-28 and later), "legacy" (2025-11-25 and earlier) and "dual-era" implementations. A dual-era server answers `initialize` for legacy clients and serves modern requests statelessly, and it can do both on the same endpoint.

A modern-only server breaks every legacy client, because legacy clients have no way to fall forward. So for most data servers in 2026, "supports 2026-07-28" should really mean "serves both eras." Ruby, Python, C#, TypeScript and PHP all describe serving both eras in their release notes or announcements.

## The Matrix: Tier, Version, Spec Support and Conformance

Here is the matrix as of November 23, 2026. Tiers come from the official [SDKs page](https://modelcontextprotocol.io/docs/sdk), which lists each SDK's current tier. Versions and spec support come from each repository's GitHub releases page. Conformance comes from release notes or official announcements. GitHub's release list shows day and month only, so the years below come from the release sequence and the page footer, all 2026.

| SDK              | Tier (SDKs page, Nov 23, 2026)                      | Latest release                                                   | First release with 2026-07-28 support                                                                                                                                           | Conformance, as documented                                                                                            | Source                                                                                                                                     |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript       | Tier 1                                              | 2.4.0 (Oct 23, 2026). The 1.x line continues at 1.32.2, same day | `@modelcontextprotocol/server` 2.0.0 (Jul 27, 2026), which its notes call the "first beta release of SDK v2" with 2026-07-28 support. 2026-07-28 support on 1.x: not documented | Pass rate not documented in release notes. Tier 1 requires 100%                                                       | [releases](https://github.com/modelcontextprotocol/typescript-sdk/releases)                                                                |
| Python           | Tier 1                                              | v2.1.1 (Aug 25, 2026). v2.0.1 followed on Aug 26                 | v2.0.0 (Jul 28, 2026)                                                                                                                                                           | v2.0.0b1 notes: passes the suite, client and server, "except the tasks suite"                                         | [releases](https://github.com/modelcontextprotocol/python-sdk/releases)                                                                    |
| C#               | Tier 1                                              | v2.2.0 (Aug 13, 2026)                                            | v2.0.0 (Jul 28, 2026)                                                                                                                                                           | Pass rate not documented in release notes. Tier 1 requires 100%                                                       | [releases](https://github.com/modelcontextprotocol/csharp-sdk/releases)                                                                    |
| Go               | Tier 1                                              | v1.8.0 (Sep 14, 2026)                                            | v1.7.0 (Jul 28, 2026)                                                                                                                                                           | Client and server run the official suite in CI since v1.7.0-pre.2. Pass rate not stated                               | [releases](https://github.com/modelcontextprotocol/go-sdk/releases)                                                                        |
| Rust (`rmcp`)    | Tier 1                                              | rmcp-v3.5.1 (Oct 5, 2026), marked Latest                         | rmcp-v3.0.0 (Jul 28, 2026)                                                                                                                                                      | rmcp-v3.1.0 notes: "meeting requirements for tier 1"                                                                  | [releases](https://github.com/modelcontextprotocol/rust-sdk/releases)                                                                      |
| Ruby (`mcp` gem) | Tier 1 (confirmed Sep 2026, announced Oct 30, 2026) | v1.8.0 (Oct 16, 2026)                                            | v1.2.0 (Aug 15, 2026). v1.1.0 (Aug 1) first set 2026-07-28 as latest version                                                                                                    | 100% of scored server and client scenarios for 2025-11-25 and 2026-07-28 (67 of 67 server, 50 of 50 client at v1.2.0) | [blog](https://blog.modelcontextprotocol.io/posts/ruby-sdk-tier-1/), [releases](https://github.com/modelcontextprotocol/ruby-sdk/releases) |
| Java             | Tier 2                                              | v2.0.1 (Aug 19, 2026)                                            | Not documented. v2.0.0 notes say it "tracks the latest 2025-11-25 MCP specification"                                                                                            | Suite upgraded to 0.1.16 in v2.0.1. Pass rate not documented                                                          | [releases](https://github.com/modelcontextprotocol/java-sdk/releases)                                                                      |
| Kotlin           | Tier 3                                              | 0.15.0 (Jul 28, 2026)                                            | Not documented                                                                                                                                                                  | Suite bumped to 0.1.16 in 0.11.0. Pass rate not documented                                                            | [releases](https://github.com/modelcontextprotocol/kotlin-sdk/releases)                                                                    |
| Swift            | Tier 3                                              | 0.12.1 (May 7, 2026)                                             | Not documented. 0.11.0 notes say the 2025-11-25 spec is covered                                                                                                                 | Conformance tests added in 0.11.0. Pass rate not documented                                                           | [releases](https://github.com/modelcontextprotocol/swift-sdk/releases)                                                                     |
| PHP              | Tier 3                                              | v0.10.0 (Nov 10, 2026)                                           | v0.8.0 (Aug 25, 2026)                                                                                                                                                           | v0.8.0 adds conformance jobs "over both spec revisions." Pass rate not documented                                     | [releases](https://github.com/modelcontextprotocol/php-sdk/releases)                                                                       |

A few rows need more context than a table cell holds.

**TypeScript.** The v2 SDK split into new packages, including `@modelcontextprotocol/server`, `@modelcontextprotocol/client` and framework adapters. The [June 29, 2026 SDK betas post](https://blog.modelcontextprotocol.io/posts/sdk-betas-2026-07-28/) said these "are new package names with no stable release yet," ESM-only and requiring Node.js 20 or later. The 2.0.0 server notes dated July 27 still use the word "beta." By October, 2.3.0 added Tasks extension support on 2026-07-28 connections. The older 1.x package line keeps shipping patch releases in parallel, so check which package name your project actually imports.

**Python.** Version 2.0.0 shipped on spec day and "supports the 2026-07-28 revision" while serving earlier revisions from the same server. It is a breaking release. Per the [Python v2 "What's new" page](https://py.sdk.modelcontextprotocol.io/v2/whats-new/), `FastMCP` became `MCPServer` with the old import path removed, transport options such as `stateless_http` moved to `run()`, and the HTTP client changed libraries. The tasks extension (SEP-2663) was not in 2.0.0. If you built the server in [Implementing MCP in the Lakehouse](https://datalakehousehub.com/blog/mcp-lakehouse-semantic-data-layer-python/) on v1, plan a real migration, not a version bump.

**C#.** Version 2.0.0 made `HttpServerTransportOptions.Stateless` default to `true` and brought the SDK "into stable alignment with the MCP 2026-07-28 specification." Version 2.2.0 added hybrid stateful and stateless serving through an `HttpServerSessionMode` option, so 2025-11-25 and 2026-07-28 clients can share one endpoint.
**Go.** Version 1.7.0 says it "brings full support for protocol version 2026-07-28" and enables the new protocol by default for new clients. One detail trips people up. The Streamable HTTP transport accepts 2026-07-28 requests only when `Stateless` is set to true. Version 1.8.0 added no new protocol revision.

**Rust.** The `rmcp` crate went to 3.0.0 on spec day, stating "RMCP 3.0 adds support for MCP 2026-07-28." Its notes warn that because rmcp creates a fresh handler per request, any persistent state must live outside the handler. One caveat on the version cell: during one check the release listing also showed an `rmcp-v3.6.0` entry dated October 20, while the main page marked 3.5.1 as Latest. Check crates.io before you pin.

**Ruby.** The `mcp` gem is the clearest case in the table because its Tier 1 assessment is public. The announcement shows the progression from 25 of 30 server scenarios at Tier 3 to 67 of 67 at Tier 1. It also warns that "several 1.x releases, starting with 1.2.0, reject input that earlier releases accepted," so read the changelog before upgrading an existing 1.x app.

**Java, Kotlin and Swift.** None of these three documents 2026-07-28 support in its releases. Java is Tier 2, so the tier rules give it six months from release to ship new protocol features. Kotlin and Swift are Tier 3, with no timeline commitment.
**PHP.** PHP is the surprise. It is Tier 3, yet v0.8.0 headlines "support for the 2026-07-28 Model Context Protocol specification," lists SEP-2575 and SEP-2322 work, and runs conformance jobs over both revisions. A tier records what the maintainers have committed to and what the Working Group has assessed. It does not, by itself, tell you which spec revision the code speaks. That distinction is why the table carries both columns.

## Checking Your Own Server Against the Matrix

A matrix row tells you what an SDK claims. The fastest check I know is to send the server a `server/discover` request and read what comes back. Every 2026-07-28 server must implement this method, and a legacy server will not recognize it.

The request below comes straight from the [discovery page of the 2026-07-28 spec](https://modelcontextprotocol.io/specification/2026-07-28/server/discover):

```json
{
  "jsonrpc": "2.0",
  "id": "discover-1",
  "method": "server/discover",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": {
        "name": "ExampleClient",
        "version": "1.0.0"
      },
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

The three `_meta` keys carry what the old handshake used to negotiate. `protocolVersion` names the revision this request speaks. `clientInfo` identifies the caller, which the spec says clients should send on each request. `clientCapabilities` declares what the client supports, and it travels with every request because the server is not allowed to remember it between calls.

A modern server answers with a result shaped like this one, again from the spec:

```json
{
  "jsonrpc": "2.0",
  "id": "discover-1",
  "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28"],
    "capabilities": {
      "tools": {},
      "resources": {}
    },
    "_meta": {
      "io.modelcontextprotocol/serverInfo": {
        "name": "ExampleServer",
        "version": "1.0.0"
      }
    },
    "instructions": "This server provides weather and resource utilities.",
    "ttlMs": 3600000,
    "cacheScope": "public"
  }
}
```

Read four fields. `resultType` is the SEP-2322 field that every result now carries. `supportedVersions` tells you whether the server is modern-only or dual-era. A dual-era server lists both `2026-07-28` and `2025-11-25`. `ttlMs` and `cacheScope` are the SEP-2549 cache hints, so their presence tells you the SDK implements that part of the revision too.

The server's identity sits in `_meta` under `io.modelcontextprotocol/serverInfo`. It is self-reported, so use it for logging and for confirming which build answered, never for security decisions.

If the server does not support the version you asked for, it must return an error with code `-32022` and a `data.supported` array listing the versions it does support. On Streamable HTTP, a legacy server answers a modern request with a `4xx` status and no recognized modern error body. That difference is how dual-era clients decide whether to fall back to `initialize`, per the compatibility matrix on the [versioning page](https://modelcontextprotocol.io/specification/2026-07-28/basic/lifecycle).

Two details catch people running this check by hand over HTTP. The spec requires the `MCP-Protocol-Version` header on modern requests, and SEP-2243 adds `Mcp-Method` and `Mcp-Name`. The TypeScript server 2.1.0 notes, for example, describe refusing a modern POST that omits `MCP-Protocol-Version` with a 400 and JSON-RPC error `-32020`. So if your hand-built probe fails, check headers before you blame the SDK.

Run this probe in CI against a staging deployment after every SDK upgrade. It takes seconds and catches a transport option, such as Go's `Stateless` flag, that has flipped back to a legacy default.

## What a Data Server Needs Beyond the Spec

Spec support is the floor. A server that exposes tables, metrics or a catalog to agents has more problems the matrix does not solve for you, and each one interacts with the stateless revision.

### Authorization

The 2026-07-28 revision tightened authorization in several places. Per the [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog), authorization servers should include the `iss` parameter in authorization responses per RFC 9207, and clients must validate it before redeeming the code (SEP-2468). Clients must key persisted credentials by issuer and must re-register when the authorization server changes (SEP-2352). OAuth 2.0 Dynamic Client Registration is now deprecated as a registration mechanism in favor of Client ID Metadata Documents (CIMD).

Most of that work lands on clients and authorization servers, not on your tool server. But your SDK's auth helpers decide how much code you write yourself. The Java SDK's 2.0.0 notes mention implementing CIMD in its conformance tests, and the Python v2 notes call out a TLS verification change from the new HTTP client. Read your SDK's auth section closely, because a data server is usually the component a security reviewer audits first.

Stateless operation also helps here. With no session, every request carries enough information to authorize it on its own. That makes per-request authorization checks the natural design instead of an add-on. If you work in a regulated industry, [MCP in Regulated Environments](https://datalakehousehub.com/blog/mcp-regulated-environments-toronto-2026/) covers the audit and control side, and the SDK choice determines how cleanly you can attach those controls to each request.

### Pagination

The [pagination utility](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination) uses opaque cursors. The server sets the page size, returns `nextCursor` when more results exist, and clients must treat the cursor as opaque. Invalid cursors should produce error `-32602`. That covers `resources/list`, `resources/templates/list`, `prompts/list` and `tools/list`.

Notice what the list leaves out. `tools/call` does not paginate at the protocol level. If an agent calls a `run_query` tool against a fact table, the protocol gives you no built-in cursor for the result rows.

The 2026-07-28 changelog gives the pattern to use instead. Servers that need cross-call state use explicit, server-minted handles passed as ordinary tool arguments (SEP-2567). For a data server, that means the first call returns a page of rows plus a handle, and the agent passes the handle back to fetch the next page. Because the server holds no session, the handle has to encode or point to everything needed to resume, such as a snapshot ID and an offset. SDKs differ in how much they help with this. The point is to check that your SDK's tool-argument and structured-output support handles it cleanly.

If you catalog hundreds of tables as resources, list pagination matters too. Pick a stable sort order, since servers should provide stable cursors. The spec also says servers should return `tools/list` in a deterministic order to help client caching.

### Result-size limits

The changelog and pagination pages set no size cap on tool results. SEP-2106 loosened `structuredContent` to allow any JSON value, which is convenient and also dangerous for a data server. One careless `SELECT *` can return a payload larger than the agent's context window, or larger than your gateway's response limit.

Set limits in the server itself. Cap rows per call, cap bytes per response, and return a handle for the rest. Put the limit in the tool description so the model knows about it. None of this is SDK-specific, so enforce it in your own tool code regardless of language.

### Caching and private data

SEP-2549's cache hints deserve a data-specific note. `cacheScope` accepts `"public"` or `"private"`, and it controls whether shared intermediaries can cache the response. Lists and `resources/read` results now carry it. If your resource content depends on the caller's permissions, such as row-level security on a table preview, mark it `"private"` and keep `ttlMs` short. Check that your SDK lets you set these per response rather than once per server.

## Choosing a Language for Your Team's Stack

Start with the language your team already runs in production, then check it against the matrix. A server nobody on the team can debug at 2 a.m. is a worse choice than a slightly less polished SDK in a familiar language.

**Python shops** should use the v2 SDK. It is Tier 1, it shipped 2026-07-28 support on spec day, and most lakehouse tooling, from PyIceberg to Arrow, already lives in Python. Budget time for the v1 to v2 migration.

**JVM shops** face the hardest call. Java is Tier 2 and its releases document 2025-11-25 support only. Kotlin is Tier 3 with no documented 2026-07-28 support. If your clients still speak 2025-11-25, Java works today. If they have moved to the modern era, run the discover probe before committing, or put a thin server in a Tier 1 language in front of your JVM services.

**.NET and Go shops** are in good shape. Both are Tier 1, both shipped on July 28, and both document stateless serving. Remember Go's `Stateless` flag and C#'s `HttpServerSessionMode` for mixed client populations.

**TypeScript shops** get a Tier 1 SDK with frequent releases, but must pick the v2 split packages to get modern-era support. **Rust** fits teams building gateways or embedding a server in a native engine. **Ruby** is now a first-class option for Rails-centric data apps. **PHP** has 2026-07-28 support but Tier 3 commitments, so treat it as a fit for internal tools.

## Keeping the Matrix Current Before March 2027

The next spec revision is targeted for late March 2027, per the [Ruby Tier 1 announcement](https://blog.modelcontextprotocol.io/posts/ruby-sdk-tier-1/). Tier 1 SDKs commit to supporting it by its release date. Tier 2 SDKs get six months.

Treat this matrix as dated data. Re-check the SDKs page and your SDK's releases page monthly, and again when the next release candidate appears. Watch the [deprecated features registry](https://modelcontextprotocol.io/specification/2026-07-28/deprecated) for Roots, Sampling and Logging. Pin a minimum SDK version equal to the first release with 2026-07-28 support, and rerun the discover probe after every upgrade.

## Conclusion

Six official SDKs sit at Tier 1 and support 2026-07-28: TypeScript, Python, C#, Go, Rust and Ruby. PHP supports the revision at Tier 3. Java, Kotlin and Swift do not document support yet. For a data server, choose a Tier 1 SDK in a language your team runs, serve both eras, and solve auth, pagination and result limits in your own code.

## Keep Going

If this piece was useful, I have written a lot more on agentic AI and the lakehouse. _Architecting an Apache Iceberg Lakehouse_ covers the table, catalog and query layers your MCP server will sit on top of. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [The Official Ruby SDK for MCP Reaches Tier 1, MCP Blog, October 30, 2026](https://blog.modelcontextprotocol.io/posts/ruby-sdk-tier-1/)
- [Beta SDKs for the 2026-07-28 MCP Spec Release Candidate, MCP Blog, June 29, 2026](https://blog.modelcontextprotocol.io/posts/sdk-betas-2026-07-28/)
- [MCP specification releases](https://github.com/modelcontextprotocol/modelcontextprotocol/releases)
- [SDK Tiers](https://modelcontextprotocol.io/community/sdk-tiers)
- [SDKs](https://modelcontextprotocol.io/docs/sdk)
- [Feature Lifecycle and Deprecation Policy](https://modelcontextprotocol.io/community/feature-lifecycle)
- [2026-07-28 Key Changes](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [2026-07-28 Versioning and Compatibility](https://modelcontextprotocol.io/specification/2026-07-28/basic/lifecycle)
- [2026-07-28 Discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [2026-07-28 Pagination](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination)
- [Python SDK v2: What's new](https://py.sdk.modelcontextprotocol.io/v2/whats-new/)
- Release pages: [TypeScript](https://github.com/modelcontextprotocol/typescript-sdk/releases), [Python](https://github.com/modelcontextprotocol/python-sdk/releases), [C#](https://github.com/modelcontextprotocol/csharp-sdk/releases), [Go](https://github.com/modelcontextprotocol/go-sdk/releases), [Rust](https://github.com/modelcontextprotocol/rust-sdk/releases), [Ruby](https://github.com/modelcontextprotocol/ruby-sdk/releases), [Java](https://github.com/modelcontextprotocol/java-sdk/releases), [Kotlin](https://github.com/modelcontextprotocol/kotlin-sdk/releases), [Swift](https://github.com/modelcontextprotocol/swift-sdk/releases), [PHP](https://github.com/modelcontextprotocol/php-sdk/releases)
