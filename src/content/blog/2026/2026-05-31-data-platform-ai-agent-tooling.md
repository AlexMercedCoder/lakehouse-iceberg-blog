---
title: "Data Platform AI Agent Tooling in 2026: 11 Vendors Compared"
pubDatetime: 2026-05-31T10:00:00Z
modDatetime: 2026-10-15T12:00:00Z
description: "How Dremio, Snowflake, Databricks, Fabric, AWS, Google Cloud, ClickHouse, Doris, Spice, Bauplan, and Qlik expose data to AI agents: MCP servers, agents, CLIs."
author: "Alex Merced"
category: "Data Engineering"
slug: "data-platform-ai-agent-tooling"
draft: false
tags:
  - AI Agents
  - Data Platforms
  - MCP
  - Agentic Analytics
  - Data Engineering
faqs:
  - question: "Which data platforms ship an MCP server in 2026?"
    answer: "All eleven platforms in this comparison offer one. Dremio, Snowflake, Databricks, ClickHouse Cloud, Google Cloud (BigQuery), Microsoft Fabric, Qlik, and Bauplan run hosted MCP endpoints, AWS pairs a managed AWS MCP Server with open-source servers for Redshift and its data processing services, and Apache Doris and Spice ship MCP servers you run yourself."
  - question: "What is the difference between Snowflake CoWork and Cortex Agents?"
    answer: "Cortex Agents is Snowflake's managed framework for building agents that plan, call tools such as Cortex Analyst and Cortex Search, and reflect on results. Snowflake CoWork, formerly Snowflake Intelligence, is the business-user assistant where people work with those agents, and CoCo, formerly Cortex Code, is the developer-facing coding agent."
  - question: "What replaced Databricks Knowledge Assistant and Supervisor Agent?"
    answer: "Databricks now labels Knowledge Assistant and Supervisor Agent as legacy offerings. Its docs point new low-code agents to Genie Agents and code-based agents to the Agent Bricks CLI, with Unity Gateway governing model and MCP traffic."
  - question: "How do AI agents connect to Dremio?"
    answer: "Dremio offers three paths: the built-in AI Agent in Dremio Cloud, a hosted MCP server in every Dremio Cloud project for clients such as Claude, ChatGPT, and Gemini, and the dremio-cli developer CLI for coding agents. Queries through all three respect the user's existing role-based and fine-grained access controls."
  - question: "Does Microsoft Fabric support MCP?"
    answer: "Yes. A published Fabric data agent becomes a remote MCP server that exposes the agent as a single tool, and Microsoft also offers the Fabric Core MCP server for workspace and item management. Fabric data agents are generally available and are read-only over OneLake sources."
---

# Data Platform Native AI Agent Tooling in 2026

<!-- Meta Description: A comprehensive comparison of AI agent tooling across Dremio, Snowflake, Databricks, Microsoft Fabric, AWS, Google Cloud, ClickHouse, VeloDB, SpiceAI, Bauplan, and Qlik in 2026. -->
<!-- Primary Keyword: Data platform AI agent tooling -->
<!-- Secondary Keywords: agentic analytics, data platform agents, MCP server data, lakehouse AI agents -->

_Reviewed October 15, 2026 against vendor documentation, including [Dremio's CLI docs](https://docs.dremio.com/dremio-cloud/ai-integration/cli/), [Snowflake's managed MCP server docs](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp), [Databricks' Agent Bricks FAQ](https://docs.databricks.com/aws/en/agents/concepts/faq), and [Microsoft's Fabric data agent MCP docs](https://learn.microsoft.com/en-us/fabric/data-science/data-agent-mcp-server)._

Every data platform vendor now offers some form of AI agent tooling. The approaches vary widely, from full agent authoring frameworks to MCP server endpoints to semantic layers designed for agent consumption. This article walks through eleven platforms and what each one offers for building, deploying, and running AI agents on your data.

The common thread across all of them is the Model Context Protocol, or MCP. Anthropic released MCP in late 2024 as an open standard for connecting AI models to external tools and data sources, and in December 2025 donated it to the Linux Foundation's Agentic AI Foundation. The current revision, 2026-07-28, made the protocol stateless. By mid-2026, nearly every major data platform ships an MCP server. MCP has become the default bridge between AI agents and enterprise data, replacing a patchwork of vendor-specific APIs.

Here is how each platform approaches native AI agent tooling.

## Dremio

Dremio, which SAP acquired in July 2026, took an early lead on agentic data access by shipping three integration paths in parallel.

The first path is the built-in AI agent inside the Dremio console. You click a button and get a conversational interface that can discover data, generate visualizations, debug slow queries, and share insights. No setup, no configuration. The agent runs against Dremio's semantic layer, which means every query respects existing user permissions. Users see only the data they are authorized to access.

The second path is the MCP server. Every Dremio Cloud project includes a hosted MCP server, and any MCP-compatible agent, including Claude, ChatGPT, or Gemini, connects to your Dremio lakehouse through it. Users sign in with OAuth, and queries respect the role-based and fine-grained access controls already configured in Dremio. An open-source MCP server covers self-managed deployments. The MCP server exposes Dremio's full catalog, query engine, and semantic layer as tools that agents can discover and call. This is the path for business users and knowledge workers who work through chat-style interfaces.

The third path is the Dremio CLI. It gives programmatic control to AI coding agents like Claude Code, Codex, or Cursor. The CLI is self-describing, meaning agents can discover Dremio's full capabilities and compose them into workflows. Use cases include automated data ingestion, table creation, schema transformations, query diagnosis, and end-to-end pipeline automation. The CLI installs via pipx, uv, or pip as the `dremio-cli` package.

Dremio also published its Agentic Lakehouse Architecture framework, which defines four technical layers for agent-ready data platforms: object storage, the Iceberg table format, an open catalog for access control (in Dremio's case, Dremio Catalog, built on Apache Polaris), and the query engine layer. The framework is useful for any team designing a data platform where AI agents are primary consumers.

## Snowflake

Snowflake delivers agentic AI through Cortex Agents plus two assistants that Snowflake renamed at Summit in June 2026: Snowflake CoWork (formerly Snowflake Intelligence) and Snowflake CoCo (formerly Cortex Code).

Cortex Agents are Snowflake's managed framework for building AI agents that operate on your Snowflake data. A Cortex Agent combines Cortex Analyst for text-to-SQL over semantic views, Cortex Search for retrieval over unstructured data, and stored procedures and user-defined functions as custom tools. It can also call tools on remote MCP servers. The agent runs a loop: it plans and breaks complex questions into subtasks, calls tools, then reflects on results before responding.

Snowflake CoWork is the entry point for business users, positioned as a personal work agent for knowledge workers. You ask questions in natural language, and CoWork works through Cortex Agents and connected tools. CoCo is the developer-facing coding agent that works with local files and Snowflake data together.

The Snowflake-managed MCP server, generally available since November 2025, exposes Cortex Agents, Cortex Analyst, Cortex Search, SQL execution, and custom tools to any MCP-compatible client, with OAuth authentication and role-based access control governing which tools a client can discover and call. Snowflake recommends exposing a Cortex Agent as the only client-facing tool on a server used for governed business questions, and putting raw SQL on a separate, least-privileged server. In May 2026 Snowflake also agreed to acquire Natoma, an enterprise MCP platform, to add governance and identity for agent tool access.

## Databricks

Databricks consolidated its agent tooling under Agent Bricks, which its docs now describe as the Databricks agent developer platform.

For low-code work, Genie Agents answer questions over your tables and documents, with Unity Catalog providing discovery and governance. The earlier Knowledge Assistant and Supervisor Agent offerings are now labeled legacy in Databricks' own FAQ, so new projects should start with Genie Agents.

Custom agents are written in code and deployed with the Agent Bricks CLI (`databricks-agentbricks`), which ships templates for LangGraph and the OpenAI Agents SDK and runs agents on Agent Runtime. Tracing and evaluation run through MLflow.

Databricks supports MCP in both directions. Managed MCP servers in the `system.ai` schema include a generally available Genie One server plus servers for Databricks SQL, web search, and external services such as Slack, GitHub, and Microsoft 365. External MCP servers can be registered as Unity Catalog MCP services, so agents discover and call them under the same grants as Databricks-native tools.

Unity Gateway (formerly Unity AI Gateway) provides governance across the stack, with access control, rate limits, budgets, service policies, and usage and audit logging for models, agents, and MCP tools.

## Microsoft Fabric

Microsoft's approach to data AI agents runs through two channels: Copilot in Fabric and Fabric data agents.

Copilot in Fabric is integrated into every Fabric workload. In notebooks, it generates, refactors, and validates code with awareness of workspace context, schemas, and runtime state. In the data warehouse, it converts natural language to SQL and suggests completions. In Power BI, it builds reports from a topic description and writes DAX queries. In Real-Time Intelligence, it generates KQL queries for log and event data.

Fabric data agents are a separate, configurable capability, now generally available. A data agent answers questions over up to five sources, including lakehouses, warehouses, Power BI semantic models, KQL databases, ontologies, and Microsoft Graph, by generating read-only SQL, DAX, or KQL with the user's own permissions. Data agents do not cover unstructured files such as PDFs. They integrate with Microsoft 365 Copilot, so insights can surface inside Microsoft 365 apps, and they can be called from Copilot Studio and Microsoft Foundry.

For MCP, a published Fabric data agent becomes a remote MCP server that exposes the agent as a single tool, so third-party AI assistants can query Fabric data through a standardized interface. Microsoft also offers the Fabric Core MCP server for workspace and item management, and the Fabric IQ ontology work gives agents a model of business entities and relationships across data sources.

The deeper play is Microsoft Foundry (formerly Azure AI Foundry). Foundry lets you build custom agents that orchestrate across Fabric data agents, Azure OpenAI, AI Search, and external MCP servers.

## AWS

AWS centers its agent tooling on Amazon Bedrock, which has evolved significantly through 2025 and 2026.

Amazon Bedrock Agents let you build generative AI applications that automate multi-step tasks. An agent receives a natural language request, breaks it into steps, calls the appropriate tools or APIs, and returns a result. Tools can be Lambda functions, data sources indexed by Knowledge Bases, or external APIs.

The bigger addition is Amazon Bedrock AgentCore, generally available since October 2025. AgentCore is a platform layer for building, connecting, and operating AI agents. It is framework-agnostic, so you can deploy agents built with any framework and any model, and its services cover runtime, gateway, identity, memory, and observability. AgentCore Gateway turns APIs and Lambda functions into agent tools and connects to existing MCP servers, which makes it the place where agents discover governed tools.

For business users, AWS offers Amazon Quick Suite, launched in October 2025 as the evolution of QuickSight. Quick Suite combines BI with research, flows, and automation agents, and it connects to tools through OpenAPI specifications or MCP servers.

For data access, AWS publishes open-source MCP servers, including the Amazon Redshift MCP Server and the AWS Data Processing MCP Server for Glue, EMR, and Athena, plus a managed AWS MCP Server that agents can use with analytics services such as Glue, Athena, and S3 Tables.

## Google Cloud

Google Cloud's agent story runs through Gemini Enterprise Agent Platform, the successor to Vertex AI. Vertex AI Agent Builder became part of it in April 2026, and Agent Engine was renamed Agent Runtime.

The platform provides a no-code agent builder, the code-based Agent Development Kit, and tool governance. You define agent behavior, connect tools, and deploy on Google's infrastructure. Tools include BigQuery, enterprise search, and APIs registered through the Cloud API Registry.

For analytics specifically, Google offers data agents built with the Conversational Analytics API, which reached general availability for BigQuery and Looker in 2026. A BigQuery data agent bundles table metadata, instructions, and golden queries, and Looker-based agents ground answers in Looker's semantic layer. Teams can publish these agents to Gemini Enterprise for business users.

The Cloud API Registry is a tool governance layer. It lets platform teams find and manage trusted MCP tools from Google, which addresses the operational problem of agent tool sprawl, where agents accumulate dozens of undocumented tool dependencies.

Google also runs a fully managed remote MCP server for BigQuery, enabled with the BigQuery API, that exposes SQL execution, dataset and table metadata, and BigQuery AI functions as MCP tools. Combined with Gemini's long-context window, this creates a usable pattern for analytical agents that iterate on SQL queries based on results.

## ClickHouse

ClickHouse took a pragmatic approach. Rather than building a proprietary agent framework first, it shipped an open-source MCP server and a broad set of integration guides.

The open-source ClickHouse MCP server, mcp-clickhouse, exposes three core tools: run_query, list_databases, and list_tables, plus an optional chDB tool. These are intentionally few, and queries run read-only by default. ClickHouse's philosophy is that agents should interact with the database through SQL, not through a layer of abstraction. The MCP server gives agents schema discovery and query execution, and the agents decide what to do with that capability.

ClickHouse's docs include integration guides for 15 AI agent libraries, including LangChain and LangGraph, LlamaIndex, CrewAI, DSPy, the OpenAI Agents SDK, the Claude Agent SDK, Microsoft Agent Framework, PydanticAI, and Chainlit. Each guide shows how to connect the framework to ClickHouse through MCP. This breadth of coverage reflects ClickHouse's position as an infrastructure layer that teams access through whatever agent framework they prefer.

The ClickHouse Agent Skills repository provides packaged instructions for AI coding agents, giving tools such as Claude Code and Cursor ClickHouse domain knowledge for schema design, query optimization, and data ingestion patterns.

In ClickHouse Cloud, the remote MCP server is managed by ClickHouse. You enable it per service, connect with OAuth or an API key, and every tool it exposes is read-only. You do not need to host it yourself.

## VeloDB and Apache Doris

VeloDB, the managed cloud platform powered by Apache Doris, positions itself as the analytics database for the agentic AI era.

Doris provides the Apache Doris MCP Server, written in Python. Version 1.0 supports the stateless MCP 2026-07-28 revision over Streamable HTTP and stdio, and it exposes read-only capabilities.

Rather than a flat list of tools, the 1.0 server groups 55 capabilities into eight domains that agents discover progressively: catalog, query, cluster, pipeline, search, governance, lakehouse, and semantic. Those domains cover SQL execution with explain and profiling, schema and table context, data freshness and lineage, audit, text and vector search, and optional semantic grounding through Apache Ossie models and MetricFlow.

Doris also supports vector search through native ANN vector indexes. This enables hybrid search patterns where agents combine structured SQL filters with semantic similarity. Doris has LLM SQL functions for summarization, sentiment analysis, classification, and entity extraction, all callable from standard SQL.

The Doris multi-catalog feature lets agents query data across MySQL, PostgreSQL, Iceberg, Hive, and S3 through a single MCP endpoint. This federated query capability is important for agents that need to reason across data silos without moving data.

VeloDB's AI observability story is also strong. The same engine that serves agent queries can ingest and analyze agent logs, traces, and performance metrics. Teams use Doris as the backend for agent monitoring dashboards.

## Spice AI

Spice AI takes a different approach from the large cloud vendors. Spice is an open-source SQL query, search, and LLM-inference engine, written in Rust on Apache DataFusion and Apache Arrow, designed to serve data to AI applications and agents.

Spice can run as a sidecar next to your agent, as a standalone service, or as a distributed cluster. It connects to your data sources, accelerates chosen datasets by keeping a local, continuously refreshed copy, and exposes SQL plus search. The key design decision is that Spice can sit close to the agent: queries on accelerated datasets return in milliseconds without loading the source systems.

Spice provides its own MCP server and an MCP gateway, making it discoverable by any MCP-compatible agent and letting it front external MCP servers through a single interface. As of Spice v2.3 it supports the stateless MCP 2026-07-28 revision while still answering clients that use the older handshake. This is useful when your agent needs data and tools from multiple sources that each provide their own MCP server.

The hybrid search capability combines SQL filtering with full-text search and vector similarity, with reciprocal rank fusion, in a single SQL query. Agents can ask questions that require both structured conditions and semantic matching.

Spice's acceleration layer materializes the datasets you choose in memory or on local disk and keeps them fresh with scheduled refreshes or change data capture. For agent workloads with repeated access patterns, this avoids hitting the source database for every query.

## Bauplan Labs

Bauplan is the most unusual entry on this list. It does not provide an AI agent. It provides infrastructure where AI agents build data pipelines safely.

The core concept is Git for data. Bauplan gives you isolated branches of your Iceberg tables, each with its own commit history. An AI coding agent like Claude Code creates a branch, runs Python or SQL pipelines against it, verifies the results, and merges back to main. If something goes wrong, you roll back or branch from a historical commit.

Bauplan Skills are the mechanism that makes this work. A Skill packages a workflow as instructions an AI coding agent loads, and Bauplan publishes them for assistants such as Claude Code, Codex, and Cursor. The Skills tell the agent how to interact with Bauplan's branch-based environment safely.

The published Skills cover data pipeline scaffolding, safe ingestion with quality gates, read-only data exploration, data assessment, data quality checks, debugging and fixing pipelines, table and column documentation, and SDK migration. The write-oriented Skills enforce the branch-run-verify-merge loop. Bauplan also runs a hosted MCP server for inspecting tables, running queries, and managing branches, commits, and jobs.

Bauplan's approach addresses a real problem. Coding agents are good at writing code. But data work is different from code work. Data is shared, does not have Git semantics, and downstream systems depend on it. Bauplan gives agents the safety rails to work on production data without breaking things.

## Qlik

Qlik entered the agent space with a focus on the analytics workflow from discovery through action.

Qlik Answers is the entry point. It combines structured analytics with unstructured content to provide contextual answers with follow-up reasoning. Answers draws on the Qlik Analytics Engine and on curated documents, with citations and explanations of its reasoning.

Qlik ships specialized agents alongside Answers. The Discovery Agent, generally available since February 2026, continuously scans Qlik Cloud apps for meaningful changes and surfaces prioritized insights. The Predict Agent builds ML models, generates predictions, and interprets results for forward-looking questions. The Automate Agent triggers workflows in downstream systems through natural language. The Analytics Agent supports analytics development tasks.

Qlik also provides an MCP server, generally available in Qlik Cloud since February 2026, that exposes its analytics capabilities to third-party AI assistants such as Claude, ChatGPT, and GitHub Copilot over OAuth. This lets existing assistants use Qlik's calculations and data models without migrating to Qlik's native interface.

The flow Qlik promotes is detect, investigate, predict, act. Data changes trigger the Discovery Agent, which passes signals to the Predict and Automate agents for action. This is a full agentic analytics pipeline inside a BI platform.

## How to Choose

The platforms break into three rough categories.

First are the full agent authoring platforms. Databricks with Agent Bricks, Snowflake with Cortex Agents, and AWS with Bedrock AgentCore let you build, deploy, and monitor custom agents that weave together data access and external tool calls. These are for teams that need to ship production agents with governance and observability out of the box.

Second are the data access layer platforms. Dremio, Spice AI, ClickHouse, and VeloDB with Apache Doris focus on making their query engines agent-accessible. They ship MCP servers and CLIs that let any agent discover and query data. These are for teams that already have an agent framework and need a reliable data connection layer.

Third are the workflow and analytics platforms. Microsoft Fabric, Qlik, Bauplan, and Google Cloud occupy different parts of this space. Fabric and Qlik embed agents into existing analytics workflows. Google provides agent tooling alongside BigQuery. Bauplan provides safety infrastructure for agent-driven data engineering.

Most teams will end up using platforms from multiple categories. A typical stack in 2026 might be Databricks for agent authoring, Dremio or Spice for multi-source data access, and Qlik for the analytics front end. The interoperability through MCP makes this practical in a way it was not two years ago.

## Tradeoffs and Limitations

Agentic data tooling is still immature in several areas.

Cost control is the biggest open problem. Agent queries are not like dashboard queries. An agent can issue dozens of exploratory queries before arriving at an answer, and each one consumes compute. Few platforms offer budget-aware query routing or cost caps on agent sessions.

Evaluation is another gap. Databricks and Snowflake provide basic agent evaluation through MLflow and Cortex tracing respectively. But there is no standard way to measure whether an agent answered a data question correctly. Most teams rely on manual spot checks.

Data quality is a hidden risk. An agent is only as good as the data it finds. If the catalog is poorly named, the schema is undocumented, or the data has known quality issues, the agent will produce confident but wrong answers. Semantic layers and data contracts help, but most organizations have not invested in these yet.

MCP interoperability is not as smooth as the marketing suggests. Every MCP server implements the protocol slightly differently, and in late 2026 servers are split between the handshake-era 2025-11-25 revision and the stateless 2026-07-28 revision. Tool naming conventions vary. Authentication models differ. A LangChain agent that works with ClickHouse MCP out of the box may need custom wiring for Dremio MCP. The protocol standardizes the transport, not the semantics.

Security models vary by implementation. Snowflake and Dremio enforce data access through their existing permission systems. Databricks uses Unity Catalog for governance. But not all MCP servers implement credential vending or scoped access. If you expose an unrestricted MCP endpoint, an agent can query anything it can reach.

## Frequently Asked Questions

### Which data platforms ship an MCP server in 2026?

All eleven platforms in this comparison offer one. Dremio, Snowflake, Databricks, ClickHouse Cloud, Google Cloud (BigQuery), Microsoft Fabric, Qlik, and Bauplan run hosted MCP endpoints, AWS pairs a managed AWS MCP Server with open-source servers for Redshift and its data processing services, and Apache Doris and Spice ship MCP servers you run yourself.

### What is the difference between Snowflake CoWork and Cortex Agents?

Cortex Agents is Snowflake's managed framework for building agents that plan, call tools such as Cortex Analyst and Cortex Search, and reflect on results. Snowflake CoWork, formerly Snowflake Intelligence, is the business-user assistant where people work with those agents, and CoCo, formerly Cortex Code, is the developer-facing coding agent.

### What replaced Databricks Knowledge Assistant and Supervisor Agent?

Databricks now labels Knowledge Assistant and Supervisor Agent as legacy offerings. Its docs point new low-code agents to Genie Agents and code-based agents to the Agent Bricks CLI, with Unity Gateway governing model and MCP traffic.

### How do AI agents connect to Dremio?

Dremio offers three paths: the built-in AI Agent in Dremio Cloud, a hosted MCP server in every Dremio Cloud project for clients such as Claude, ChatGPT, and Gemini, and the dremio-cli developer CLI for coding agents. Queries through all three respect the user's existing role-based and fine-grained access controls.

### Does Microsoft Fabric support MCP?

Yes. A published Fabric data agent becomes a remote MCP server that exposes the agent as a single tool, and Microsoft also offers the Fabric Core MCP server for workspace and item management. Fabric data agents are generally available and are read-only over OneLake sources.

## Conclusion

Data platform native AI agent tooling in 2026 means MCP servers, semantic layers, and agent authoring frameworks that understand data. The separation between data platforms and AI platforms is dissolving. If you are designing a data architecture today, you should assume that a significant fraction of queries in the next two years will come from AI agents, not human analysts.

Start with MCP compatibility as a baseline requirement for any data tool you evaluate. Then decide whether you need a full agent authoring platform or a data access layer for your existing agent framework. The right answer depends on how much control you need over agent behavior and how much you already have invested in your agent stack.

If you want to go deeper on these patterns and architectures, Alex Merced has written extensively on data platforms, AI agents, and modern data architecture. You can find his books at books.alexmerced.com.
