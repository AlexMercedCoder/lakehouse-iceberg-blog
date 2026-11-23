---
title: "AI Functions in Iceberg's Spark and Flink Connectors: The Proposal for FILE and VECTOR Data"
description: "A November 2026 proposal adds ai_generate and ai_embed to Iceberg's Spark and Flink connectors for FILE and VECTOR data. What it specifies, and the pushback."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "AI & Agents"
tags:
  - Apache Iceberg
  - AI functions
  - Apache Spark
  - Apache Flink
  - vector data
slug: "iceberg-ai-functions-spark-flink-file-vector"
draft: false
canonicalURL: https://datalakehousehub.com/blog/iceberg-ai-functions-spark-flink-file-vector/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/iceberg-ai-functions-spark-flink-file-vector/).

A November 2, 2026 proposal asks Apache Iceberg to add two vendor-agnostic AI functions to its Spark and Flink connectors: one that calls a generative model and one that produces embeddings. Both are designed to operate on Iceberg's proposed FILE and VECTOR types, so multimodal tables can be enriched without engine-specific SQL.

Picture a team with a product table in Iceberg. Each row holds a description and a reference to a product photo. They want two things: a one-sentence summary per product and an embedding per photo for similarity search. If they run Spark for batch and Flink for streaming, they write that enrichment twice. Each engine has its own way to call a model, or none at all. Each one needs its own code to open the photo, which means its own path to the right storage credentials. The embedding then lands in a `list<float>` column that nothing checks for length.

Many warehouse vendors have answered this with built-in SQL functions. Those functions only work in that vendor's engine. The proposal from Alex Stephen asks a different question. Can the table format project ship a small, neutral pair of functions in its own connectors, so the same call works in Spark and Flink against the same Iceberg types?

This article covers what the design document specifies and why the first replies on the dev list question whether Iceberg should own this at all. The proposal is under discussion. Nothing here has shipped, and I mark clearly what is proposed and what is in the current release.

## What Was Proposed, and Where the Code Lives

The thread opened on the Iceberg dev list on November 2, 2026, under the subject "[DISCUSS] AI Functions for FILE/VECTOR types." The message is short. Alex Stephen frames the work as part of the ongoing effort on the FILE and VECTOR types. He proposes "adding a generative AI function + AI embedding function to the Iceberg Spark / Flink connectors," with the stated aim of giving users "a vendor-agnostic set of functions for interacting with their multimodal Iceberg data and creating AI embeddings." The message links a design document at s.apache.org/iceberg-ai-functions.

That design document names the two functions. The generative one is `ai_generate`. The embedding one is `ai_embed`. The summary describes them as AI-native "primitive" functions that let users query their data against a variety of AI providers with their own prompts. It states that the functions are "completely agnostic to the underlying model provider."

The code layout has three parts.

- **iceberg-spark.** Spark functions register through the Iceberg connector, by the same route that already exposes the partition transform functions and `iceberg_version`.
- **The Iceberg Flink catalog.** The document notes that Iceberg exposes no functions to Flink today. It proposes exposing these through the Flink Catalog interface, specifically `getFunction` and `listFunctions`.
- **iceberg-ai.** A new core module that holds the request and response model, the provider interface, and the runtime that executes calls. Both connectors act as a thin layer on top of it.

The Spark and Flink pieces handle registration and type coercion. Everything that talks to a model lives in `iceberg-ai`. So a table format project takes on an HTTP client layer for model providers. That is the part reviewers react to.

The proposal depends on two type proposals that are also not final. The FILE type gives a column a first-class reference to a range of bytes in object storage, with a content type and checksum. I covered its fields and the catalog signing work in [What Iceberg v4's Proposed FILE Type Means for Multimodal Tables](https://iceberglakehouse.com/posts/iceberg-v4-file-type-multimodal-tables/). The VECTOR type gives embedding columns a fixed dimension and finite, non-null elements. That design and its Parquet debate are in [Iceberg Is Getting a Vector Type](https://datalakehousehub.com/blog/iceberg-native-vector-type/). This article assumes both types and focuses on the functions that sit on top.

## Why the Proposal Points at Iceberg Instead of the Engine

The design document's "Problem Statement / Why Iceberg?" section is the core of the argument. It starts from a familiar fact. Many vendors have built AI generation and embedding functions into their own engines. The document observes that these functions mostly take basic primitive types, chiefly strings. They handle text well. They handle images, audio and PDFs poorly unless the vendor also built its own file-reading layer.

It then looks at open source engines. The document names two that already ship AI functions, Apache Flink CDC and Trino, and lists two limits it sees in both.

1. **Return types.** According to the document, Flink CDC's `AI_EMBED` returns only `ARRAY<FLOAT>`. The proposed Iceberg vector type aims to model several numeric element types, and the document lists int, long, float and double.
2. **No file references.** Neither engine's functions accept a reference to a file. The user reads the file and coerces its contents into a string, which the document calls "not always possible, potentially costly."

The second point carries a sub-point. Reading the file can involve credential vending from the catalog, and that logic already lives in the Iceberg library. The document concludes that, because the return types are tied to Iceberg data types and the credential handling sits in Iceberg, the Iceberg library is the best place to integrate the functions.

So the argument has two legs. One is type fidelity. If the output column is an Iceberg VECTOR, the function that produces it should know that type. The other is access. If the input is an Iceberg FILE, the code that opens it should reuse the catalog's existing path to storage credentials instead of asking every engine to rebuild it.

Both legs drew immediate questions. A comment attached to the document summary asks plainly what the proposal has to do with Iceberg. The reply in the document points back to FILE and VECTOR: to read a file of medium or larger size, the function needs credentials for it from an Iceberg REST catalog. A follow-up comment answers that Iceberg already provides configured FileIO instances for tables, and that this seems to be the extent of the library's responsibility.

That exchange is the whole debate in miniature. FileIO is Iceberg's abstraction for reading and writing files in object storage, and catalogs hand engines a FileIO configured with the right credentials. If an engine can already get a working FileIO for a table, it can already open the bytes behind a FILE reference. What remains is the model call itself, and the model call has nothing to do with the table format.

The document also includes a "Prior Work" section, a long survey of existing AI functions grouped by what they do. On the generative side it lists functions from Trino, DuckDB, Postgres through pgai, ClickHouse, BigQuery, Snowflake, Databricks, MotherDuck, AWS, Azure and Oracle. On the embedding side it lists functions from Postgres through pgai, ClickHouse, BigQuery, Snowflake, Databricks, AWS, Azure and Oracle. It notes which specialized functions (classification, sentiment, translation, boolean filters) a few primitives can replicate. That bet is plausible, because most of them are a fixed system prompt around a generic generation call with a constrained return type.

## How the Functions Bind to FILE and VECTOR Columns

The design document gives each function a signature, a parameter table and examples. Everything in this section comes from that document. None of it exists in a released Iceberg version.

### ai_generate

The proposed signature is:

```text
ai_generate(prompt_part_1 [, prompt_part_2, ...] [, options MAP<STRING, STRING>])
  → STRUCT<result: STRING, status: STRING>
```

The function sends one prompt per row to a generative model and returns its answer, either as free text or as JSON that matches a schema. Three details in the parameter table shape how it behaves.

First, the prompt is variadic. You pass one or more prompt parts, and each part can be a scalar, a FILE, or an `ARRAY<FILE>`. Text parts are joined in order. File parts are attached at their position. That positional rule is how a single call mixes instructions and media, for example an instruction string followed by a photo reference.

Second, NULL handling is strict. If any prompt part is NULL, the result is NULL and no model call is made. That is a sensible cost rule. A row with a missing photo does not trigger a paid call with half a prompt.

Third, the return type is a struct, not a bare string. The `result` field holds the answer and the `status` field holds an error message when the call fails. The document's examples read the answer with `.result`:

```text
ai_generate('Summarize in one sentence: ', body).result
ai_generate('Describe this photo: ', photo_file).result
```

The second example is the multimodal case. `photo_file` is a FILE column. The function receives the reference, and the plumbing underneath resolves it to bytes and attaches it to the request. The user never reads the file into a string.

Returning status alongside the result is a design choice I like. In a batch over millions of rows, some calls fail. A status field lets the job finish and lets you query the failures afterward.

### The typed variants

Generation often needs a typed answer. A yes or no question wants a boolean. A score wants a double. The document handles this with separate function names that share one implementation but return different types:

- `ai_generate_bool`
- `ai_generate_int`
- `ai_generate_double`

Under the hood these map to separate task kinds in the `iceberg-ai` request model, each of which asks the provider for a single field named `result` of the matching type. For richer structure, the base `ai_generate` accepts an `output_schema` option, covered in the next section, and returns JSON that matches it.

### ai_embed

The embedding function is simpler:

```text
ai_embed(expr, [options]) → VECTOR<FLOAT>
```

`expr` is a scalar or a FILE. The function generates a vector embedding for the text or the file. The document's example is `ai_embed('Search query text')`.

This is where the VECTOR dependency becomes concrete. The return type is the proposed Iceberg vector type with float elements, not a list, so the output carries that type's guarantees of fixed dimension and finite elements.

Two details are worth flagging. The document's problem statement criticizes Flink CDC for returning only floats, and points out that the vector type aims to cover several numeric element types. The `ai_embed` signature as written still returns `VECTOR<FLOAT>`. The provider interface's `embed` method returns a `float[]`. So the design as written today produces float vectors only. Quantized or integer embeddings, the kind I covered in [Storing Quantized Embeddings in Apache Iceberg](https://iceberglakehouse.com/posts/quantized-embeddings-iceberg-sq8-pq/), stay a separate step after the embedding call.

The second detail is the input side. `ai_embed` takes a single FILE, while `ai_generate` accepts `ARRAY<FILE>`. A prompt can attach several images. An embedding is one vector for one input.

### What binding to FILE actually requires

A FILE value is a reference, not bytes. Something has to turn it into a readable stream with valid credentials. The design document does not spell out that path inside `ai_generate`. It says file parts are "attached at their position" and that reading files can involve catalog credential vending. Whether the function streams bytes to the provider or hands it a pre-signed URL is not specified. That choice drives cost, latency and the trust model, so a fuller revision needs to answer it.

## Model Configuration, Providers and Credentials

Every AI function in the design accepts the same optional last argument: an options map typed `MAP<STRING, STRING>`. The document calls it the "Options Struct," but the signatures type it as a string-to-string map, and each option is parsed into its real type. The listed options are:

| Option               | Parsed as          | What it controls                                                                                                            |
| -------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `endpoint` / `model` | STRING             | `provider:model`, or a bare model name such as `gemini-*`, `claude-*`, `gpt-*`. Defaults to `spark.sql.ai.default.endpoint` |
| `temperature`        | DOUBLE             | Sampling temperature                                                                                                        |
| `max_output_tokens`  | INT                | Maximum answer length                                                                                                       |
| `effort`             | STRING             | Reasoning effort such as low, medium or high, passed as is to Claude and OpenAI models                                      |
| `max_error_ratio`    | DOUBLE, 0.0 to 1.0 | Fraction of a Spark task's rows allowed to fail. Default 1.0                                                                |
| `system_instruction` | STRING             | System prompt, used only by the `ai_generate_*` functions                                                                   |
| `output_schema`      | STRING (DDL)       | For example `'name STRING, tags ARRAY<STRING>'`, used only by `ai_generate`                                                 |

The endpoint default is a Spark SQL configuration key, `spark.sql.ai.default.endpoint`. That gives a session-level default model, so a query does not need to repeat the model on every call. The document does not name an equivalent Flink setting.

The `max_error_ratio` default of 1.0 means that, out of the box, every row in a task is allowed to fail without failing the task. Combined with the `status` field, the default posture is "finish the job and report errors per row." Teams that want a hard stop set the ratio lower.

The `output_schema` option accepts fields of type STRING, BOOLEAN, the integer types from TINYINT to BIGINT, FLOAT, DOUBLE, DECIMAL, or arrays of those. That covers the common extraction cases, such as pulling a name and a list of tags out of free text.

### The iceberg-ai module

Below the SQL surface, the design defines a small Java model. A call is described by an `AiRequest` with a task kind, an optional endpoint, an optional system instruction, a required prompt carrying the user data, an optional output schema, and generation options. The task kinds are an enum: `GENERATE`, `GENERATE_BOOL`, `GENERATE_INT`, `GENERATE_DOUBLE` and `EMBED`. Requests are built through a helper the document calls `AiPrompts`, and the constructor is package-private.

An `AiResponse` is either a success carrying text or a failure carrying an error. For generation the text is free text, or a JSON object when an output schema was set. For embeddings the text is the vector as comma-separated numbers, which callers parse with a helper. The document is explicit that converting the response string into the final SQL type is the job of the Spark or Flink layer.

Providers implement an `AiProvider` interface with two methods. `generate` returns the model's answer and throws an `AiException` of kind RETRYABLE, ROW or FATAL when the call fails. `embed` returns a `float[]` and, by default, throws a FATAL exception for providers with no embedding models. Every generative function uses `generate`. Only `ai_embed` uses `embed`.

Execution goes through `AiRuntime`, which offers a batch `executeAll`, a synchronous `execute`, and an `executeAsync` where identical in-flight requests share one future. The document assigns HTTP sending and retries to providers, and parallelization and any caching to this executor layer.

### Where credentials live

The document says `iceberg-ai` will ship the providers, and that each provider specifies the properties it needs for authentication. Authentication parameters pass through properties. The provider implementation is selected with the `ai.provider.local.impl` property. The document recommends a single provider that speaks to OpenAI-compatible endpoints, with the option of vendor-specific providers where the underlying APIs differ.

So the design has two credential stories.

1. **Storage credentials** for reading FILE values. The proposal's argument is that these come from the Iceberg catalog, through the same vending path tables already use.
2. **Model credentials** for calling a provider. These come from properties configured for the provider implementation. Nothing in the document routes model credentials through the catalog.

Model API keys have no relationship to table metadata. The storage credential story is the Iceberg-specific part. The model credential story is not.

## What Ships Today Versus What Is Proposed

The proposal leans on a precedent. In his November 9 reply, Alex Stephen points to the partition transform functions as an existing case of Iceberg shipping SQL functions, while acknowledging that AI functions are "definitely more complex than those." Those functions are real and documented, so they are the right place to see the mechanism the proposal wants to reuse.

This block is **shipped**. It comes from the Spark queries page of the current Iceberg documentation:

```sql
-- Spark session configured with an Iceberg catalog named prod, e.g.
--   spark.sql.catalog.prod = org.apache.iceberg.spark.SparkCatalog

-- Which Iceberg library is this session running?
SELECT system.iceberg_version();

-- Inspect transform values the way Iceberg computes them
SELECT system.bucket(16, id), system.days(ts) FROM prod.db.table;

-- Be explicit about the catalog
SELECT prod.system.bucket(16, id) FROM prod.db.table;

-- Filter on a transform so it lines up with a days(ts) partition spec
SELECT * FROM prod.db.table WHERE system.days(ts) = date('2025-03-01');
```

Here is what each part shows.

The functions live in the `system` namespace of an Iceberg catalog. The docs state that they are available only through an Iceberg catalog and are not registered in Spark's built-in catalog. That is the registration route the AI proposal names for Spark.

The docs carry a caveat. Spark before 4.2.0 does not support V2Function in the session catalog, so call these functions through a catalog configured with `org.apache.iceberg.spark.SparkCatalog`. Any function shipped by the same route inherits that constraint.

The transform functions are deterministic, cheap and local. `system.bucket(16, id)` returns the same integer for the same `id` on every engine, forever, with no network call. That is exactly why they belong in Iceberg. They encode the table spec's own partition math, and getting them wrong breaks partition pruning. The docs also note that all transform functions return NULL for NULL inputs, a rule the proposed `ai_generate` mirrors.

Now here is the **proposed** shape, taken from the design document's own examples and options table. This does not run on any released Iceberg version.

```text
-- PROPOSED, not shipped. Function names, argument order and option keys
-- are from the design document at s.apache.org/iceberg-ai-functions.

ai_generate('Summarize in one sentence: ', body).result

ai_generate('Describe this photo: ', photo_file).result

ai_embed('Search query text')

-- options is the last argument, a MAP<STRING, STRING>, with keys such as
-- endpoint, temperature, max_output_tokens, effort, max_error_ratio,
-- system_instruction and output_schema
```

Side by side, the gap is obvious. The shipped functions compute something the table spec defines. The proposed functions call an external service whose answer the table spec cannot define. The registration mechanism is the same. The nature of the function is not.

If you want to see how embeddings over Iceberg get searched once they exist, without any new functions, [Vector Search Directly Over Iceberg Tables](https://iceberglakehouse.com/posts/vector-search-over-iceberg-tables/) walks through a runnable hybrid search. The proposal changes how embeddings get produced inside Spark and Flink. It does not change how they get searched.

## The Scope Question: Connector Feature or Engine Feature

On November 9, Russell Spitzer wrote that he was not sure he understood the goal. He asked directly: "Is the goal to create a common vocabulary between Spark and Flink?" He said he was hesitant because he was not sure of the use case. His reasoning was that each engine's API carries a number of engine-specific details beyond function names and arguments, so a shared name does not buy a shared experience.

That is a sharp objection. A Spark user calling an AI function cares about how the call batches inside a task, how retries interact with Spark's own task retries, and how the result flows through the optimizer. A Flink user cares about async I/O, checkpointing and backpressure in a streaming job. Matching the function name across both engines solves the easiest part. The hard parts are engine-specific no matter where the code lives.

Alex Stephen replied the same day and reframed the proposal. He said part of his hope was to learn whether the Iceberg community has any interest in shipping a set of SQL functions as part of the Iceberg codebase at all. He cited the partition transform functions as precedent. If there is interest, he listed two shapes for the functions:

- Built into the Iceberg Spark and Flink connectors, as the document describes.
- Defined as "default" UDFs that engines then implement as part of the UDF spec.

He closed by acknowledging the novelty and that the idea is not necessarily a fit for the project.

The second option points at a real artifact. Iceberg publishes a SQL UDF spec that defines a portable metadata format for scalar and table functions. Each function version carries a list of representations, and today the only representation type is `sql`, a SQL expression body tagged with a dialect such as `spark` or `trino`. A version also carries an optional `deterministic` flag, which defaults to false, and an `on-null-input` setting. Selecting which definition to call is delegated to engines. So the UDF spec already describes functions as portable metadata with engine-specific bodies. An AI function defined that way names a contract and lets each engine supply the body.

About twenty minutes after that, Szehon Ho replied. He said he is also not sure about standardizing AI functions in the Iceberg expression spec. His explanation is the clearest statement of the scope principle in the thread. The expression spec, he wrote, "deliberately defines a small, engine-neutral expression model," with common predicates and a limited set of portable functions tied to Iceberg's needs, which he identified as data organization and skipping. Richer computation is left to SQL-standard functions, engine built-ins and dialect-specific UDFs. That "keeps the shared contract small and makes adoption easier."

He then named what standardizing AI functions requires: agreement on semantics such as model identity, versioning, inference configuration and determinism. His preference: "I'd prefer to use the existing function/UDF mechanisms unless there is a clear Iceberg-specific need for a standardized contract."

Comments inside the design document run the same direction. One comment on the summary states firm opposition to such a large scope increase. The author of the proposal answered in the document much as he did on the list, agreeing that the proposal is novel and that part of its purpose is to test community interest.

Here is how I read the positions. Nobody in the thread says AI enrichment over Iceberg data is useless. They are arguing about where the boundary of a table format project sits. The partition transforms sit inside because the spec defines them and correctness depends on them. AI functions sit outside because nothing in the spec can define what a model returns. The FILE and VECTOR types give a real Iceberg-specific hook, but the hook is in the inputs and outputs, not in the call. A reviewer who accepts the types and rejects the functions is being consistent.

There is also a maintenance angle the thread does not spell out. Provider APIs and model names change often. Shipping providers inside `iceberg-ai` ties those clients to Iceberg's release cadence.

## Determinism, Cost and Reproducibility

The design document marks the Spark functions as non-deterministic. That one line has large consequences for anyone who writes the output into a table.

**Reproducibility.** Iceberg's value rests on reproducible reads. Time travel returns the same rows for the same snapshot. An AI function does not return the same answer for the same input. Sampling temperature, model updates behind a stable name, and provider-side changes all move the output. Once `ai_generate` writes a summary into a column, that column is a record of one call, not a function of the input. Rerun the pipeline and the table changes even though the source did not.

**Spark retries.** Non-determinism also bites inside a single job. If a Spark task fails and retries, the retried rows call the model again and get different answers. A non-deterministic flag stops the optimizer from reordering or deduplicating calls, but it does not make retried output match the first attempt.

**Cost.** Every row is a paid request. The NULL rule helps, and `executeAsync` sharing futures for identical in-flight requests helps with duplicates inside one executor. Beyond that, the document says only that any caching lives in the `AiRuntime` layer. A careless `SELECT` over a large table is an expensive query in dollars, not just compute.

**Lineage.** Szehon Ho's list of open semantics (model identity, versioning, inference configuration) is exactly the metadata a reproducible pipeline needs. The proposed `AiResponse` carries text and an error. It does not carry the model version that produced the text.

The practical pattern does not depend on the proposal. Treat AI output as materialized data. Write it once, record the model and options used, and refresh deliberately. That works today with engine-native functions or a Python job.

## Conclusion: Status and What the Replies Decide

As of November 23, 2026, the proposal is a discussion thread with four messages and a design document with open comments. The two substantive replies, from Russell Spitzer and Szehon Ho, question whether Iceberg should own AI functions at all. The author has reframed the question as whether the community wants Iceberg to ship SQL functions beyond the partition transforms, and offered the UDF spec as an alternative shape. No vote has been called, and I will not predict an outcome.

What the replies decide is narrower than it looks. The FILE and VECTOR types move forward on their own tracks. The question here is only where the call to a model lives: in Iceberg's connectors, as a default UDF contract, or in each engine. If you build multimodal pipelines on Iceberg, follow the thread on the dev list and the design document, and design your enrichment jobs so the model call is a replaceable step that writes into typed columns.

## Keep Going

If this piece was useful, I have written a lot more on Apache Iceberg and how lakehouse tables serve AI workloads. _Apache Iceberg: The Definitive Guide_ covers the table spec, catalogs and engine integrations that every proposal in this article builds on. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [dev@iceberg: "[DISCUSS] AI Functions for FILE/VECTOR types" thread (Nov 2 to Nov 9, 2026)](https://lists.apache.org/thread/zv614sbcz0doshl4xpddpcj3oolfgo3b)
- [Design document: AI Functions (s.apache.org/iceberg-ai-functions)](https://s.apache.org/iceberg-ai-functions)
- [Apache Iceberg docs: Spark queries, Spark SQL functions](https://iceberg.apache.org/docs/latest/spark-queries/)
- [Apache Iceberg SQL UDF spec](https://iceberg.apache.org/udf-spec/)
- [What Iceberg v4's Proposed FILE Type Means for Multimodal Tables](https://iceberglakehouse.com/posts/iceberg-v4-file-type-multimodal-tables/)
- [Iceberg Is Getting a Vector Type, and Parquet Decides What It Looks Like](https://datalakehousehub.com/blog/iceberg-native-vector-type/)
