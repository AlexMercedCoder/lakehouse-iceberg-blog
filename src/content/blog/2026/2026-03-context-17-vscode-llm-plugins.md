---
title: "VS Code AI Context: Copilot, AGENTS.md, MCP, Cline, Continue"
pubDatetime: 2026-03-07T09:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "VS Code Copilot reads copilot-instructions.md and AGENTS.md, loads MCP from .vscode/mcp.json, and compacts long chats. Cline and Continue add their own rules."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - vscode llm plugins
slug: 2026-03-context-vscode-llm-plugins
draft: false
faqs:
  - question: "Does GitHub Copilot in VS Code read AGENTS.md?"
    answer: "Yes. VS Code accepts either .github/copilot-instructions.md or AGENTS.md as project instructions, controlled by the chat.useAgentsMdFile setting. Nested AGENTS.md files in subfolders are an experimental opt-in through chat.useNestedAgentsMdFiles."
  - question: "Where do I configure MCP servers in VS Code?"
    answer: "Put workspace servers in .vscode/mcp.json under a top-level servers key, or user-wide servers in your profile's mcp.json (MCP: Open User Configuration). You can also run MCP: Add Server from the Command Palette or install servers from the Extensions view by searching @mcp."
  - question: "What is the difference between Copilot custom instructions and prompt files?"
    answer: "Custom instructions (.github/copilot-instructions.md, AGENTS.md, and .github/instructions/*.instructions.md) apply automatically to chat requests. Prompt files (.github/prompts/*.prompt.md) are reusable tasks you run on demand by typing / and the prompt name."
  - question: "How do Cline and Continue store project rules?"
    answer: "Cline reads a .clinerules/ or .cline/rules/ folder plus AGENTS.md, and detects existing .cursorrules and .windsurfrules files. Continue reads Markdown rules from a .continue/rules/ folder and uses config.yaml for models and MCP servers."
  - question: "Are Roo Code and Cody still available for VS Code?"
    answer: "Roo Code's maintainers shut the extension down on May 15, 2026 and point users to Cline or the ZooCode fork. Sourcegraph ended Cody Free and Pro on July 23, 2025; Cody continues only for Enterprise customers, and individuals were directed to Amp."
---

Visual Studio Code is the most widely used code editor in the world, and its extensibility means you can integrate AI capabilities through a growing ecosystem of LLM plugins. Unlike purpose-built AI editors (Cursor, Windsurf, Zed), VS Code gives you the freedom to choose and combine AI extensions, configure them to your preferences, and even switch between providers without changing editors. The tradeoff is that context management takes more deliberate configuration than in dedicated AI editors.

**The short answer:** GitHub Copilot in VS Code reads project instructions from `.github/copilot-instructions.md` or `AGENTS.md`, targeted rules from `.github/instructions/*.instructions.md`, and reusable prompts from `.github/prompts/*.prompt.md` (run with `/name`). MCP servers go in `.vscode/mcp.json` under a `servers` key, or you can run **MCP: Add Server**. Long chats compact automatically, and `/compact` does it on demand. Among third-party extensions, Cline reads `.clinerules/` and `AGENTS.md`, Continue reads `.continue/rules/`, Roo Code shut down in May 2026, and Cody is now Enterprise-only.

This guide was reviewed on October 15, 2026 against the VS Code docs for [custom instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions), [prompt files](https://code.visualstudio.com/docs/agent-customization/prompt-files), and [MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers), plus the [Cline rules docs](https://docs.cline.bot/customization/cline-rules) and [Continue rules docs](https://docs.continue.dev/customize/deep-dives/rules). Extension features change quickly, so treat those pages as the authority.

This guide covers context management strategies for the most popular VS Code AI extensions: GitHub Copilot, Continue, Cline, Aider, and others. It explains what context management capabilities each offers and how to configure them.

## The VS Code AI Extension Options

VS Code's AI extension ecosystem falls into several categories:

| Category              | Extensions                              | Approach                                |
| --------------------- | --------------------------------------- | --------------------------------------- |
| **Inline completion** | GitHub Copilot, Continue                | Suggest code as you type                |
| **Chat and agents**   | Copilot Chat, Continue, Cline           | Conversational AI and autonomous agents |
| **Terminal-based**    | Aider                                   | Git-aware edits driven from a terminal  |
| **Enterprise-only**   | Cody (Sourcegraph Enterprise customers) | Chat with Sourcegraph code search       |

Two extensions from earlier versions of this list have changed status. Sourcegraph ended Cody Free and Pro on July 23, 2025 and now points individual developers to Amp; Cody continues only for Enterprise. Roo Code's maintainers shut the extension down on May 15, 2026 and recommend Cline or the community fork ZooCode. Supermaven was sunset in November 2025 after its acquisition by Cursor.

Each category manages context differently. Inline completion uses the current file and nearby tabs. Chat uses conversation history and explicit references. Agents have the broadest context, reading the codebase, running commands, and making multi-file changes.

## GitHub Copilot: Context Management

GitHub Copilot is the most widely used AI coding assistant, and in VS Code it now covers inline suggestions, chat, and agents.

### Inline Completions

Copilot's inline suggestions draw mostly on:

- The current file content (especially the lines around your cursor)
- Open tabs in the editor (nearby files provide additional context)
- Comment and docstring context (comments above your cursor guide suggestions)

**Tip:** Keep related files open in tabs. Having related source files, type definitions, and tests open improves suggestion quality.

### Copilot Chat Context

In the Chat view you add context explicitly:

- Type `#` to pick files, folders, symbols, and tools; `#codebase` tells the model to search the whole workspace, and `#fetch` pulls in a web page
- Select **Add Context** to choose Files & Folders, Symbols, an Issue, or a Pull Request
- Drag files or folders from the Explorer, Search, or editor tabs into the chat
- Attach images such as screenshots or UI sketches
- Use chat participants like `@vscode` and `@terminal` for questions about those domains

### Agents: Ask, Plan, and Agent

The chat agent picker controls how much the model does on its own. **Ask** explains code without changing it. **Plan** researches and drafts a plan for a complex change before implementation. **Agent** plans multi-step changes, reads and writes files, runs terminal commands, and iterates until the task is done. Agent sessions use the broadest context of any Copilot feature.

### Context Window and Compaction

A context window control in the chat input shows how full the conversation is, with a token breakdown on hover. When a chat nears the limit, VS Code automatically compacts older turns into a summary. Type `/compact` (optionally with guidance such as `/compact focus on the database schema decisions`) to do it yourself, or start a new session for a clean slate.

### Custom Instructions for Copilot

Create a `.github/copilot-instructions.md` file in your project root, or use `AGENTS.md` (controlled by the `chat.useAgentsMdFile` setting; nested `AGENTS.md` files in subfolders are an experimental opt-in through `chat.useNestedAgentsMdFiles`):

```markdown
# Copilot Instructions

## Code Style

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use named exports, not default exports
- Follow the Airbnb ESLint configuration

## Testing

- Write tests using Vitest
- Use React Testing Library for component tests
- Mock API calls with MSW

## Architecture

- Components go in src/components/
- API clients go in src/api/
- Shared types go in src/types/
```

These instructions apply to every chat request in the project, functioning like `.cursor/rules/` in Cursor. For rules that only apply to some files, add `.github/instructions/<name>.instructions.md` files. Personal, cross-project guidance can live in `~/.copilot/copilot-instructions.md`. VS Code can also read `CLAUDE.md` when `chat.useClaudeMdFile` is enabled.

### Prompt Files

Reusable prompts go in `.github/prompts/<name>.prompt.md`. Type `/` plus the name in chat to run one. Frontmatter can set `description`, `agent` (`ask`, `agent`, `plan`, or a custom agent), `model`, and `tools`, including MCP tools.

## Continue: Open-Source AI Extension

Continue is an open-source extension that supports multiple LLM providers, local models, and agent mode.

### Configuration

Continue's current configuration format is `config.yaml`; the older `config.json` format is deprecated. Models, rules, and MCP servers are all declared there or in separate files under `.continue/`.

### Rules

Add project rules as Markdown files in a `.continue/rules/` folder at the root of your project. Agent mode can also create rules there for you. Commit the folder so the whole team gets the same guidance.

### Context Providers

Continue's @-mention context providers let you add files and other sources to a message. Check the current context provider reference before relying on a specific one: Continue's docs now mark `@Codebase` and `@Docs` as deprecated.

### MCP

Add MCP servers under `mcpServers` in your config, or drop one file per server into `.continue/mcpServers/`. That folder accepts YAML, and JSON MCP configs copied from Claude Desktop, Cursor, or Cline also work. MCP tools are only available in agent mode.

### Why Continue Stands Out for Context

Continue's open-source nature means you can inspect exactly how context is assembled, and its file-based rules and MCP folders are easy to version alongside your code.

## Cline: Agentic Coding Agent

Cline is a VS Code extension that turns a model of your choice into an autonomous coding agent within the editor.

### Context Capabilities

Cline has one of the broadest context scopes among VS Code extensions:

- Reads and writes files across the entire project
- Runs terminal commands
- Browses the web (for documentation lookup)
- Uses subagents with separate context windows for research
- Manages its own task history with checkpoints

### Project Instructions

Put workspace rules in a `.clinerules/` (or `.cline/rules/`) folder at your project root. Global rules live in `~/Documents/Cline/Rules`. Cline also reads `AGENTS.md` in the workspace and `~/.agents/AGENTS.md` globally, and it detects existing `.cursorrules` and `.windsurfrules` files so you can toggle them in the Rules panel. A rule with `paths` frontmatter applies only to matching files.

```markdown
# Project: SaaS Application

## Stack

- Python 3.12 with FastAPI
- PostgreSQL with SQLAlchemy
- Redis for caching
- React frontend with TypeScript

## Build Commands

- Backend: `uvicorn app.main:app --reload`
- Frontend: `npm run dev`
- Tests: `pytest -v`

## Conventions

- All API responses use the ResponseModel pattern
- Database sessions are managed by dependency injection
- Frontend state uses React Query for server state
```

### Custom MCP Servers

Open the MCP Servers icon in the Cline panel toolbar, go to the Configure tab, and click **Configure MCP Servers** to edit the settings JSON. Servers go under `mcpServers`.

### Context Window Management

Cline's Auto Compact summarizes the conversation as it nears the model's limit, keeping technical details and decisions while dropping raw history. `/smol` (alias `/compact`) does this on demand, and `/newtask` starts a fresh task seeded with a summary of the plan and progress.

## Aider: Git-Aware AI Pair Programmer

Aider runs in a terminal (including VS Code's integrated terminal) and focuses on Git-aware code modifications.

### Context Management in Aider

Aider uses a distinctive context model:

- **Chat files:** Files actively being discussed and modified
- **Read-only files:** Files included as reference context only
- **Repository map:** An overview of the entire repository structure that fits in context

### Commands for Context Control

```
/add src/auth/middleware.ts         # Add to chat context (can be edited)
/read-only docs/architecture.md     # Add as read-only context
/drop src/auth/middleware.ts        # Remove from context to free space
/map                                # Show the repository map
/tokens                             # Report tokens used by the current context
```

### The Repository Map

Aider's repository map is a compressed representation of your codebase (file names, function signatures, class definitions) that fits within the context window. This gives the AI a bird's-eye view of the project without consuming the entire context budget.

## Thinking About Context Levels Across Extensions

### Minimal Context (Quick Completions)

For inline code completions, Copilot works well with minimal setup. Keep related files open in tabs and let the extension use the editor context.

### Moderate Context (Feature Development)

Use chat (Copilot Chat, Continue) with explicit references. `#` mentions in Copilot and @-mentions in Continue let you include exactly the files relevant to the current task.

### Comprehensive Context (Major Refactoring)

Use an agent (Copilot's Agent, Cline) that can explore the codebase, run tests, and make changes across multiple files. Configure project instructions (`AGENTS.md`, `.github/copilot-instructions.md`, `.clinerules/`, `.continue/rules/`) so the agent follows your conventions.

## External Documents: PDFs vs. Markdown

### Markdown Is Universal

All VS Code AI extensions work natively with Markdown. Project instructions, coding standards, and architecture documents should be Markdown files in your repository.

### PDFs

Most VS Code extensions do not parse PDFs directly. If you have reference material in PDF form, extract relevant sections into Markdown files. Copilot's `#fetch` and Cline's web browsing can pull online documentation, reducing the need for local conversion.

### Documentation Access

Rather than relying on a docs index, point the agent at the source: `#fetch` a documentation page in Copilot, let Cline browse it, or connect a documentation MCP server that all your tools can share.

## MCP Server Support

MCP support varies by extension:

| Extension    | MCP Support  | Configuration                                                  |
| ------------ | ------------ | -------------------------------------------------------------- |
| **Copilot**  | Yes          | `.vscode/mcp.json` (`servers` key) or user `mcp.json`          |
| **Cline**    | Yes          | MCP Servers panel, `mcpServers` in its settings JSON           |
| **Continue** | Yes          | `mcpServers` in config or `.continue/mcpServers/` (agent mode) |
| **Aider**    | Not built in | Use its own commands and the terminal instead                  |

For Copilot, a workspace `.vscode/mcp.json` looks like this:

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp"
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@microsoft/mcp-server-playwright"]
    }
  }
}
```

Note the key: VS Code's own format uses `servers`, while Cline, Continue, and the portable `.mcp.json` file use `mcpServers`. Use `${input:...}` variables or an env file rather than hardcoding API keys.

## settings.json: Centralizing AI Configuration

VS Code's `settings.json` is where Copilot and many extensions read their configuration.

### Per-Workspace Settings

Create a `.vscode/settings.json` file in your project to configure AI behavior per project:

```json
{
  "github.copilot.enable": {
    "markdown": true,
    "plaintext": false
  },
  "chat.useAgentsMdFile": true
}
```

Per-workspace settings override user-level settings, allowing you to tailor AI behavior to each project's needs.

### Workspace Trust and Security

VS Code's Workspace Trust feature is important when using AI extensions. In untrusted workspaces, some extensions may limit their capabilities (for example, restricting file access or command execution). This is a security feature: it prevents untrusted code from being automatically processed by AI tools that have file system access.

For your own projects, trust the workspace to enable full AI capabilities. For third-party codebases, consider the implications before trusting.

## When to Use VS Code with Plugins vs. Dedicated AI Editors

**Choose VS Code with plugins when:**

- You already use VS Code and want to add AI incrementally
- You want to mix and match extensions from different providers
- You have existing VS Code extensions and workflows you cannot replicate elsewhere
- You need the specific capabilities of an extension such as Cline
- Your team uses different AI providers and needs a common editor

**Choose a dedicated AI editor (Cursor, Devin Desktop, Zed) when:**

- You want AI features designed into the editor from the start
- You prefer automatic codebase indexing over manual context management
- You are starting fresh and do not have an existing VS Code extension stack

**Choose a terminal agent (Claude Code, Gemini CLI, Codex) when:**

- Your workflow is terminal-centric
- You need direct shell command execution as your primary interaction
- You prefer a focused, distraction-free coding experience

## Advanced Patterns

### The Multi-Extension Stack

Use multiple extensions for different purposes:

- **Copilot** for inline completions and quick chat
- **Continue** for chat with models you host or choose yourself
- **Cline** for agentic tasks (multi-file changes, complex features)

Each extension handles a different level of context and interaction.

### The Consistent Instructions Pattern

Keep one `AGENTS.md` in your project root as the source of truth. Copilot and Cline both read it directly. For tools that need their own location, keep a short pointer file:

- `.github/copilot-instructions.md` only if you need Copilot-specific additions
- `.continue/rules/` with a rule that summarizes or mirrors AGENTS.md
- `.clinerules/` only for Cline-specific behavior

This ensures consistent behavior regardless of which extension handles the task.

### The Provider Rotation Pattern

Use different providers for different extensions:

- Copilot: GitHub's hosted models
- Continue: a direct API key for the provider you prefer
- Cline: a local model for sensitive code

This gives you the benefits of multiple providers within a single editor.

## Common Mistakes

1. **Using too many AI extensions simultaneously.** Running five AI extensions creates conflicts, performance overhead, and conflicting suggestions. Pick a primary stack and disable the rest.

2. **Not configuring project instructions.** Every AI extension supports some form of project-level instructions. Without them, the AI relies on generic conventions.

3. **Mixing up MCP config formats.** VS Code's `mcp.json` uses `servers`; most other tools use `mcpServers`. Copying a block between them without changing the key is a common reason a server never appears.

4. **Not keeping related tabs open.** Inline completion quality improves when related files are open in the editor. Keep type definitions, tests, and related source files in your tab bar.

5. **Choosing the wrong mode for the task.** Inline completions for quick code, Ask for questions, Plan for design, Agent for complex changes. Match the tool to the task.

6. **Staying on a discontinued extension.** If your setup still depends on Roo Code, Supermaven, or a personal Cody plan, migrate your rules into `AGENTS.md` and move to a maintained tool.

## Frequently Asked Questions

### Does GitHub Copilot in VS Code read AGENTS.md?

Yes. VS Code accepts either .github/copilot-instructions.md or AGENTS.md as project instructions, controlled by the chat.useAgentsMdFile setting. Nested AGENTS.md files in subfolders are an experimental opt-in through chat.useNestedAgentsMdFiles.

### Where do I configure MCP servers in VS Code?

Put workspace servers in .vscode/mcp.json under a top-level servers key, or user-wide servers in your profile's mcp.json (MCP: Open User Configuration). You can also run MCP: Add Server from the Command Palette or install servers from the Extensions view by searching @mcp.

### What is the difference between Copilot custom instructions and prompt files?

Custom instructions (.github/copilot-instructions.md, AGENTS.md, and .github/instructions/_.instructions.md) apply automatically to chat requests. Prompt files (.github/prompts/_.prompt.md) are reusable tasks you run on demand by typing / and the prompt name.

### How do Cline and Continue store project rules?

Cline reads a .clinerules/ or .cline/rules/ folder plus AGENTS.md, and detects existing .cursorrules and .windsurfrules files. Continue reads Markdown rules from a .continue/rules/ folder and uses config.yaml for models and MCP servers.

### Are Roo Code and Cody still available for VS Code?

Roo Code's maintainers shut the extension down on May 15, 2026 and point users to Cline or the ZooCode fork. Sourcegraph ended Cody Free and Pro on July 23, 2025; Cody continues only for Enterprise customers, and individuals were directed to Amp.

## Go Deeper

To learn more about AI-assisted development and context management strategies, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
