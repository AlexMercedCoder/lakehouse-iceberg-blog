---
title: "Windsurf Flows vs MCP Servers: Context and MCP Config"
pubDatetime: 2026-03-07T22:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "Windsurf Flows track your edits and terminal; MCP servers add outside tools. In Devin Desktop (ex-Windsurf), MCP lives in ~/.config/devin/mcp_config.json."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - windsurf
slug: 2026-03-context-windsurf
draft: false
faqs:
  - question: "What is the difference between Windsurf Flows and MCP servers?"
    answer: "Flows is Windsurf's name for Cascade's awareness of what you do in the editor: your edits, open files, terminal output, and indexed codebase. MCP servers are separate processes or remote endpoints that give the agent new tools and data, such as a database, GitHub, or a browser. Flows decides what the agent already knows; MCP decides what else it can reach."
  - question: "Where is the Windsurf MCP config file?"
    answer: "Windsurf is now Devin Desktop, and its docs list the user-level MCP file as ~/.config/devin/mcp_config.json on macOS and Linux and %APPDATA%\\devin\\mcp_config.json on Windows. The Devin Local agent also reads project files at .devin/mcp_config.json and .devin/mcp_config.local.json. Pre-rename Windsurf builds kept MCP settings under ~/.codeium/."
  - question: "How do I add an MCP server in Windsurf?"
    answer: "In the legacy Cascade agent, open the ... menu at the top right of the Cascade panel and choose Open MCP config file in the MCPs section, then add an entry under mcpServers with command, args, and env for a local server or serverUrl or url for a remote one. For the default Devin Local agent you can also run devin mcp add with a user, project, or local scope."
  - question: "Is there a limit on MCP tools in Windsurf?"
    answer: "Yes. The Cascade docs state a limit of 100 total tools available at any given time. You can turn off individual tools by listing them in a server's disabledTools array, or toggle whole servers off in the MCPs panel."
  - question: "Do Windsurf Memories and Rules still work in Devin Desktop?"
    answer: "Rules do: Devin Desktop reads global_rules.md, .devin/rules/, .windsurf/rules/, the legacy .windsurfrules file, and AGENTS.md. Memories are workspace-scoped, stored locally, and apply only to the legacy Cascade agent; Devin Local does not persist them, and the Cascade Migration Wizard moves them into skills."
---

Windsurf is an AI-powered IDE built on the VS Code foundation that introduces the concept of "Flows," a paradigm where the AI maintains deep awareness of your actions, codebase, and development patterns over time. Its context management differentiates from other editors through Cascade (its agentic coding assistant), persistent Rules files, Memories, and a sophisticated context engine that tracks not just what files you are editing, but how you work.

**The short answer:** Flows is how Windsurf's Cascade agent keeps track of what you are doing (edits, open files, terminal output, the indexed codebase), so you do not have to restate it. MCP servers add capabilities Cascade cannot get from your workspace, such as querying a database or calling GitHub. You configure MCP servers in a JSON file under `mcpServers`: per the current docs that file is `~/.config/devin/mcp_config.json` (Windows: `%APPDATA%\devin\mcp_config.json`), opened from the `...` menu in the Cascade panel via **Open MCP config file**, with a cap of 100 active tools. Windsurf became **Devin Desktop** on June 2, 2026; new tabs now default to the Devin Local agent, which also reads project-level `.devin/mcp_config.json`.

This guide was reviewed on October 15, 2026 against the [Devin Desktop FAQ](https://docs.devin.ai/desktop/devin-desktop-faq), [Cascade MCP docs](https://docs.devin.ai/desktop/cascade/mcp), [Memories and Rules docs](https://docs.devin.ai/desktop/cascade/memories), [Devin Local docs](https://docs.devin.ai/desktop/devin-local), and [MCP configuration reference](https://docs.devin.ai/cli/extensibility/mcp/configuration). Older screenshots and settings names you find online may still say Windsurf.

This guide covers every context management mechanism in Windsurf and explains how to configure them for the most productive development experience.

## How Windsurf Manages Context

Windsurf assembles context through multiple layers:

1. **Cascade context engine** - tracks your edits, terminal commands, and navigation patterns in real time
2. **Rules files** - project and global instructions that shape AI behavior
3. **Memories** - persistent facts that carry across sessions
4. **Workspace index** - semantic index of your codebase
5. **Conversation context** - the current chat session in Cascade
6. **Active editor state** - the file you are editing, your cursor position, selected text
7. **MCP server connections** - external tools and data sources

The "Flows" concept means Windsurf's AI is not just responding to individual prompts. It maintains a continuous understanding of what you are doing, which enables more relevant suggestions and fewer context-setting instructions from you.

## Rules Files: Persistent Project Instructions

Windsurf uses Rules files to define project-level and global instructions for the AI.

### Global Rules

### Global Rules

Global rules apply across all projects. They live in `~/.codeium/windsurf/memories/global_rules.md`, are always on, and are limited to 6,000 characters. Edit them from the Customizations panel in Cascade (Rules, then **+ Global**):

```markdown
# Global Rules

## My Preferences

- Always use TypeScript over JavaScript
- Prefer functional programming patterns
- Use descriptive variable names (no single-letter variables except in loops)
- Add JSDoc comments to all exported functions

## Communication Style

- Be direct and concise
- Show code changes as diffs when possible
- Explain non-obvious design decisions
```

### Project Rules (Workspace)

Create project-level rules in your workspace:

- `.devin/rules/*.md` (preferred since the Devin Desktop rename) or `.windsurf/rules/*.md` (still read as a fallback), up to 12,000 characters per file
- The legacy single `.windsurfrules` file in the project root, which is still read
- `AGENTS.md` in the root (always on) or in a subdirectory (applied to files in that directory)

Each file in a rules directory can set a `trigger` in its frontmatter: `always_on`, `model_decision` (only the description is shown until relevant), `glob` (applies when matching files are touched), or `manual` (activated with `@rule-name`).

```markdown
# Project: E-Commerce Platform

## Stack

- Next.js 15 with App Router
- TypeScript 5.6
- PostgreSQL with Prisma ORM
- Tailwind CSS 4
- Vitest for testing

## Architecture

- app/ contains page routes and layouts
- lib/ contains shared utilities and API clients
- components/ contains UI components (Atomic Design: atoms, molecules, organisms)
- prisma/ contains schema and migrations

## Conventions

- Server Components by default, Client Components only when necessary
- Use Zod for all input validation
- API routes use the route handler pattern with error boundaries
- All database queries go through Prisma transactions for writes

## Testing

- Every new component needs a unit test
- API routes need integration tests with a test database
- Use MSW for mocking external API calls
```

### Rules Best Practices

- Put rules files in version control so the entire team follows the same conventions
- Keep rules actionable and specific, not aspirational
- Include negative constraints ("Do not use inline styles")
- Update rules when you change frameworks, libraries, or conventions
- Separate global preferences from project-specific rules

## Memories: Persistent Knowledge

Windsurf's Memory system stores facts that persist across conversations in a workspace. Memories can be created automatically (when the AI identifies important information during a conversation) or manually.

### How Memories Work

When you share something important in a conversation ("We decided to switch from REST to GraphQL for the new API"), Cascade can save this as a Memory. In future sessions in the same workspace, the AI loads relevant Memories to maintain continuity. Memories are stored locally in `~/.codeium/windsurf/memories/`, are scoped to one workspace, and are not committed to your repo. They apply only to the legacy Cascade agent: Devin Local does not persist memories, and the Cascade Migration Wizard (command palette) converts them into skills. For knowledge your team should share, use Rules or `AGENTS.md`.

### Managing Memories

- View and edit Memories from the Customizations panel in Cascade
- Delete outdated Memories that no longer apply
- Manually add Memories for important decisions the AI should always remember
- Review periodically to keep the memory store accurate

### Memories vs. Rules

| Aspect               | Rules                              | Memories                                 |
| -------------------- | ---------------------------------- | ---------------------------------------- |
| **Creation**         | You write them explicitly          | Created during conversations or manually |
| **Scope**            | Global or project-level            | Single workspace                         |
| **Purpose**          | Define conventions and constraints | Store facts and decisions                |
| **Update frequency** | When conventions change            | As new decisions are made                |

Use Rules for standards and conventions. Use Memories for facts and decisions.

## Cascade: The Agentic AI Assistant

Cascade is Windsurf's original agentic coding assistant. In Devin Desktop it is the legacy agent; new tabs start with Devin Local, which supports rules and AGENTS.md but not Memories or Workflows. Cascade operates in two modes with different context management implications:

### Chat Mode

Standard conversational interaction where you ask questions and receive answers. Context includes the active file, conversation history, and any files you reference.

### Code Mode

Autonomous mode where Cascade plans and executes multi-step tasks. In Code mode, Cascade:

- Reads and writes files across your project
- Runs terminal commands
- Navigates and explores the codebase
- Creates and executes multi-file changes

Code mode benefits from more comprehensive context (Rules, Memories, workspace index) because it operates autonomously without constant guidance.

## MCP Server Support: Flows vs MCP

Flows and MCP solve different problems. Flows (Cascade's real-time awareness) covers context that already lives in your editor: files, edits, terminal output, and the codebase index. MCP servers extend the agent past the workspace with tools and data sources it could not otherwise reach. If the information is in your repo, you do not need an MCP server for it. If it lives in a database, an issue tracker, or a SaaS API, MCP is the path.

### Where the Config File Lives

The legacy Cascade agent reads one user-level file:

- macOS and Linux: `~/.config/devin/mcp_config.json` (or `$XDG_CONFIG_HOME/devin/mcp_config.json`)
- Windows: `%APPDATA%\devin\mcp_config.json`

To open it, click the `...` menu at the top right of the Cascade panel, then **Open MCP config file** in the MCPs section. That section also lists each configured server, its enabled tool count, and an on/off toggle. Cascade has no one-click marketplace; that exists only for Devin Local.

The default Devin Local agent uses the Devin CLI layout: user servers in `~/.config/devin/mcp_config.json`, team-shared servers in `.devin/mcp_config.json`, and personal overrides in `.devin/mcp_config.local.json` (gitignored). You can also add servers from a terminal with `devin mcp add <name> -- <command>` or `devin mcp add <name> <url>`, choosing `--scope user`, `project`, or `local`.

### Configuration Format

```json
{
  "mcpServers": {
    "local-tool": {
      "command": "npx",
      "args": ["-y", "@company/mcp-server"],
      "env": { "API_KEY": "${env:MY_API_KEY}" }
    },
    "remote-tool": {
      "serverUrl": "https://mcp.example.com/mcp",
      "headers": { "Authorization": "Bearer ${env:REMOTE_TOKEN}" },
      "disabledTools": ["delete_everything"]
    }
  }
}
```

Local servers use `command`, `args`, and `env`. Remote servers use `serverUrl` or `url` (Cascade supports stdio, Streamable HTTP, and SSE, with OAuth). `${env:VAR}` and `${file:/path}` interpolation keeps secrets out of the file.

### Limits and Team Controls

- Cascade can use at most **100 total tools** at once. Disable tools you do not need with `disabledTools` or the per-server toggle.
- Enterprise users must turn MCP on in settings, and team admins can allowlist servers. Once a single server is allowlisted, every other server is blocked for that team.

### When to Use MCP

Use MCP in Windsurf for the same scenarios as other IDE-based tools: database queries, GitHub integration, API testing, and browser automation. Keep the list short: every enabled tool's description takes up context, and the 100-tool cap arrives faster than you expect with a few large servers.

## Model Selection and Context Configuration

Pick the model from the selector below the Cascade input box. The available list changes often and depends on your plan, so check it in the app rather than relying on a list in an article. Your model choice affects context management because different models handle different context window sizes and reasoning capabilities.

For complex refactoring that touches many files, choose a model with a larger context window. For quick completions and small edits, a faster model is more responsive.

### Tab Completion Context

Windsurf's Tab completion (inline autocomplete) uses a separate context pipeline from Cascade. The completion context includes:

- The current file content
- Recently edited files
- Import statements and type definitions
- Patterns from your codebase

Understanding this separation matters because Tab completions are optimized for speed (low latency) while Cascade chat is optimized for depth (comprehensive reasoning). The context for each is assembled differently to match their respective use cases.

## How Windsurf Assembles Context

When you interact with Cascade, Windsurf assembles context through this pipeline:

1. **Load Rules**: Global rules first, then project rules from `.devin/rules/`, `.windsurf/rules/`, `.windsurfrules`, and AGENTS.md
2. **Load Memories**: Retrieve relevant persistent facts
3. **Include active editor state**: Current file, cursor position, selection
4. **Process @-commands**: Add referenced files, codebase search results, web results
5. **Add flow context**: Recent edits, terminal output, navigation patterns
6. **Apply model constraints**: Trim to fit within the model's context window

This pipeline runs automatically for every interaction. The more you invest in Rules and Memories, the more relevant the automatically assembled context becomes.

## Onboarding a New Project to Windsurf

Here is a step-by-step process for setting up effective context management on a new project:

### Day 1: Foundation

1. Open the project in Windsurf and let the workspace indexing complete
2. Create an `AGENTS.md` or a `.devin/rules/` file with your stack, architecture, and conventions
3. Make a few small changes to verify Windsurf follows your conventions

### Day 2: Refinement

1. Review what Memories Windsurf created from Day 1
2. Add any important project facts as manual Memories
3. Adjust Rules based on how Cascade behaved on Day 1

### Week 2: Advanced Setup

1. Connect relevant MCP servers (database, GitHub)
2. Pin the files or folders your current task depends on
3. Start using Code mode for multi-file changes
4. Create directory-specific rules if different modules have different conventions

## Thinking About Context Levels

### Quick Edits (Minimal Context)

Use inline Command (Cmd+I / Ctrl+I) for small changes. Windsurf uses the current file and selection, plus applicable Rules, to generate edits. No additional context needed.

### Feature Development (Moderate Context)

Use Cascade chat with explicit file references. The workspace index, Rules, and Memories combine to give Cascade project-aware responses.

### Complex Architecture Work (Comprehensive Context)

Use Code mode with well-configured Rules, active Memories, and MCP connections. Let Cascade explore the codebase, run commands, and make changes across multiple files.

## @ Commands for Context Injection

Windsurf supports @-mentions similar to Cursor for injecting specific context. Per the current docs you can mention:

- **Files and directories** in your codebase
- **Functions and classes** from the local index
- **Terminal contents**
- **Previous conversations**, which pulls in their summaries
- **Rules** set to manual activation, with `@rule-name`

These give you fine-grained control over what context Cascade receives for each prompt.

## External Documents: PDFs vs. Markdown

### Markdown for Rules

All Rules files and project documentation should be Markdown. It is the native format for Windsurf's context system.

### For Reference Material

For external specifications in PDF form, convert key sections to Markdown and include them in your project as reference documents. This makes them discoverable through the codebase index.

### Context Pinning

When a task depends on code outside the files you have open, pin those files or folders. Pin only what you need: the docs warn that too much pinned context can slow the model and hurt results.

## Advanced Patterns

### The Flow-Aware Development Pattern

Put Windsurf's flow tracking to work by working naturally:

1. Make edits in the editor (Windsurf tracks your changes)
2. Run tests in the terminal (Windsurf observes the results)
3. Ask Cascade a question (it already knows what you changed and what failed)

This removes the need to manually explain what you just did. Windsurf already knows.

### The Rules-Layered Workflow

Combine global and project rules for comprehensive coverage:

- Global rules: Your personal coding style and preferences
- Project rules: Team conventions and architecture decisions
- Directory-specific rules: Module-specific patterns (glob-triggered rules or a subdirectory AGENTS.md)

### The Agent-Then-Review Pattern

1. Describe the feature to Cascade in Code mode
2. Let it plan and implement the changes
3. Review each file change in the diff view
4. Accept, reject, or modify individual changes
5. Ask Cascade to adjust based on your feedback

This uses Code mode for speed while maintaining human oversight through the review step.

### The Memory-Driven Continuity Pattern

At the end of each working session, review what Windsurf has stored as Memories. Add any important decisions or discoveries that were not automatically captured. At the start of the next session, Cascade starts with a richer understanding of your project.

## Common Mistakes

1. **Not setting up Rules files.** Without them, Cascade applies generic conventions. Project-specific Rules are the highest-impact configuration.

2. **Ignoring Memories.** Stale Memories mislead the AI. Review and clean them periodically.

3. **Underusing Code mode.** For multi-file changes, Code mode is dramatically faster than chat-based interactions. Trust it for structural changes and review the results.

4. **Over-specifying context in prompts.** If your Rules and Memories are well-configured, you do not need to re-explain your conventions in every prompt.

5. **Ignoring flow awareness.** Windsurf tracks your actions. Instead of explaining what you just did, ask questions that build on your recent work.

6. **Loading too many MCP tools.** Every enabled tool costs context, and Cascade caps out at 100. Turn off servers you are not using for the current task.

## Frequently Asked Questions

### What is the difference between Windsurf Flows and MCP servers?

Flows is Windsurf's name for Cascade's awareness of what you do in the editor: your edits, open files, terminal output, and indexed codebase. MCP servers are separate processes or remote endpoints that give the agent new tools and data, such as a database, GitHub, or a browser. Flows decides what the agent already knows; MCP decides what else it can reach.

### Where is the Windsurf MCP config file?

Windsurf is now Devin Desktop, and its docs list the user-level MCP file as ~/.config/devin/mcp_config.json on macOS and Linux and %APPDATA%\devin\mcp_config.json on Windows. The Devin Local agent also reads project files at .devin/mcp_config.json and .devin/mcp_config.local.json. Pre-rename Windsurf builds kept MCP settings under ~/.codeium/.

### How do I add an MCP server in Windsurf?

In the legacy Cascade agent, open the ... menu at the top right of the Cascade panel and choose Open MCP config file in the MCPs section, then add an entry under mcpServers with command, args, and env for a local server or serverUrl or url for a remote one. For the default Devin Local agent you can also run devin mcp add with a user, project, or local scope.

### Is there a limit on MCP tools in Windsurf?

Yes. The Cascade docs state a limit of 100 total tools available at any given time. You can turn off individual tools by listing them in a server's disabledTools array, or toggle whole servers off in the MCPs panel.

### Do Windsurf Memories and Rules still work in Devin Desktop?

Rules do: Devin Desktop reads global_rules.md, .devin/rules/, .windsurf/rules/, the legacy .windsurfrules file, and AGENTS.md. Memories are workspace-scoped, stored locally, and apply only to the legacy Cascade agent; Devin Local does not persist them, and the Cascade Migration Wizard moves them into skills.

## Go Deeper

To learn more about AI-assisted development and context management strategies, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
