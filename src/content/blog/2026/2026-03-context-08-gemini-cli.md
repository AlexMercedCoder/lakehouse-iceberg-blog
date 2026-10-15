---
title: "Gemini CLI Context Window: GEMINI.md, /memory, /compress"
pubDatetime: 2026-03-07T16:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "Gemini CLI uses Gemini models with a 1M-token context window. GEMINI.md files load as memory, /memory show displays them, and /compress summarizes long chats."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - gemini cli
slug: 2026-03-context-gemini-cli
draft: false
faqs:
  - question: "What is the Gemini CLI context window?"
    answer: "It depends on the model you select. The Gemini CLI README advertises a 1M-token context window for its Gemini 3 models, and current Gemini API models such as Gemini 3.8 Flash and Gemini 4 Argon list 1,048,576 tokens. Run `/model` to check the active model and `/stats` to see session usage."
  - question: "Where does Gemini CLI look for GEMINI.md files?"
    answer: "It loads the global `~/.gemini/GEMINI.md`, then GEMINI.md files in your workspace directories and their parent directories, and it also scans directories that tools access for more context files. All found files are concatenated and sent with every prompt."
  - question: "Does Gemini CLI support AGENTS.md?"
    answer: 'Yes, through configuration. Set `context.fileName` in `settings.json` to a list such as `["AGENTS.md", "GEMINI.md"]` and Gemini CLI loads both names.'
  - question: "How do I free up context in a long Gemini CLI session?"
    answer: "Run `/compress` to replace the chat history with a summary, or `/clear` to start a new session. Automatic compression follows the `model.compressionThreshold` setting, which defaults to 0.5. You can save a session first with `/chat save <tag>` and come back to it with `/chat resume <tag>`."
  - question: "Is Gemini CLI still available after the move to Antigravity CLI?"
    answer: "For some users. Since June 18, 2026, Gemini CLI no longer serves Google AI Pro, Ultra, or free individual accounts, which Google moved to Antigravity CLI. Organizations with Gemini Code Assist Standard or Enterprise licenses and users with paid Gemini API or Gemini Enterprise Agent Platform API keys can keep using it."
---

Gemini CLI is an open-source terminal agent powered by Gemini models that operates directly in your command line. It brings Google's AI capabilities into the environment where many developers already live, with a context management system built around hierarchical GEMINI.md files, memory commands, MCP server integration, and direct codebase interaction. Unlike web-based tools where context is managed through uploads and conversation, Gemini CLI assembles its context from your project structure, your instruction files, and the tools you connect to it.

This guide was reviewed on October 15, 2026 against the [Gemini CLI command reference](https://geminicli.com/docs/reference/commands/), the [GEMINI.md documentation](https://geminicli.com/docs/cli/gemini-md/), the [configuration reference](https://geminicli.com/docs/reference/configuration/), the [Gemini API model pages](https://ai.google.dev/gemini-api/docs/models), and Google's [Gemini CLI to Antigravity CLI transition post](https://developers.googleblog.com/en/an-important-update-transitioning-gemini-cli-to-antigravity-cli/). Product behavior changes, so treat those pages as the authority.

**The short answer:** Gemini CLI's README advertises a 1M-token context window for its Gemini 3 models, and current Gemini API models such as Gemini 3.8 Flash and Gemini 4 Argon list a 1,048,576-token window. Use `/model` to see or set the active model and `/stats` to see session token usage. GEMINI.md files are loaded as memory and sent with every prompt; `/memory show` displays the combined text, `/memory list` shows which files were loaded, and `/memory refresh` reloads them. When a conversation gets long, `/compress` replaces the chat history with a summary, and the CLI also compresses automatically based on the `model.compressionThreshold` setting (default `0.5`, the fraction of context use that triggers compression).

**Who can still use it:** on June 18, 2026, Google stopped serving Gemini CLI requests for Google AI Pro and Ultra subscribers and free individual users, and pointed them to Antigravity CLI. Organizations with Gemini Code Assist Standard or Enterprise licenses keep access, as does anyone running Gemini CLI with a paid Gemini API key or a Gemini Enterprise Agent Platform API key. If you moved to Antigravity, the [Antigravity context guide](/posts/2026-03-context-google-antigravity/) covers its rules and skills, and Antigravity still reads `GEMINI.md` and `AGENTS.md` files.

## How Gemini CLI Assembles Context

Gemini CLI builds its working context from multiple sources:

1. **Global GEMINI.md** (`~/.gemini/GEMINI.md`) - personal preferences that apply everywhere
2. **Workspace GEMINI.md files** (in your workspace directories and their parent directories) - project conventions
3. **Just-in-time GEMINI.md files** - when a tool reads a file or directory, the CLI also scans that location and its ancestors up to a trusted root for context files
4. **Memories you ask it to save** - facts the agent writes into Markdown memory files
5. **MCP server tools** - external data sources and capabilities
6. **The current codebase** - files, dependencies, project structure
7. **The conversation** - your prompts and responses in the current session

Gemini CLI concatenates every context file it finds and sends the result with each prompt. A subdirectory file adds to the project file rather than replacing it, so when two files disagree the model has to reconcile them. Keep instructions consistent across levels and put the narrow rules in the narrow files.

## GEMINI.md: Persistent Project Context

GEMINI.md is the foundational context mechanism. It is a Markdown file that Gemini CLI loads automatically and includes with every prompt.

### File Hierarchy

| Location                     | Scope              | Purpose                                      |
| ---------------------------- | ------------------ | -------------------------------------------- |
| `~/.gemini/GEMINI.md`        | All projects       | Personal coding style, universal preferences |
| `./GEMINI.md` (project root) | Current project    | Architecture, stack, conventions             |
| `./src/GEMINI.md`            | Specific directory | Module-specific patterns                     |

### Using AGENTS.md or Other File Names

The default context file name is `GEMINI.md`, but the `context.fileName` setting in `settings.json` accepts one name or a list. If your repository already has an `AGENTS.md` for other agents, add it to the list so Gemini CLI reads the same instructions:

```json
{
  "context": {
    "fileName": ["AGENTS.md", "GEMINI.md"]
  }
}
```

### What to Include

```markdown
# GEMINI.md

## Project: E-Commerce API

- Framework: Express.js on Node 22
- Database: PostgreSQL 16 with Drizzle ORM
- Testing: Vitest with supertest for API tests
- Deployment: Docker containers on Cloud Run

## Code Conventions

- Use ESM imports (no CommonJS require)
- All route handlers are async functions
- Error handling uses a centralized error middleware
- SQL migrations use Drizzle Kit

## Architecture

- Routes: src/routes/
- Services: src/services/ (business logic)
- Models: src/models/ (Drizzle schema)
- Middleware: src/middleware/
- Tests: tests/ (mirrors src/ structure)

## Do Not

- Do not use default exports
- Do not install packages without noting them
- Do not modify migration files after they have been applied
```

### Modular GEMINI.md Files

For complex projects, GEMINI.md files can import other Markdown files with `@path/to/file.md`, using relative or absolute paths. This keeps individual files focused while allowing the CLI to assemble comprehensive context:

```markdown
# GEMINI.md

See also:

- @docs/coding-standards.md
- @docs/api-conventions.md
- @docs/testing-strategy.md
```

### The /init Command

If you are starting a new project or onboarding Gemini CLI to an existing one, run `/init`. This command analyzes the current directory and generates a starting GEMINI.md file that typically captures:

- Detected frameworks and languages
- Project structure
- Build and test commands
- Basic conventions inferred from the code

Review and edit the generated file. The auto-detection is a starting point, not a finished product. Add your team's conventions, architectural decisions, and quality standards to make it comprehensive. The value of /init is that it saves you from writing the boilerplate sections (project type, folder structure, detected dependencies) so you can focus on the human-knowledge sections.

## Memory: Persistent Facts Across Sessions

In Gemini CLI, "memory" means the context files the CLI loads, plus any facts the agent saves for you. There is no separate memory database: the agent persists durable facts by editing Markdown files directly.

### Saving Memories

Ask in plain language:

```
Remember that we use the Google Python Style Guide for all Python code.
Remember that our PostgreSQL database runs on port 5433, not the default 5432.
```

The agent routes each fact by scope. Shared project instructions go into the repository's GEMINI.md files, private notes about a project go into a per-project private memory folder, and cross-project personal preferences go into the global `~/.gemini/GEMINI.md`. Because these are ordinary Markdown files, you can review and edit what was saved.

### Viewing Memories

```
/memory show
/memory list
```

`/memory show` displays the full concatenated memory that is sent to the model. `/memory list` shows the paths of the GEMINI.md files that were loaded.

### Refreshing Context

If you update GEMINI.md files outside of the current session, use:

```
/memory refresh
```

This rescans and reloads all GEMINI.md files without restarting the CLI.

### Memory Best Practices

- Use the global file for facts that are true across projects (your personal conventions)
- Use the project GEMINI.md for project-specific context
- Keep memories concise: "Use Ruff for Python linting" rather than a paragraph explaining why
- Review memories periodically with `/memory show` and delete outdated lines from the files

## Managing the Context Window During a Session

A long session fills the window with old turns and tool output. Gemini CLI gives you several controls:

- **`/compress`** replaces the chat context with a summary to save tokens.
- **`/stats`** shows usage statistics for the session, with `model` and `tools` subcommands for more detail.
- **`/clear`** clears the conversation context and starts a new session.
- **`/chat save <tag>`** and **`/chat resume <tag>`** checkpoint a conversation and return to it later (`/chat` is an alias for `/resume`, which also lets you browse saved sessions).
- **`/rewind`** steps back through conversation history and can revert chat, code, or both.
- **`/restore`** returns project files to their state before a tool ran, when checkpointing is enabled.

Automatic compression is controlled by `model.compressionThreshold` in `settings.json`, which defaults to `0.5`. Lower it if you want compression to start earlier in long sessions.

## Direct Context Injection with @

The `@` command lets you inject specific files or directories directly into a prompt:

```
@src/models/user.ts How should I add a preferences field to this model?
```

```
@src/routes/ Review all route handlers for consistent error handling
```

This is the most direct way to give Gemini CLI context about specific files. The `@` command reads from your local file system at the time you send the prompt, and git-ignored files are excluded by default.

### When to Use @

- When your question relates to specific files that Gemini CLI might not automatically discover
- When you want to ensure the agent reads the latest version of a file
- When you want to focus the agent on a particular section of the codebase

## MCP Server Support

Gemini CLI supports MCP through the `mcpServers` object in `settings.json`. MCP servers extend the CLI's capabilities by connecting it to external tools and data sources.

### Configuration

Put servers in the user file (`~/.gemini/settings.json`) or the project file (`.gemini/settings.json`), or add them with the `gemini mcp add` command:

```json
{
  "mcpServers": {
    "docs-search": {
      "command": "npx",
      "args": ["-y", "your-mcp-server-package"]
    },
    "postgres": {
      "httpUrl": "http://localhost:3001/mcp"
    },
    "custom-tool": {
      "command": "python",
      "args": ["./scripts/my-mcp-server.py"],
      "env": {
        "API_KEY": "${MY_API_KEY}"
      }
    }
  }
}
```

Note the environment variable expansion (`$MY_API_KEY` or `${MY_API_KEY}`), which lets you keep credentials out of configuration files.

### Transport Options

Gemini CLI supports three MCP transport mechanisms:

- **stdio:** The server runs as a local process, set with the `command` property (most common for development)
- **SSE (Server-Sent Events):** For remote servers using the `url` property
- **Streamable HTTP:** For HTTP-based servers using the `httpUrl` property

Use `/mcp` inside the CLI to list servers and their tools, or to reload, enable, or disable them.

### MCP Prompts as Slash Commands

MCP servers can expose predefined prompts as slash commands. If a connected server exposes a prompt named "analyze-performance," you can invoke it with `/analyze-performance` directly in the CLI.

### When to Use MCP

**Use MCP for:** Database access, GitHub integration, browser automation, accessing internal APIs, connecting to project management tools

**Skip MCP when:** The task is code-only and the files are already on your local system. Gemini CLI can read files and run terminal commands directly without MCP.

## Dynamic Shell Context

Gemini CLI can execute shell commands to gather real-time context. This means the agent can check the actual state of your system rather than relying on static descriptions. You can also run a command yourself by prefixing it with `!` (for example, `!git status`), or type `!` alone to toggle shell mode.

### Practical Use Cases

- **Check current Git state:** The agent can run `git status` or `git log` to understand what has changed recently, which branch you are on, and what commits are pending
- **Inspect running services:** Commands like `docker ps` or `kubectl get pods` give the agent visibility into your running infrastructure
- **Read live configuration:** The agent can check environment variables, read `.env` files, or inspect running process configurations
- **Verify test results:** Running your test suite and analyzing the output gives the agent concrete data about what is passing and what is failing

This dynamic context is especially valuable for debugging workflows, where the agent needs to understand both the code and the runtime environment.

## Automatic Codebase Exploration

Gemini CLI explores your project structure with tools that respect `.gitignore` and `.geminiignore` patterns by default. It will not waste context on `node_modules/`, `__pycache__/`, or build output that you ignore. It also picks up project type from configuration files (for example, finding `package.json` tells it this is a Node.js project).

This automatic exploration means you can ask broad questions like "What database does this project use?" and the agent will find the answer by scanning relevant configuration files. However, GEMINI.md files significantly improve results by providing context that cannot be inferred from code alone: team decisions, architectural rationale, and development philosophy.

## Choosing Gemini CLI vs. Other Terminal Agents

**Choose Gemini CLI over Claude Code when:** Your team standardizes on Gemini models through a paid Gemini API key or a Code Assist license, or you want MCP prompts exposed as slash commands.

**Choose Gemini CLI over OpenCode when:** You want a tool built and documented around Gemini models and Google Cloud authentication rather than a provider-agnostic agent.

**Choose Gemini CLI over Codex CLI when:** You prefer Gemini models and already manage project context in GEMINI.md files. Both tools are open source, so the choice is mostly about models and conventions.

**Consider Antigravity CLI instead when:** You are a Google AI Pro, Ultra, or free individual user, since Gemini CLI no longer serves those accounts.

## Thinking About the Right Level of Context

### For Quick Questions

Just ask. Gemini CLI can explore your codebase on its own:

```
What database ORM does this project use?
```

The CLI will scan your project files, find the relevant configuration, and answer.

### For Targeted Changes

Provide file references and constraints:

```
@src/services/auth.ts Add rate limiting to the login function.
Use express-rate-limit with a 100-request-per-minute window.
```

### For Large Features

Invest in GEMINI.md, set up relevant MCP servers, and use the multi-step approach: plan first, then implement. The `/plan` command switches to a read-only Plan Mode for this first step.

## External Documents: PDFs vs. Markdown

### Markdown Is Native

GEMINI.md files, saved memories, and context documents should all be Markdown. The format is native to Gemini CLI's context system.

### Convert PDFs You Rely On

If you have reference material in PDF form that the agent should use repeatedly, extract the relevant sections into Markdown files and place them in your project directory. This makes them accessible via @ references and GEMINI.md imports, keeps them diffable in Git, and avoids sending pages you do not need.

## Advanced Patterns

### The Context-Aware Shell Script

Create shell scripts that set up project context before launching Gemini CLI:

```bash
#!/bin/bash
# Start Gemini CLI with project-specific context
cd ~/projects/my-api
export DB_URL="postgresql://dev@localhost:5433/mydb"
gemini
```

This ensures the CLI starts in the right directory with the right environment variables, reducing context-switching overhead.

### The Exploration-First Pattern

Before starting a new feature:

```
Analyze the current authentication system.
Describe the flow from login to token validation.
Do not make any changes.
```

Review the analysis, correct any misunderstandings, and then proceed with the implementation task.

### The Automated Context Generation Pattern

Use the `/init` command periodically (or a custom script) to regenerate a draft GEMINI.md as the project evolves, then merge the useful parts into your maintained file. This keeps the context file synchronized with the actual state of the codebase.

## Common Mistakes

1. **No GEMINI.md.** Without it, the CLI starts with no project context. It can still explore your codebase, but it will make assumptions that may not match your conventions.

2. **Stale GEMINI.md.** A GEMINI.md that references frameworks or patterns you no longer use creates confusion. Update it when you make significant changes.

3. **Overloading memory.** Memory is for brief, stable facts. Do not try to store entire documents as saved memories.

4. **Adding unnecessary MCP servers.** Each connected server adds tools that the CLI must evaluate. Only connect servers you actively use.

5. **Not using @ for targeted questions.** Pointing Gemini CLI at specific files with @ produces more focused results than letting it search the entire project.

6. **Ignoring /init.** For new projects, /init generates a solid starting GEMINI.md in seconds. Review and refine it rather than writing from scratch.

7. **Forgetting to refresh after external edits.** If you edit GEMINI.md files in your text editor, run `/memory refresh` so the CLI picks up the changes immediately.

8. **Writing overly long GEMINI.md files.** Every loaded file is sent with every prompt. If a GEMINI.md exceeds a few hundred lines, consider splitting it into modular imported files or moving narrow rules into subdirectory files.

9. **Letting sessions run until they degrade.** Use `/compress` or start a fresh session with `/clear` when the conversation drifts, rather than carrying stale turns forward.

## Frequently Asked Questions

### What is the Gemini CLI context window?

It depends on the model you select. The Gemini CLI README advertises a 1M-token context window for its Gemini 3 models, and current Gemini API models such as Gemini 3.8 Flash and Gemini 4 Argon list 1,048,576 tokens. Run `/model` to check the active model and `/stats` to see session usage.

### Where does Gemini CLI look for GEMINI.md files?

It loads the global `~/.gemini/GEMINI.md`, then GEMINI.md files in your workspace directories and their parent directories, and it also scans directories that tools access for more context files. All found files are concatenated and sent with every prompt.

### Does Gemini CLI support AGENTS.md?

Yes, through configuration. Set `context.fileName` in `settings.json` to a list such as `["AGENTS.md", "GEMINI.md"]` and Gemini CLI loads both names.

### How do I free up context in a long Gemini CLI session?

Run `/compress` to replace the chat history with a summary, or `/clear` to start a new session. Automatic compression follows the `model.compressionThreshold` setting, which defaults to 0.5. You can save a session first with `/chat save <tag>` and come back to it with `/chat resume <tag>`.

### Is Gemini CLI still available after the move to Antigravity CLI?

For some users. Since June 18, 2026, Gemini CLI no longer serves Google AI Pro, Ultra, or free individual accounts, which Google moved to Antigravity CLI. Organizations with Gemini Code Assist Standard or Enterprise licenses and users with paid Gemini API or Gemini Enterprise Agent Platform API keys can keep using it.

## Go Deeper

To learn more about working effectively with AI coding agents and context management strategies, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
