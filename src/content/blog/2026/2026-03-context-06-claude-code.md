---
title: "Claude Code Context Window: CLAUDE.md, /compact, /context"
pubDatetime: 2026-03-07T14:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "Claude Code's context window is 1M tokens on current models and auto-compacts near 967K. Check usage with /context, summarize with /compact, reset with /clear."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - claude code
slug: 2026-03-context-claude-code
draft: false
faqs:
  - question: "How big is the Claude Code context window?"
    answer: "Current models (Claude Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1) run in Claude Code with a 1 million token context window by default, no [1m] suffix needed. Older Opus 4.6 and Sonnet 4.6 run at 200K unless you select their [1m] variant, which depends on your plan. Run /context in a session to see your real usage."
  - question: "How do I check how much context Claude Code is using?"
    answer: "Run /context. It draws current usage as a colored grid, lists which CLAUDE.md and auto memory files loaded, and suggests what to trim when tools or memory files take too much space."
  - question: "What is the difference between /compact and /clear in Claude Code?"
    answer: "/compact replaces the conversation so far with a structured summary and keeps the session going; you can add focus instructions such as /compact focus on the auth bug. /clear starts a new conversation with empty context, so use it when you switch to unrelated work. Claude Code also compacts automatically as you approach the limit."
  - question: "Where do CLAUDE.md files go?"
    answer: "Claude Code reads a managed policy CLAUDE.md set by your organization, your personal ~/.claude/CLAUDE.md, the project's ./CLAUDE.md or ./.claude/CLAUDE.md, and a gitignored ./CLAUDE.local.md. Files in parent directories load at launch, files in subdirectories load when Claude works there, and all of them are concatenated rather than overriding one another."
  - question: "What is MEMORY.md in Claude Code?"
    answer: "MEMORY.md is the index of auto memory, the notes Claude writes for itself about your preferences and corrections. It lives at ~/.claude/projects/<project>/memory/MEMORY.md, and the first 200 lines or 25KB load at the start of every session. Use /memory to browse it, edit it, or turn auto memory off."
---

Claude Code is a terminal-native agentic coding assistant that lives in your command line and operates directly on your codebase. Unlike chat-based interfaces where you copy and paste code snippets, Claude Code reads your files, explores your project structure, runs commands, executes tests, and commits changes. Context management in Claude Code is about configuring the agent's persistent knowledge of your project so it can operate effectively without constant direction.

This guide covers every context management mechanism in Claude Code, from the foundational CLAUDE.md file to MCP integrations and subagents. It was reviewed on October 15, 2026 against the official [memory](https://code.claude.com/docs/en/memory), [context window](https://code.claude.com/docs/en/context-window), [model configuration](https://code.claude.com/docs/en/model-config), [commands](https://code.claude.com/docs/en/commands), and [MCP](https://code.claude.com/docs/en/mcp) documentation. Claude Code ships often, so treat those pages as the authority.

## How Claude Code Manages Context

**The short answer:** the current Claude models (Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1) each have a 1 million token context window, and Claude Code runs them at 1M by default. Older Opus 4.6 and Sonnet 4.6 run at 200K unless you pick their `[1m]` variant, which depends on your plan. When a conversation nears the limit (about 967K tokens on the native 1M models), Claude Code compacts it automatically by replacing older turns with a structured summary. Run `/context` to see what is using your window, `/compact` to summarize on your terms, and `/clear` to start fresh when you switch tasks.

Claude Code builds its context from several sources, layered from most persistent to most ephemeral:

1. **CLAUDE.md files** (permanent instructions you write; Claude Code can read `AGENTS.md` instead when a repo has no CLAUDE.md)
2. **Auto memory and MEMORY.md** (notes Claude writes for itself across sessions)
3. **MCP server connections** (live external data)
4. **The codebase itself** (files, dependencies, project structure)
5. **The current conversation** (your commands and the agent's responses)
6. **Command output** (terminal results, test output, error messages)

The agent combines all of these into a working context that informs how it approaches tasks. The most effective Claude Code users invest time in the persistent layers (CLAUDE.md, auto memory, MCP) so that every conversation starts with a solid foundation.

## CLAUDE.md: Your Project's Instruction Manual

CLAUDE.md is the primary mechanism for giving Claude Code persistent context about your project. It is a Markdown file that Claude reads at the start of every session.

### File Locations and Hierarchy

Claude Code loads CLAUDE.md files from several locations and combines them into one instruction set:

| Location                                                                | Scope                                   | Use For                                          |
| ----------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------ |
| Managed policy file (for example `/etc/claude-code/CLAUDE.md` on Linux) | Organization (all users on the machine) | Company standards and compliance rules set by IT |
| `~/.claude/CLAUDE.md`                                                   | User (all your projects)                | Personal preferences, universal standards        |
| `./CLAUDE.md` or `./.claude/CLAUDE.md`                                  | Project (shared through git)            | Architecture, coding standards, testing strategy |
| `./CLAUDE.local.md`                                                     | Local (just you, gitignored)            | Sandbox URLs, personal test data                 |
| `./src/CLAUDE.md` (subdirectory)                                        | Component-specific                      | Module-specific patterns, API conventions        |

Files in your working directory and the directories above it load at launch. Files in subdirectories load on demand, once Claude reads or edits something in that subdirectory. The files are concatenated rather than overriding each other: broader files come first and the ones closest to where you launched Claude are read last. If your global CLAUDE.md says "use 2-space indentation" and your project CLAUDE.md says "use 4-space indentation," Claude may follow either one, so resolve the conflict instead of relying on order. Run `/init` to generate a starting CLAUDE.md, aim for under 200 lines per file, and use `.claude/rules/` with `paths:` frontmatter for instructions that only matter for certain files.

### What to Include in CLAUDE.md

```markdown
# CLAUDE.md

## Project Overview

This is a Python FastAPI application with a React frontend.
Backend: Python 3.12, FastAPI, SQLAlchemy, PostgreSQL 16
Frontend: TypeScript, React 19, Vite 6, Zustand
Testing: pytest (backend), Vitest (frontend)

## Build and Run Commands

- Backend: `uvicorn app.main:app --reload`
- Frontend: `npm run dev`
- Tests: `pytest` (backend), `npm test` (frontend)
- Lint: `ruff check .` (backend), `npm run lint` (frontend)

## Code Conventions

- Use type hints for all function signatures
- Use Pydantic models for API request/response schemas
- Use async functions for all database operations
- Prefer composition over inheritance
- Keep functions under 30 lines; extract helpers for longer logic

## Testing Requirements

- Every new endpoint needs integration tests
- Every utility function needs unit tests
- Mock external services; never hit real APIs in tests
- Use factories (not fixtures) for test data creation

## Architecture Decisions

- We use the repository pattern for database access
- All business logic lives in the service layer, not in route handlers
- Frontend state is managed exclusively through Zustand stores
- API responses follow the JSON:API specification
```

### CLAUDE.md Best Practices

- **Be specific and actionable.** "Write clean code" is useless. "Functions should have a single responsibility and no side effects" is useful.
- **Include build and test commands.** Claude Code will run these commands to verify its work. If it does not know your test command, it cannot validate changes.
- **Document your architecture.** Tell Claude Code where things live. "Database models are in `app/models/`" saves the agent from exploring your entire project structure.
- **Use negative constraints.** "Do not use class-based views" and "Never import directly from internal modules; use the public API" prevent common mistakes.
- **Keep it current.** An outdated CLAUDE.md with references to deprecated patterns causes more harm than having no CLAUDE.md at all.

## MEMORY.md: Auto Memory Across Sessions

Auto memory is the set of notes Claude Code writes for itself as you work: your preferences, the corrections you give it, and project facts it cannot derive from the code. It is on by default in local sessions, and `MEMORY.md` is the index that ties those notes together.

### How Auto Memory Works

- Each project gets its own memory directory at `~/.claude/projects/<project>/memory/`, shared by every worktree and subdirectory of the same git repository
- `MEMORY.md` is an index with one line per memory; detailed notes live in separate topic files that Claude reads only when it needs them
- The first 200 lines or 25KB of `MEMORY.md`, whichever comes first, load at the start of every conversation
- When you say "remember that the API tests need a local Redis instance," Claude saves it to auto memory; ask it to "add this to CLAUDE.md" when you want a team-shared instruction instead
- Everything is plain Markdown on your machine, so you can edit or delete any of it

### What Gets Stored

Typical auto memory entries include:

- Project preferences you have stated ("I prefer named exports over default exports")
- Decisions you have made ("We chose Redis for session storage because of its TTL support")
- Debugging discoveries ("The auth middleware requires the Authorization header in lowercase")
- Workflow notes ("Always run migrations before testing database changes")

### Managing Auto Memory

Review it periodically. Like any persistent context, stale entries can lead the agent astray. Remove entries that no longer apply and update ones that have changed.

The `/memory` command lists your CLAUDE.md and CLAUDE.local.md files, opens the auto memory folder, and has a toggle to turn auto memory on or off.

## Slash Commands: Real-Time Context Control

Claude Code provides several slash commands for managing context during a session:

| Command                   | Purpose                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `/context`                | Visualize current context usage as a colored grid, with optimization suggestions                |
| `/compact [instructions]` | Summarize the conversation so far to free space, optionally with focus instructions             |
| `/clear`                  | Start a new conversation with empty context (CLAUDE.md and auto memory load again at the start) |
| `/memory`                 | Edit CLAUDE.md files, toggle auto memory, and view auto memory entries                          |
| `/init`                   | Generate a starting CLAUDE.md for the project                                                   |
| `/help`                   | List available commands                                                                         |

### Using /clear Strategically

Long sessions accumulate irrelevant context that can degrade Claude Code's focus. Use `/clear` when:

- You are switching to a different part of the codebase
- The conversation has gotten long and the agent seems confused
- You want to start a focused task without the baggage of previous exchanges

Because CLAUDE.md and auto memory load at the start of every conversation, they come back after `/clear`. Only the conversation history is lost. If you want to keep going on the same task with less baggage, use `/compact` instead, ideally with a focus such as `/compact focus on the auth bug fix`. After compaction, Claude Code re-injects the project-root CLAUDE.md and auto memory from disk, while nested CLAUDE.md files and path-scoped rules reload on demand.

### Using Subagents for Sub-Tasks

Subagents run in their own separate context window and return only a summary, so large file reads stay out of your main conversation. Ask Claude to delegate a task to a subagent, or define reusable ones as Markdown files in `.claude/agents/` (project) or `~/.claude/agents/` (personal). This is useful for:

- Exploring a part of the codebase without polluting your main conversation
- Running a time-consuming task (like a full test suite analysis) in parallel
- Dividing a large feature into independent pieces

## MCP Server Support

Claude Code supports MCP through the `claude mcp` command, allowing you to connect external tools and data sources.

### Configuration

```bash
# Add a remote MCP server over HTTP (the recommended transport for remote servers)
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Add a local stdio server; everything after -- is the launch command
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub --dsn "postgresql://user:pass@localhost:5432/dev"

# Share a server with your team through .mcp.json in the project root
claude mcp add --transport http shared-server --scope project https://example.com/mcp

# List configured servers, then remove one
claude mcp list
claude mcp remove db
```

Servers default to `local` scope (just you, this project). `--scope project` writes to `.mcp.json` so teammates get the same server, and `--scope user` makes a server available in all your projects. Inside a session, `/mcp` shows server status and handles OAuth sign-in. The older SSE transport is deprecated in favor of HTTP. By default Claude Code lists only MCP tool names up front and loads full tool schemas on demand, so connected servers cost little context until they are used.

### Practical MCP Use Cases for Developers

**Development database:** Let Claude Code query your dev database to understand schema, check data state, and verify migrations.

**Browser testing:** Connect a Playwright MCP server so Claude Code can verify frontend changes by interacting with a running application.

**Git hosting:** Connect a GitHub or GitLab MCP server for creating pull requests, checking CI status, and reviewing code.

**Documentation systems:** Access internal docs or wikis that provide context not in the codebase.

### When to Use MCP vs. Direct Commands

Claude Code can already run terminal commands. If you just need to see `git log` or `psql -c "SELECT * FROM users"`, Claude Code can run those directly. MCP is more useful when:

- The interaction is structured and repeatable (not ad-hoc commands)
- You want Claude to have persistent access to a service across the entire session
- The MCP server provides tools that are safer or more convenient than raw commands

## External Documents: When to Use PDFs vs. Markdown

### For Codebase Context: Always Markdown

CLAUDE.md, auto memory notes, and any reference documents you create for Claude Code should be Markdown. The format is native to Claude Code's context system, version-controllable, and parses without ambiguity.

### For External Specifications: Convert When Possible

If you have API specifications, design documents, or architecture diagrams in PDF form, consider extracting the relevant sections into Markdown and placing them in your repository. This way Claude Code can access them through normal file reading rather than requiring file upload.

### For One-Off References

If you need Claude Code to reference a specific document during a session, paste the relevant content directly into the conversation. Claude Code's 1M token window on current models handles substantial text, though every pasted page also crowds out room for code.

## Advanced Patterns

### The Test-Driven Context Pattern

1. Write failing tests that describe the behavior you want
2. Tell Claude Code: "Make these tests pass"
3. The tests themselves become the context for the implementation

This is one of the most effective strategies because tests are unambiguous specifications. Claude Code does not need to interpret your prose when it has concrete pass/fail criteria.

### The Progressive Codebase Understanding Pattern

When onboarding Claude Code to a new project:

1. Start with CLAUDE.md covering the basics (stack, structure, commands)
2. Ask Claude to explore the codebase and describe what it finds
3. Correct any misunderstandings and add clarifications to CLAUDE.md
4. Gradually delegate more complex tasks as the context matures

This iterative approach builds a solid CLAUDE.md faster than trying to write everything from scratch.

### The Multi-Agent Feature Pattern

For large features with independent components:

1. Ask Claude to hand each component to a subagent
2. Main agent: coordinates the overall architecture
3. Sub-agent 1: implements the database layer
4. Sub-agent 2: implements the API endpoints
5. Sub-agent 3: implements the frontend components
6. Main agent: integrates the results and runs full tests

Each sub-agent operates with focused context, producing better results than one agent trying to build everything sequentially.

### The Code Review Pattern

Use Claude Code as a reviewer before submitting your own PRs:

"Review the changes in the current branch compared to main. Check for: security issues, performance problems, missing error handling, test coverage gaps, and style guide violations from CLAUDE.md."

The persistent CLAUDE.md context means the review applies your project's specific standards, not generic best practices.

## When to Choose Claude Code Over Other Tools

**Choose Claude Code over Claude Web/Desktop when:** Your task is code-centric and benefits from direct file system access, terminal command execution, and test running.

**Choose Claude Code over OpenAI Codex when:** You want Claude models plus Claude Code's CLAUDE.md, auto memory, skills, and hooks, or your team already standardizes on them.

**Choose Claude Code over Cursor or Windsurf when:** You want a lightweight terminal agent without the overhead of a full IDE, or you work primarily in the terminal.

## Common Mistakes

1. **No CLAUDE.md.** Claude Code still works without one, but it will make assumptions about your project that may not match reality. Ten minutes spent writing CLAUDE.md saves hours of corrections.

2. **Stale CLAUDE.md.** A CLAUDE.md that references a framework you migrated away from six months ago actively misleads the agent. Keep it current.

3. **Not using /clear or /compact.** Long sessions accumulate noise. Clear the conversation when switching tasks, and compact with a focus when you want to keep going on the same one.

4. **Over-relying on MCP.** If Claude Code can accomplish a task through direct file access and terminal commands, adding an MCP server is unnecessary overhead.

5. **Ignoring auto memory.** Review MEMORY.md and its topic files periodically with `/memory`. Claude Code's auto-generated memories are usually accurate, but occasionally they capture outdated or incorrect information.

6. **Micro-managing the agent.** Claude Code is designed for autonomous task execution. Give it a clear objective, ensure the context is correct, and let it work. Interrupting with constant corrections breaks the agent's flow.

## Frequently Asked Questions

### How big is the Claude Code context window?

Current models (Claude Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1) run in Claude Code with a 1 million token context window by default, no `[1m]` suffix needed. Older Opus 4.6 and Sonnet 4.6 run at 200K unless you select their `[1m]` variant, which depends on your plan. Run /context in a session to see your real usage.

### How do I check how much context Claude Code is using?

Run /context. It draws current usage as a colored grid, lists which CLAUDE.md and auto memory files loaded, and suggests what to trim when tools or memory files take too much space.

### What is the difference between /compact and /clear in Claude Code?

/compact replaces the conversation so far with a structured summary and keeps the session going; you can add focus instructions such as /compact focus on the auth bug. /clear starts a new conversation with empty context, so use it when you switch to unrelated work. Claude Code also compacts automatically as you approach the limit.

### Where do CLAUDE.md files go?

Claude Code reads a managed policy CLAUDE.md set by your organization, your personal ~/.claude/CLAUDE.md, the project's ./CLAUDE.md or ./.claude/CLAUDE.md, and a gitignored ./CLAUDE.local.md. Files in parent directories load at launch, files in subdirectories load when Claude works there, and all of them are concatenated rather than overriding one another.

### What is MEMORY.md in Claude Code?

MEMORY.md is the index of auto memory, the notes Claude writes for itself about your preferences and corrections. It lives at `~/.claude/projects/<project>/memory/MEMORY.md`, and the first 200 lines or 25KB load at the start of every session. Use /memory to browse it, edit it, or turn auto memory off.

## Go Deeper

To learn more about working effectively with AI coding agents and context management strategies, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
