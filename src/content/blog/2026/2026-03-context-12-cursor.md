---
title: "Cursor Context Management: Rules, AGENTS.md, and MCP"
pubDatetime: 2026-03-07T20:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "Cursor builds context from .cursor/rules (.mdc), AGENTS.md, @-mentions, local Instant Grep search, and MCP servers in .cursor/mcp.json. How to tune each one."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - cursor
slug: 2026-03-context-cursor
draft: false
canonicalURL: "https://datalakehousehub.com/blog/2026-03-context-management-cursor/"
faqs:
  - question: "Where do Cursor project rules go?"
    answer: "Put them in .cursor/rules/ as .mdc files with frontmatter (description, globs, alwaysApply). A plain .md file in that folder is ignored by the rules system; if you want plain Markdown, use AGENTS.md instead. Cursor recommends keeping each rule under 500 lines."
  - question: "Does Cursor support AGENTS.md?"
    answer: "Yes. Cursor reads AGENTS.md in the project root and in subdirectories. Nested files combine with their parents, and the more specific file wins for work inside that directory."
  - question: "Where is the Cursor MCP config file?"
    answer: "Use .cursor/mcp.json in a project for project-specific servers and ~/.cursor/mcp.json for servers available everywhere. Servers go under an mcpServers key; you can also install and toggle servers from the Customize page."
  - question: "Does Cursor index my codebase with embeddings?"
    answer: "Cursor's current docs describe Instant Grep, a search index built and queried on your machine. Cursor says it does not upload file paths or code to build that index and does not store embeddings of your codebase for search. Agent can also spawn an Explore subagent that searches in its own context window."
  - question: "How do I give Cursor more context than the default window?"
    answer: "Max Mode extends a model's context window, but Cursor now offers it only on legacy request-based plans, billed at the model's API rate plus 20%. On current plans, keep context focused with @-mentions, scoped rules, .cursorignore, and fresh chats."
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/2026-03-context-management-cursor/).

Cursor assembles context from your prompt, open or attached files, indexed code, project rules, conversation history, enabled tools, and the selected model. Reliable results come from making each source intentional, not from trying to place an entire repository in one prompt.

**The short answer:** Cursor's durable context comes from project rules in `.cursor/rules/` (`.mdc` files only), `AGENTS.md` files in the root or any subdirectory, and user or team rules. Per-task context comes from `@` mentions (files, folders, terminals, past chats, git diffs, the built-in browser) and from Agent's own search, which uses a local Instant Grep index and an Explore subagent. External tools come from MCP servers in `.cursor/mcp.json` or `~/.cursor/mcp.json`. Exclude noise with `.cursorignore` on top of `.gitignore`.

This guide was reviewed on October 15, 2026 against Cursor's docs for [rules](https://cursor.com/docs/rules), [search](https://cursor.com/docs/agent/tools/search), [@ mentions](https://cursor.com/help/customization/context), [ignore files](https://cursor.com/help/customization/ignore-files), and [MCP](https://cursor.com/docs/mcp). Cursor's interface and model catalog change frequently, so follow those links for current labels and limits.

## Start with project rules

Version-controlled rules give Cursor durable instructions about a repository. Put project rules under `.cursor/rules/` as `.mdc` files and keep each rule focused on a specific concern such as API conventions, database migrations, or test requirements. The extension matters: a plain `.md` file in `.cursor/rules/` is ignored because it has no frontmatter.

Each rule's frontmatter decides when it loads:

- **Always Apply** (`alwaysApply: true`): included in every chat session
- **Apply Intelligently** (`description`): Agent includes it when the description matches the task
- **Apply to Specific Files** (`globs`): included when a matching file is in context
- **Apply Manually**: included only when you @-mention the rule

If you prefer plain Markdown, use `AGENTS.md`. Cursor reads it in the project root and in subdirectories, combining nested files with their parents so the more specific instructions win. User rules (set in Customize > Rules) apply across projects in Agent, and Team and Enterprise plans can enforce team rules from the dashboard. When guidance conflicts, team rules win over project rules, which win over user rules.

A useful rule explains:

- where it applies;
- what the agent must or must not do;
- which command verifies the result;
- which generated or sensitive paths are off-limits.

Prefer a concrete instruction such as “Run `npm test -- workspace-api` after changing `packages/api`” over “write high-quality tests.” Cursor documents current rule types, metadata, and compatibility behavior in its [rules guide](https://cursor.com/docs/rules).

## Keep rules small and composable

One large rules file becomes expensive to load and hard to maintain; Cursor recommends keeping each rule under 500 lines. Split guidance by responsibility and scope it to the files that need it. Put detailed architectural background in normal documentation, then have the rule point to that source when relevant.

Review rules like code. Remove stale commands and conflicting instructions, because an agent cannot reliably infer which obsolete rule the team intended to ignore.

## Understand how Cursor searches your code

Cursor's Agent finds code with its own search tools rather than placing every file into the prompt. Its current docs describe Instant Grep, a regex-capable search index that Cursor builds and queries on your machine; Cursor states that it does not upload file paths or code to build that index and does not store embeddings of your codebase for search. For broad questions, Agent can spawn an Explore subagent that runs many searches in its own context window and returns only a summary, which keeps the main conversation lean.

Search improves discovery, but it does not guarantee that every dependency or runtime behavior is present in a given response. Keep secrets, build output, large data files, and dependencies out of reach: Cursor respects `.gitignore` and already skips `.env` files, `.git/`, and lock files, and a `.cursorignore` file adds further exclusions. Note that terminal commands and MCP tools run outside those file controls.

## Attach decisive context

For a focused task, include the smallest evidence that determines correctness:

1. the failing command and its exact output;
2. the implementation and nearest tests;
3. the public contract or acceptance criteria;
4. any repository rule that constrains the change.

Type `@` in the chat input to attach context directly: files and folders (`@auth.ts`, `@src/components/`), `@Terminals` for terminal output, `@Chats` for a previous conversation, `@Commit (Diff of Working State)` or `@Branch (Diff with Main)` for git changes, and `@Browser` for the built-in browser.

Use explicit file references when you already know the relevant surface. Let Agent search (or ask it to use a subagent) when you need it to trace callers, implementations, or related tests. Broad context is helpful for discovery; direct attachments are better for facts that must not be missed.

## Separate planning, editing, and review

Ask the agent to plan when the affected surface is uncertain. Ask it to edit only after the boundaries are clear. Then review the resulting diff and test output as separate evidence.

A good implementation prompt includes the goal, allowed scope, behavior that must remain unchanged, and completion checks. A good review prompt asks for findings without authorizing edits. This prevents a diagnostic request from turning into an unexpected rewrite.

## Manage long conversations

Long chats accumulate outdated assumptions and repetitive tool output. Record durable decisions in the repository, then start a fresh conversation when the objective changes. If a session is summarized, restate non-negotiable acceptance criteria and reattach the decisive files.

Do not use conversation history as the only record of an architectural decision. A short ADR, issue, or project rule is reviewable by both people and tools.

## Choose models by task, not headline limits

Cursor's available models and modes can change by plan and release. A larger advertised context window does not mean the application sends the entire repository, and it does not guarantee better retrieval.

Use a capable reasoning model for unfamiliar architecture or difficult debugging. Use a faster model for constrained edits and mechanical transformations. Check Cursor's current [models and pricing page](https://cursor.com/docs/models-and-pricing) instead of hard-coding model names, prices, or token limits into team guidance.

Max Mode, which extends a model's context window beyond its default, is now available only on legacy request-based plans and is billed at the model's API rate plus 20%. On current plans, the better lever is tighter context, not a bigger window.

## Add MCP tools sparingly

MCP servers can expose documentation, tickets, databases, and other systems to Cursor. They also add tool descriptions to context and expand the agent's authority.

Install official servers with one click from **Customize**, or define them yourself in `mcp.json`: `.cursor/mcp.json` in a project for project-specific tools, or `~/.cursor/mcp.json` for tools available everywhere.

```json
{
  "mcpServers": {
    "local-tool": {
      "command": "npx",
      "args": ["-y", "@company/mcp-server"],
      "env": { "API_KEY": "${env:MY_API_KEY}" }
    },
    "remote-tool": {
      "url": "https://mcp.example.com/mcp",
      "headers": { "Authorization": "Bearer ${env:REMOTE_TOKEN}" }
    }
  }
}
```

Cursor resolves `${env:NAME}`, `${workspaceFolder}`, and `${userHome}` in `command`, `args`, `env`, `url`, and `headers`, so secrets stay out of the file. By default it asks for approval before running MCP tools.

Enable only what a workflow requires, use least-privilege credentials, and prefer read-only tools for analysis. Never assume that a local editor makes a remote MCP server private. Cursor's current setup options are documented in the [MCP guide](https://cursor.com/docs/mcp).

## Troubleshooting checklist

When Cursor misses relevant context:

1. Confirm the correct repository and branch are open.
2. Check `.gitignore` and `.cursorignore` exclusions.
3. Verify that the applicable `.cursor/rules/` files use the `.mdc` extension, are valid, and do not conflict with `AGENTS.md`.
4. Attach the decisive file or error directly.
5. State the expected behavior and verification command.
6. Disable unrelated MCP servers or tools.
7. Retry in a fresh conversation if old assumptions dominate the session.

When the agent changes too much, narrow the prompt to named directories and prohibit incidental refactors. When it claims success without evidence, require the exact command and output that define completion.

## Recommended repository baseline

A team-ready Cursor setup usually includes:

- small, scoped `.mdc` rules in `.cursor/rules/` or an `AGENTS.md`;
- a documented build, format, lint, and test workflow;
- sensible `.cursorignore` exclusions;
- least-privilege MCP connections;
- branch protection and automated checks independent of the agent;
- a review process for rule and tool changes.

The goal is not to maximize how much Cursor sees. The goal is to make the authoritative context easy to retrieve and the result easy to verify.

## Frequently Asked Questions

### Where do Cursor project rules go?

Put them in .cursor/rules/ as .mdc files with frontmatter (description, globs, alwaysApply). A plain .md file in that folder is ignored by the rules system; if you want plain Markdown, use AGENTS.md instead. Cursor recommends keeping each rule under 500 lines.

### Does Cursor support AGENTS.md?

Yes. Cursor reads AGENTS.md in the project root and in subdirectories. Nested files combine with their parents, and the more specific file wins for work inside that directory.

### Where is the Cursor MCP config file?

Use .cursor/mcp.json in a project for project-specific servers and ~/.cursor/mcp.json for servers available everywhere. Servers go under an mcpServers key; you can also install and toggle servers from the Customize page.

### Does Cursor index my codebase with embeddings?

Cursor's current docs describe Instant Grep, a search index built and queried on your machine. Cursor says it does not upload file paths or code to build that index and does not store embeddings of your codebase for search. Agent can also spawn an Explore subagent that searches in its own context window.

### How do I give Cursor more context than the default window?

Max Mode extends a model's context window, but Cursor now offers it only on legacy request-based plans, billed at the model's API rate plus 20%. On current plans, keep context focused with @-mentions, scoped rules, .cursorignore, and fresh chats.

## Go Deeper

To learn more about AI-assisted development and context management strategies, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
