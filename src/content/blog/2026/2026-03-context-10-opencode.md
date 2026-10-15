---
title: "OpenCode Context Management: AGENTS.md, Agents, and MCP"
pubDatetime: 2026-03-07T18:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "OpenCode reads AGENTS.md (CLAUDE.md as fallback), config from opencode.json, MCP servers under the mcp key, and compacts long sessions with /compact or auto."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - opencode
slug: 2026-03-context-opencode
draft: false
canonicalURL: "https://datalakehousehub.com/blog/2026-03-context-management-opencode/"
faqs:
  - question: "Does OpenCode use AGENTS.md or CLAUDE.md?"
    answer: "OpenCode reads AGENTS.md: a project-root file for the repo and ~/.config/opencode/AGENTS.md for personal rules. It falls back to CLAUDE.md (project) and ~/.claude/CLAUDE.md only when the AGENTS.md equivalent is missing, and OPENCODE_DISABLE_CLAUDE_CODE=1 turns that fallback off. Run /init to generate or improve AGENTS.md."
  - question: "Where is the OpenCode config file?"
    answer: "Global settings live in ~/.config/opencode/opencode.json and project settings in opencode.json (or opencode.jsonc) at the project root. Configs merge, and later sources override earlier ones only for conflicting keys, so a project can override your defaults."
  - question: "How do I add an MCP server to OpenCode?"
    answer: "Add it under the mcp key in opencode.json. Local servers use type local with a command array and optional environment; remote servers use type remote with a url and optional headers or OAuth. opencode mcp list shows servers and auth status, and opencode mcp auth starts OAuth."
  - question: "How does OpenCode handle a full context window?"
    answer: "With compaction.auto (on by default), OpenCode compacts the session when context is full. You can run /compact (alias /summarize) yourself, enable compaction.prune to drop old tool outputs, and set compaction.reserved to keep a token buffer."
  - question: "What is the difference between OpenCode's Build and Plan agents?"
    answer: "Build is the default primary agent with all tools enabled. Plan is restricted for analysis: file edits and bash commands are set to ask by default. Press Tab to switch between them, and @-mention subagents such as general or explore for side tasks."
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/2026-03-context-management-opencode/).

OpenCode builds context from the conversation, files it inspects or that you attach, project instructions, enabled tools, and the selected model's limits. Good context management is therefore less about loading the entire repository and more about giving the agent durable rules plus a narrow, verifiable task.

**The short answer:** OpenCode loads durable instructions from `AGENTS.md` (project root, plus `~/.config/opencode/AGENTS.md` for personal rules), falling back to `CLAUDE.md` only when no `AGENTS.md` exists. Settings live in `opencode.json` or `opencode.jsonc`, merged from `~/.config/opencode/` and the project root. MCP servers go under the `mcp` key. You add files to a prompt with `@`, switch between the Build and Plan agents with Tab, and recover space with `/compact` or the default auto-compaction.

This guide was reviewed on October 15, 2026 against OpenCode's docs for [rules](https://opencode.ai/docs/rules/), [config](https://opencode.ai/docs/config/), [agents](https://opencode.ai/docs/agents/), the [TUI](https://opencode.ai/docs/tui/), and [MCP servers](https://opencode.ai/docs/mcp-servers/). OpenCode changes quickly, so confirm configuration details there before copying an example into production.

## The context layers

OpenCode context comes from five practical layers:

1. **Project instructions** describe commands, architecture, conventions, and boundaries.
2. **The current session** contains your prompts, tool results, and prior decisions.
3. **Repository files** are found through search or added deliberately.
4. **Tools and MCP servers** expose live systems and their tool descriptions.
5. **The selected model** determines the available context and behavior.

Keeping these layers distinct makes failures easier to diagnose. A coding-standard problem belongs in durable instructions; a one-off migration requirement belongs in the prompt; live ticket or database data belongs behind a constrained tool.

## Use the current configuration schema

OpenCode supports project configuration in `opencode.json` or `opencode.jsonc`. A minimal model selection looks like this:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",
}
```

Models use a `provider/model` format. The identifier above is an example, not a recommendation; select one your configured provider currently exposes. OpenCode merges configuration rather than replacing it: global settings in `~/.config/opencode/opencode.json` load first, a file named by `OPENCODE_CONFIG` loads next, and the project's `opencode.json` overrides both, but only for keys that conflict. A `small_model` setting picks a cheaper model for lightweight jobs such as title generation.

Use the official [configuration guide](https://opencode.ai/docs/config/) and schema as the source of truth. Older articles often show a singular `provider` object or obsolete model names; both can produce confusing failures on a current installation.

## Put durable behavior in instructions

Project instructions should answer questions the agent would otherwise rediscover:

- Which build, format, lint, and test commands are authoritative?
- Which directories are generated or off-limits?
- What architectural boundaries must changes preserve?
- What counts as complete verification?
- Which risky operations require explicit approval?

OpenCode reads a project-root `AGENTS.md`, which applies to that directory and its subdirectories, plus a personal `~/.config/opencode/AGENTS.md` for every session. If a project has no `AGENTS.md`, OpenCode falls back to `CLAUDE.md`, and to `~/.claude/CLAUDE.md` globally; set `OPENCODE_DISABLE_CLAUDE_CODE=1` to turn that off. Run `/init` to generate or improve the file, then commit it.

OpenCode does not follow `@file` references inside `AGENTS.md`. To pull in more files, list them in the `instructions` field, which accepts paths, globs, and remote URLs and combines them with `AGENTS.md`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "CONTRIBUTING.md",
    "docs/guidelines.md",
    ".cursor/rules/*.md",
  ],
}
```

Keep the top-level file short and route detailed guidance to nearby documents. See the current [rules documentation](https://opencode.ai/docs/rules/) for discovery and precedence behavior.

Avoid pasting an entire style guide into every prompt. Durable rules are easier to review in version control and leave more context for the actual task.

## Plan and build agents

OpenCode includes two primary agents. **Build** is the default and has all tools enabled. **Plan** is meant for analysis: file edits and bash commands are set to `ask` by default. Press Tab to cycle between primary agents. Two built-in subagents handle side tasks: **General** for multi-step research (it can change files) and **Explore**, a fast read-only agent for searching a codebase. Mention one with `@`, for example `@explore find where we validate user input`, so its search output stays out of your main session. Custom agents go in the `agent` key of `opencode.json` or as Markdown files in `.opencode/agents/` (project) or `~/.config/opencode/agents/` (global).

A useful workflow is:

1. Ask the plan agent to identify affected files, constraints, and tests.
2. Review the proposed boundary and correct mistaken assumptions.
3. Switch to a build-capable agent for implementation.
4. Inspect the diff and test results before accepting the change.

The distinction is a control boundary, not extra context capacity. Agent definitions, permissions, and model assignments are documented in the official [agents guide](https://opencode.ai/docs/agents/).

## Attach files deliberately

Start with the smallest useful set: the failing test, the implementation it covers, and the nearest instructions. Let repository search reveal imports and callers. This is usually more reliable than preloading a large directory whose irrelevant content competes for attention.

In the TUI, type `@` followed by part of a file name to fuzzy-search and attach that file's contents. Start a message with `!` to run a shell command and add its output to the conversation, which is a clean way to hand the agent an exact error.

For a bug, include the observed error and exact reproduction command. For a feature, include acceptance criteria and the public interface. For a review, ask for findings only so the agent does not silently turn diagnosis into implementation.

## Context compaction and session boundaries

Long sessions eventually accumulate superseded plans, noisy command output, and repeated file contents. OpenCode compacts the session automatically when context is full (`compaction.auto`, on by default). Run `/compact` (alias `/summarize`, keybind `ctrl+x c`) to do it yourself, turn on `compaction.prune` to drop old tool outputs, and set `compaction.reserved` to keep a token buffer so compaction itself does not overflow the window:

```jsonc
{
  "compaction": { "auto": true, "prune": true },
}
```

A summary cannot preserve every detail.

Before compaction, capture durable decisions in the repository or a short handoff note. Start a new session with `/new` when the objective changes materially, and use `/sessions` to return to an earlier one. A clean session with precise instructions is often better than carrying unrelated history forward.

## Model and provider selection

OpenCode supports multiple providers, but portability is not automatic. Models differ in tool use, context limits, latency, and pricing. Provider policies determine where prompts and code are processed and retained.

Configure providers according to the official [provider guide](https://opencode.ai/docs/providers/) and select models using the [model guide](https://opencode.ai/docs/models/). Confirm current identifiers with the client rather than copying a dated model name from a blog post.

For sensitive repositories, a local provider can reduce external transmission, but you still need to review local logs, MCP servers, shell access, and any remote dependencies. “Local model” does not make every connected tool local.

## MCP without context overload

MCP servers let OpenCode call external systems. Every enabled server can add tool descriptions to the agent's working context and expands what the agent can do.

Define servers under the `mcp` key in `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "my-local-mcp-server": {
      "type": "local",
      "command": ["npx", "-y", "my-mcp-command"],
      "enabled": true,
      "environment": { "MY_ENV_VAR": "my_env_var_value" },
    },
    "my-remote-mcp": {
      "type": "remote",
      "url": "https://my-mcp-server.com",
      "enabled": true,
      "headers": { "Authorization": "Bearer MY_API_KEY" },
    },
  },
}
```

`opencode mcp list` shows each server and its auth status, `opencode mcp auth <name>` runs OAuth, and `opencode mcp debug <name>` checks a connection. OpenCode's docs warn that some servers, such as the GitHub MCP server, can add enough tool definitions to exceed the context limit.

Enable only the servers required for the task (set `"enabled": false` on the rest). Prefer read-only or narrowly scoped credentials, and separate production access from development. Test a server independently before asking an agent to depend on it. The current configuration formats are in OpenCode's [MCP server documentation](https://opencode.ai/docs/mcp-servers/).

## Troubleshooting checklist

If OpenCode appears to ignore context:

1. Confirm the project configuration file is valid against the current schema.
2. Check which instruction file applies in the working directory.
3. Verify that the intended agent and model are active.
4. Make the acceptance criteria explicit in the prompt.
5. Attach the smallest decisive file or error output directly.
6. Disable unrelated MCP servers and retry in a fresh session.
7. Confirm that the provider exposes the configured model identifier.

If an agent repeatedly edits the wrong area, add a concrete boundary such as “Only modify `packages/api`; treat generated clients as read-only.” If it repeatedly runs the wrong command, put the canonical command in project instructions and remove contradictory documentation.

## Recommended project setup

A maintainable OpenCode-enabled repository has:

- a concise, version-controlled `AGENTS.md`;
- current build and test commands;
- scoped instructions near specialized packages when needed;
- an `opencode.jsonc` only for settings the project truly shares;
- least-privilege tools and credentials;
- automated checks that independently validate agent output.

The strongest context strategy is not maximum input. It is a small set of authoritative instructions, a well-bounded task, and verification that does not depend on the model's confidence.

## Frequently Asked Questions

### Does OpenCode use AGENTS.md or CLAUDE.md?

OpenCode reads AGENTS.md: a project-root file for the repo and ~/.config/opencode/AGENTS.md for personal rules. It falls back to CLAUDE.md (project) and ~/.claude/CLAUDE.md only when the AGENTS.md equivalent is missing, and OPENCODE_DISABLE_CLAUDE_CODE=1 turns that fallback off. Run /init to generate or improve AGENTS.md.

### Where is the OpenCode config file?

Global settings live in ~/.config/opencode/opencode.json and project settings in opencode.json (or opencode.jsonc) at the project root. Configs merge, and later sources override earlier ones only for conflicting keys, so a project can override your defaults.

### How do I add an MCP server to OpenCode?

Add it under the mcp key in opencode.json. Local servers use type local with a command array and optional environment; remote servers use type remote with a url and optional headers or OAuth. opencode mcp list shows servers and auth status, and opencode mcp auth starts OAuth.

### How does OpenCode handle a full context window?

With compaction.auto (on by default), OpenCode compacts the session when context is full. You can run /compact (alias /summarize) yourself, enable compaction.prune to drop old tool outputs, and set compaction.reserved to keep a token buffer.

### What is the difference between OpenCode's Build and Plan agents?

Build is the default primary agent with all tools enabled. Plan is restricted for analysis: file edits and bash commands are set to ask by default. Press Tab to switch between them, and @-mention subagents such as general or explore for side tasks.

## Go Deeper

To learn more about AI-assisted development and context management strategies, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
