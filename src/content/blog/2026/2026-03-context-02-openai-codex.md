---
title: "Codex Context Management: Context Windows, AGENTS.md, and Skills"
pubDatetime: 2026-03-07T10:00:00Z
modDatetime: 2026-09-11T12:00:00Z
date: "2026-03-07"
description: "Manage Codex context with layered AGENTS.md guidance, reusable skills, project configuration, focused prompts, and external tools when they are actually needed."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - openai codex
slug: 2026-03-context-openai-codex
draft: false
faqs:
  - question: "Why is the `AGENTS.md` file considered the foundation of OpenAI Codex context management?"
    answer: "Codex reads an instruction chain at the start of a run, combining eligible global guidance with project and directory-level AGENTS.md files between the project root and current working directory."
  - question: "What advantage does the Codex desktop app provide for ongoing development?"
    answer: "The desktop app organizes projects and tasks, supports local or cloud environments, and can isolate parallel repository work in Git worktrees. Durable project guidance should still live in version-controlled instructions and skills."
  - question: "When is incorporating external MCP servers beneficial for Codex workflows?"
    answer: "MCP servers are crucial when Codex needs context outside the static repository - such as actively querying a development database to verify schemas, or operating a headless browser via Playwright to validate frontend interactions."
---

Codex context management is the practice of giving the coding agent the right repository files, instructions, tools, and task details for the work at hand. The most durable context belongs in version-controlled `AGENTS.md` files and reusable skills; task-specific context belongs in the prompt. Codex is available through the ChatGPT desktop experience, CLI, IDE extension, and cloud workflows, but the exact capabilities depend on the client and environment you use.

This guide was reviewed on September 11, 2026 against the [official AGENTS.md documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [skills documentation](https://learn.chatgpt.com/docs/build-skills), and [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference). Product behavior changes, so use those pages as the authority for current settings.

## Understanding How Codex Handles Context

Codex models do not all share one fixed context-window size. The available model and its limits can change by client, plan, and release, so a hard-coded token figure becomes stale quickly. More importantly, a nominal context limit is not a target: focused context is easier to reason over than a repository dump.

Depending on the client and task, Codex can assemble working context from:

1. **The working directory or repository:** files that Codex can inspect in the selected local, worktree, or cloud environment
2. **AGENTS.md guidance:** the eligible global, project, and directory instructions discovered at the start of the run
3. **Skills:** reusable instructions with optional scripts, references, assets, and declared dependencies
4. **The task prompt and conversation:** the requested outcome, constraints, decisions, and follow-up guidance
5. **Tools and integrations:** external data made available through built-in tools, plugins, apps, or MCP connections

The key insight is that most of Codex's context comes from your repository itself, not from conversational back-and-forth. This makes context management a matter of preparing your repo and configuration files rather than crafting perfect prompts.

## Thinking About the Right Level of Context

### Minimal Context (Quick Tasks)

For simple, self-contained tasks like "add input validation to this function" or "write unit tests for utils.py," the task prompt and the codebase itself provide sufficient context. Codex will explore the relevant files, understand the patterns, and produce targeted changes. You do not need to provide extensive background.

### Moderate Context (Targeted Changes)

For tasks that require understanding project conventions, architectural decisions, or specific technical requirements, provide that context in your AGENTS.md file or in the task prompt. For example: "Refactor the authentication module to use JWT instead of session cookies. Our API follows REST conventions and uses Express 5 middleware patterns."

### Comprehensive Context (Large Features or Ongoing Work)

For multi-step features, large refactors, or ongoing development work, invest in skills and layered `AGENTS.md` files. Keep decisions that must survive across sessions in the repository rather than relying on undocumented memory behavior.

## AGENTS.md: The Foundation of Codex Context

`AGENTS.md` is a Markdown instruction file for stable project guidance. Codex reads the applicable instruction chain once when a run begins; in the CLI TUI, that usually means once per launched session.

### How It Works

At global scope, Codex checks its home directory for `AGENTS.override.md` and then `AGENTS.md`, using the first non-empty match. At project scope it walks from the project root toward the current working directory, checking each directory for an override, a regular `AGENTS.md`, or configured fallback filename. This makes directory-level guidance useful in monorepos while keeping shared rules at the root.

### What to Include

```markdown
# AGENTS.md

## Project Overview

This is a Next.js 15 application with a Python FastAPI backend.
The frontend uses TypeScript, Tailwind CSS, and Zustand for state management.
The backend uses SQLAlchemy with PostgreSQL.

## Coding Standards

- Use functional components with hooks (no class components)
- All API endpoints must include input validation using Pydantic
- Write tests for every new function using pytest (backend) and Vitest (frontend)
- Use conventional commit messages: feat:, fix:, refactor:, docs:, test:

## Architecture

- Frontend routes are in src/app/ (App Router)
- API routes are in backend/api/routes/
- Database models are in backend/models/
- Shared types are in shared/types/

## Constraints

- Do not modify the database schema without explicit approval
- Do not add new dependencies without noting them in the PR description
- All environment variables must be documented in .env.example
```

### Hierarchical AGENTS.md Files

For monorepos or large projects, you can place AGENTS.md files at different levels:

- **Root level:** Global project instructions
- **Service directories:** Service-specific conventions (e.g., `backend/AGENTS.md`, `frontend/AGENTS.md`)
- **Global:** `~/.codex/AGENTS.md` for personal preferences that apply across all projects

The discovered files are ordered from broad to specific, with guidance closer to the working directory taking precedence when instructions conflict. An `AGENTS.override.md` replaces the regular file in the same directory.

### Best Practices

- Keep it updated. Stale AGENTS.md instructions lead to stale agent behavior.
- Be specific about constraints. "Follow best practices" is meaningless to an agent. "All database queries must use parameterized statements, never string interpolation" is actionable.
- Include examples of your code style. Show the agent what "good" looks like in your codebase.
- Document your testing strategy. Tell the agent which test framework to use, where tests live, and what coverage expectations you have.

## Skills: Reusable Workflow Bundles

Skills package reusable instructions in a directory containing a required `SKILL.md` file and optional scripts, references, assets, and UI/dependency metadata. Codex initially sees the skill's name and description, then reads the full instructions when the skill is selected. This progressive disclosure avoids loading every workflow into every prompt.

### When to Use Skills

- You have a repeatable workflow (deploying to staging, onboarding a new API endpoint, migrating a database)
- The workflow requires multiple steps that need to happen in a specific order
- You want consistency across team members using Codex

### Creating a Skill

For a repository-scoped skill, create it under `.agents/skills/<skill-name>/SKILL.md`. The YAML frontmatter must come first:

```markdown
---
name: create-api-endpoint
description: Creates a new REST API endpoint with validation, tests, and documentation
---

## Steps

1. Create the route file in backend/api/routes/
2. Define the Pydantic request/response models in backend/api/schemas/
3. Implement the business logic in backend/services/
4. Write pytest tests in backend/tests/
5. Add the endpoint to the OpenAPI documentation
6. Update the API changelog

## Templates

Use the existing endpoint at backend/api/routes/users.py as the reference pattern.

## Validation

- Run pytest after creating the endpoint
- Verify the OpenAPI spec is valid
- Check that all response codes are documented
```

Skills can be invoked explicitly or selected when the task matches the skill description. Because implicit matching depends on that description, make its scope and trigger conditions concrete.

## Codex Clients and Environments

### ChatGPT Desktop and Web

ChatGPT can organize Codex work into projects and tasks and can run work in local, worktree, or cloud environments when those options are available. Treat the selected project, checkout, and current task as the immediate context boundary.

- **Project or directory:** Determines which files and repository state are available
- **Task prompt:** Defines the outcome and constraints for this run
- **Repository instructions and skills:** Supply durable, version-controlled guidance
- **Tools and plugins:** Add access to browsers, services, and specialized workflows

Git worktrees are useful when separate tasks need isolated repository state. A local task can instead operate directly in the saved checkout when that is the intended workflow.

### CLI (Command Line)

The Codex CLI (`codex`) runs in your terminal and operates from the current working directory. It offers direct control over the local environment and project configuration:

- **Sandbox and approval settings:** Control filesystem, command, and network boundaries
- **MCP servers:** The CLI supports MCP server integration for connecting external tools
- **File references:** Point the agent at specific files or directories
- **Image inputs:** Pass screenshots or design mockups alongside prompts
- **Interactive mode:** Have a conversation with the agent about your codebase

User configuration lives in `~/.codex/config.toml`. Trusted projects can add scoped overrides in `.codex/config.toml`, although security-sensitive and machine-local settings remain user- or administrator-controlled.

### IDE Extension and Cloud Workflows

The IDE extension keeps the active editor and selected code close to the task. Cloud workflows run against a configured remote environment and repository state. In both cases, durable conventions should remain in version-controlled project instructions so the same rules travel between clients.

Client features, supported operating systems, and available models change over time. Check the [official Codex documentation](https://learn.chatgpt.com/docs) instead of using this article as a compatibility matrix.

## MCP Server Support

The Codex CLI supports the Model Context Protocol (MCP), allowing you to connect external tools and data sources to the agent.

### What MCP Enables

- **Database access:** Let the agent query your development database to understand schema and data patterns
- **Browser automation:** Connect a Playwright MCP server so the agent can test frontend changes by interacting with a real browser
- **API integration:** Give the agent access to your project management tools, documentation systems, or monitoring dashboards
- **Custom tools:** Build MCP servers that expose your organization's internal tools to the agent

### When to Use MCP

MCP is most valuable when the agent needs information that is not in the repository:

- Understanding runtime behavior (logs, database state, API responses)
- Verifying changes against a running application
- Accessing external specifications or documentation
- Interacting with CI/CD systems or deployment tools

### When NOT to Use MCP

For tasks that are purely code-level (refactoring, writing tests, fixing type errors), MCP adds unnecessary complexity. The codebase itself provides sufficient context. Use MCP when the agent needs to interact with the world outside the code.

### Configuration

MCP configuration and commands evolve. Use the current Codex MCP documentation and verify the server's own launch command rather than copying an untested placeholder. Conceptually, a connection identifies the server process or URL, its credentials, and which tools Codex may call.

```bash
# Inspect the commands supported by the installed CLI version
codex mcp --help
```

## External Documents: When to Use PDFs vs. Markdown

Codex primarily operates on code, but there are situations where providing external documents improves results.

### Use Markdown When:

- Writing AGENTS.md or Skills (required format)
- Providing architectural decision records (ADRs)
- Sharing coding standards or style guides
- Documenting API specifications

Markdown is the native format for Codex context. It parses cleanly, supports code blocks, and is version-controllable in Git.

### Use PDFs When:

- Referencing published specifications (RFC documents, protocol specs)
- Sharing design documents with diagrams that do not translate well to Markdown
- Providing compliance or regulatory requirements that exist in PDF form

In practice, Markdown is almost always the better choice for Codex. If you have a PDF specification, consider extracting the relevant sections into a Markdown file in your repository.

## Automations: Scheduled Context Processing

Codex supports Automations, which are scheduled tasks that run in the background. These allow you to set up recurring agent work that automatically processes your codebase with predefined context.

### Use Cases

- **Daily code reviews:** Schedule the agent to review new PRs every morning
- **Dependency audits:** Weekly check for outdated or vulnerable dependencies
- **Documentation updates:** Automatically update API documentation after code changes
- **Test maintenance:** Periodically scan for broken or flaky tests

An automation replays its saved prompt on a schedule. The files, skills, and tools available to that run depend on its destination and configured execution environment, so make the prompt self-contained and keep required project guidance in the repository.

## Advanced Patterns

### The Context Layering Strategy

Combine multiple context sources for complex tasks:

1. **Global AGENTS.md** (in `~/.codex/`): Personal preferences and universal standards
2. **Project AGENTS.md** (in repo root): Project architecture and conventions
3. **Directory AGENTS.md** (in subdirectories): Component-specific patterns
4. **Skills:** Repeatable workflows for common tasks
5. **Task prompt:** The specific thing you want done now
6. **MCP servers:** Live external data for verification

Each layer adds specificity. When instructions conflict, higher-priority system or administrator policy wins, and more specific project guidance can override broader project guidance.

### The Multi-Agent Pattern

Use the desktop app to run parallel agents on different aspects of a feature:

- Agent 1: Implements the backend API endpoint
- Agent 2: Writes the frontend component
- Agent 3: Creates integration tests

Each agent runs in its own Git worktree, so their changes do not conflict. Review and merge the results when all agents complete.

### The Exploration-First Pattern

Before giving Codex a complex task, use a "planning" prompt:

"Analyze the authentication module in backend/auth/. Describe the current architecture, identify potential issues, and suggest improvements. Do not make any changes."

Review the agent's analysis, then use it as context for the actual implementation task. This prevents the agent from making changes based on incomplete understanding.

## Common Mistakes

1. **Skipping durable project guidance:** Without an applicable `AGENTS.md`, Codex must infer conventions from the repository and task, which increases the chance of inconsistent choices.

2. **Overly broad tasks:** "Improve the application" is too vague. "Add rate limiting to the /api/users endpoint using express-rate-limit with a 100-request-per-minute window" gives the agent clear parameters.

3. **Ignoring the review step:** Codex produces diffs and PRs for a reason. Always review the output, especially for tasks involving security, database changes, or public-facing features.

4. **Not using Skills for repeatable work:** If you find yourself writing the same type of task prompt repeatedly, extract it into a Skill.

5. **Using MCP when you do not need it:** Adding MCP servers increases complexity and potential failure points. Only connect external tools when the task genuinely requires external data.

## Go Deeper

To learn more about working effectively with AI coding tools, context engineering, and agentic development workflows, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
