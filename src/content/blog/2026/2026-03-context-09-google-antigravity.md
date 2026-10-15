---
title: "Google Antigravity Rules, Skills, and Workflows Explained"
pubDatetime: 2026-03-07T17:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "Antigravity reads AGENTS.md, GEMINI.md, and .agents/rules/*.md as rules and .agents/skills/ as skills. Legacy workflows stop working on October 19, 2026."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - google antigravity
slug: 2026-03-context-google-antigravity
draft: false
faqs:
  - question: "Where do Antigravity rules go?"
    answer: "Project rules go in `AGENTS.md` or `GEMINI.md` in any directory, in `.agents/AGENTS.md` or `.agents/GEMINI.md`, or as modular files in `.agents/rules/*.md`. Global rules go in `~/.gemini/GEMINI.md`, `~/.gemini/AGENTS.md`, or `~/.gemini/config/rules/*.md`. Modular rule files need a `trigger` of `always_on`, `model_decision`, `glob`, or `manual`."
  - question: "Are Antigravity workflows being replaced by skills?"
    answer: "Legacy workflows in `.agents/workflows/` stop working on October 19, 2026. Google says a new workflows system is coming, and recommends skills in the meantime. The `/migrate-workflows` command converts workflows to skills and keeps the originals as `.bak` files."
  - question: "Where do Antigravity skills live?"
    answer: "Workspace skills live in `.agents/skills/<name>/SKILL.md`. Global skills live in `~/.gemini/config/skills/` for the app and IDE, and in `~/.gemini/antigravity-cli/skills/` for the CLI. Only the `description` field in the frontmatter is required."
  - question: "How do I see how much context an Antigravity conversation is using?"
    answer: "In Antigravity CLI, run `/context` to open the Context Usage panel. It shows the share of the model's window in use, a breakdown by category, and how many times the conversation has been compacted."
  - question: "How are rules different from skills in Antigravity?"
    answer: "Rules are guidance the agent should follow while it works, injected on every turn or when a trigger matches. Skills are procedures the agent loads only when a task calls for them, either by matching the skill's description or when you type `/<skill-name>`."
---

Google Antigravity is Google's agent-first development platform. It runs as a desktop app, a terminal CLI (the `agy` command), the Antigravity IDE, and extensions for editors such as VS Code and JetBrains; the CLI shares its agent harness with the desktop app. It approaches context management differently from chat-first coding tools because the agent plans, executes, and documents its own work. Its context system rests on four pieces: Rules for always-relevant guidance, Skills for reusable procedures, Knowledge for what the agent has learned, and Artifacts for reviewable records of its work.

This guide was reviewed on October 15, 2026 against the Antigravity docs for [rules](https://antigravity.google/docs/rules/), [skills](https://antigravity.google/docs/skills/), the [workflows-to-skills migration](https://antigravity.google/docs/migration/workflows-to-skills/), [models](https://antigravity.google/docs/models/), and [MCP](https://antigravity.google/docs/mcp/). Product behavior changes, so treat those pages as the authority.

**The short answer:** put always-on project guidance in `AGENTS.md` or `GEMINI.md` (or modular files in `.agents/rules/`), put repeatable procedures in skills under `.agents/skills/<name>/SKILL.md`, and convert any legacy workflows in `.agents/workflows/` before **October 19, 2026**, when they stop working. Global rules live in `~/.gemini/GEMINI.md` or `~/.gemini/AGENTS.md`. Each rule file is capped at 24,000 bytes, and all always-on and global rules share a 20,000-token budget.

## How Antigravity Manages Context

Antigravity assembles its working context from multiple sources, layered by persistence:

1. **Rules** - `AGENTS.md`, `GEMINI.md`, and `.agents/rules/*.md` files, loaded always or on a trigger
2. **Skills** (SKILL.md files) - reusable instruction sets the agent loads when a task matches
3. **Knowledge** - what the agent has retained from earlier work, stored with your local app data
4. **Conversation history** - the current conversation, compacted into checkpoint summaries as it grows
5. **The codebase** - the folders and Git repositories in the project
6. **MCP servers** - external tools and data sources
7. **Artifacts** - implementation plans, walkthroughs, screenshots, and browser recordings the agent creates

What makes Antigravity distinctive is that it actively generates its own context artifacts. The agent writes plans and walkthroughs as it works, and you review them like you would review a teammate's design doc.

## Rules: Always-Relevant Guidance

Rules are Markdown files that tell the agent how to work in a project. Antigravity reads them from several places:

| Location                                     | Scope                          |
| -------------------------------------------- | ------------------------------ |
| `AGENTS.md` or `GEMINI.md` in any directory  | That directory, always on      |
| `.agents/AGENTS.md`, `.agents/GEMINI.md`     | That directory, always on      |
| `.agents/rules/*.md`                         | Modular rules with frontmatter |
| `~/.gemini/GEMINI.md`, `~/.gemini/AGENTS.md` | Global, always on              |
| `~/.gemini/config/rules/*.md`                | Global modular rules           |

`AGENTS.md` and `GEMINI.md` need no frontmatter and are always on. Files in a `rules/` directory need a `trigger` in their frontmatter:

- **`always_on`** injects the full rule on every turn.
- **`model_decision`** injects only the path and `description`, and the agent reads the full rule when the task matches.
- **`glob`** activates when the agent works with files matching `globs`.
- **`manual`** loads only when you `@`-mention the rule in chat.

A rule with missing frontmatter or an invalid trigger (such as `alwaysOn`) is silently discarded, so check spelling. Inside a rule, `@[label](path)` inlines another file's contents, which is useful for pulling in a shared style guide.

### Rule Budgets

Each rule file is truncated at 24,000 bytes, measured after includes are expanded. All global and `always_on` rules share a 20,000-token budget; past that, the largest files are replaced with one-line pointers. That makes `model_decision` and `glob` triggers the right home for long, narrow guidance.

## Skills: Reusable Capability Packages

Skills are Antigravity's primary mechanism for defining reusable procedures. Antigravity follows the open Agent Skills format: each skill is a folder containing a `SKILL.md` file with YAML frontmatter and detailed Markdown instructions.

### Skill Structure

```
.agents/skills/
  my-skill/
    SKILL.md          # Required: instructions with YAML frontmatter
    scripts/          # Optional: helper scripts
    examples/         # Optional: reference implementations
    resources/        # Optional: templates or assets
```

Workspace skills live in `.agents/skills/`. Global skills live in `~/.gemini/config/skills/` for the app and IDE, and in `~/.gemini/antigravity-cli/skills/` for the CLI.

### SKILL.md Format

```markdown
---
name: deploy-to-staging
description: Deploys the application to the staging environment. Use when the user asks to ship a branch to staging.
---

## Prerequisites

- Docker must be installed and running
- AWS CLI must be configured with staging credentials
- The current branch must have passing CI

## Steps

1. Build the Docker image with the staging configuration
2. Push the image to ECR
3. Update the ECS task definition
4. Trigger the deployment
5. Verify the health check endpoint responds

## Verification

- Check that the /health endpoint returns 200
- Verify the deployed version matches the expected Git SHA
- Run the smoke test suite against staging
```

Only `description` is required; `name` defaults to the folder name. The description matters most, because it is all the agent sees until it decides to use the skill.

### How Skills Load

Skills use progressive disclosure. At the start of a conversation the agent sees each skill's name and description. When a skill looks relevant, it reads the full `SKILL.md` and follows it. You can also call a skill directly by typing `/<skill-name>`; in the CLI every skill becomes a slash command automatically. This keeps dozens of skills available without filling the context window.

### When to Create Skills

Create a Skill when you have a workflow that:

- You perform more than once
- Requires specific steps in a specific order
- Benefits from consistent execution across team members
- Involves domain knowledge that is not obvious from the codebase alone

### Skills vs. Other Context Mechanisms

Skills are for procedural knowledge ("how to do X"). They differ from:

- **Rules** which provide ambient project guidance on every turn or on a trigger
- **Knowledge** which holds what the agent has learned about your project
- **Artifacts** which document specific work done in a specific conversation

## Workflows: Migrate Before October 19, 2026

Older Antigravity setups used Workflows: Markdown files in `.agents/workflows/` (or `~/.gemini/config/workflows/` globally) that ran as slash commands. Google's docs say current workflows stop working on **October 19, 2026**; after that date those directories are no longer indexed or runnable. Google says a new workflows system is coming, and skills are the migration target in the meantime.

The `/migrate-workflows` command converts each workflow into a skill and renames the original file with a `.bak` suffix. If a skill and a workflow share a name, the skill already wins, so you can migrate one workflow at a time.

## Knowledge: What the Agent Retains

Antigravity's docs list Knowledge as one of the agent's core components, alongside the reasoning model, tools, and artifacts. Knowledge items live in the local app data directory (under `~/.gemini/`) with your artifacts, outside the project folder. The CLI's `/context` panel lists tracked knowledge, artifact, and skill files.

The docs do not describe in detail how knowledge items are generated or when they are loaded, so do not depend on them for anything critical. Treat knowledge as a convenience that can save the agent from re-researching your project, and put anything that must persist (architecture decisions, conventions, troubleshooting steps the team relies on) in rules or skills checked into the repository.

## Artifacts: The Transparency System

Antigravity creates artifacts that make the agent's work reviewable: implementation plans, walkthroughs, code diffs, architecture diagrams, screenshots, and browser recordings.

### Implementation Plan

The agent uses the implementation plan to lay out technical changes before it modifies code. Use the `/plan` command when you want structured planning and requirements discovery first. You review the plan, comment on it, and only then let the agent proceed.

### Walkthrough

The agent creates a walkthrough when it completes the implementation. It summarizes the changes made and how they were tested, and serves as a record that teammates can review.

### Why Artifacts Matter for Context

Artifacts create a structured record you can point the agent at in a later conversation. Asking it to read the previous plan and walkthrough is far cheaper than having it re-analyze the codebase from scratch.

## Thinking About Context Levels in Antigravity

### Minimal Context (Quick Tasks)

For simple questions or small fixes, just ask. Antigravity can explore the project, read relevant files, and provide answers without additional setup.

### Moderate Context (Feature Work)

For typical feature development, start with `/plan`. The agent will:

1. Analyze the codebase to understand the current architecture
2. Create an implementation plan for your review
3. Execute the plan once approved
4. Verify the changes and produce a walkthrough

Each phase generates artifacts that carry context forward.

### Comprehensive Context (Ongoing Projects)

For sustained work across multiple sessions, invest in rules and skills checked into the repository. They are the context you control, version, and share with the team.

## Models and the Context Window

Antigravity lets you choose the model. As of October 15, 2026, the models page lists Gemini 4 Argon (not available in the Antigravity IDE), Gemini 3.8 Flash, Gemini 3.7 Flash, Gemini 3.6 Flash, Gemini 3.1 Pro, Claude Sonnet 5.5 and Claude Opus 5.5 (Thinking), Claude Sonnet 4.6 and Claude Opus 4.6 (Thinking), and GPT-OSS 120B. The Claude 4.6 models and GPT-OSS 120B are marked for removal on November 2, 2026. Availability varies by plan.

The docs do not publish a single context window figure for Antigravity; the limit is the active model's. In the CLI, `/context` opens a panel showing how much of that window is in use, broken down by user messages, agent responses, tool calls, system prompt, MCP tools, and loaded rules, skills, and plugins. As a conversation grows, Antigravity automatically compacts older turns into checkpoint summaries, and `/rewind` rolls back to an earlier checkpoint.

## Browser Recordings and Visual Context

When the browser subagent interacts with a web page, it can record its actions for your review. This creates a useful form of context: visual proof of work.

For frontend development, this means Antigravity can:

- Navigate to web applications and interact with UI elements
- Take screenshots to verify visual changes
- Record step-by-step interactions you can play back later

These recordings and screenshots sit alongside the walkthrough, giving you visual evidence that changes work as intended.

## MCP Server Support

Antigravity supports MCP servers for connecting to external tools and data sources. In the app and IDE you can add servers from the MCP Store; custom servers go in `mcp_config.json`, either globally at `~/.gemini/config/mcp_config.json` or per workspace at `.agents/mcp_config.json`. In the CLI, `/mcp` opens the MCP Manager.

The file uses a `mcpServers` object. Local servers use `command` (with optional `args`, `env`, and `cwd`); remote Streamable HTTP or SSE servers use `serverUrl`. The legacy `url` and `httpUrl` fields used by Gemini CLI are not supported, so update copied configs. `disabledTools` hides individual tools from the model, which is a cheap way to save context.

### Practical Use Cases

- **Database access:** Let Antigravity query your development database to understand schema and data
- **Git hosting:** Interact with GitHub or GitLab for PR management
- **Documentation systems:** Access internal wikis or knowledge bases
- **Cloud services:** Use Google Application Default Credentials for Google Cloud MCP servers

### When to Use MCP

Use MCP when the task requires information from outside the codebase. For code-only work, Antigravity's built-in file system tools are sufficient. MCP adds the most value for tasks that span multiple systems (for example, updating both code and documentation, or verifying a code change against a running application).

## External Documents: PDFs vs. Markdown

### Markdown Is the Native Format

Rules, skills, and artifacts are all Markdown. If you are creating context documents for Antigravity, use Markdown.

### For External References

You can attach a PDF to a conversation, but for persistent reference material, converting it to Markdown and placing it in the project (or as a skill resource) gives the agent something it can read selectively and you can version in Git.

## Advanced Patterns

### The Skill-Driven Development Pattern

Create Skills for every major workflow in your development process:

- `deploy-staging` for deployment
- `create-api-endpoint` for new endpoints
- `database-migration` for schema changes
- `security-audit` for security reviews

When you need to perform one of these tasks, call the skill with `/<skill-name>` or let the agent pick it from the description. This ensures consistent execution regardless of which team member is working.

### The Layered Rules Pattern

Keep a short root `AGENTS.md` with project-wide conventions, then add `glob` rules for specific file types (for example, SQL migration rules that activate only for `migrations/**`) and `model_decision` rules for topics the agent needs only occasionally. The always-on budget stays small and the narrow rules load only when they apply.

### The Paired Review Pattern

Use the planning step as a design review:

1. Describe the feature or change you want
2. Review the implementation plan Antigravity creates
3. Provide feedback and iterate on the plan
4. Only approve execution once the plan meets your standards

This catches design issues before code is written, saving significant time.

### The Task Decomposition Pattern

For large features, break the work into separate conversations:

1. Tell Antigravity the overall goal and ask for a plan that splits it into subtasks
2. Run each subtask in its own conversation, starting with `/plan`
3. Point each new conversation at the earlier plans and walkthroughs
4. Keep conversations short enough that compaction rarely triggers

## Common Mistakes

1. **Leaving workflows unmigrated.** Legacy workflows stop working on October 19, 2026. Run `/migrate-workflows` or recreate them as skills.

2. **Not creating Skills for repeatable work.** If you find yourself explaining the same workflow multiple times, it should be a Skill.

3. **Skipping the planning step.** Jumping straight to execution means no implementation plan to review. Planning is where Antigravity aligns with your intent.

4. **Not reviewing artifacts.** Implementation plans and walkthroughs are designed for human review. Skipping them defeats the purpose of Antigravity's transparency system.

5. **Over-relying on conversation context.** Conversations get compacted. For information that should persist, put it in rules or skills.

6. **Overstuffing always-on rules.** Always-on and global rules share a 20,000-token budget. Move long, narrow guidance into `glob` or `model_decision` rules.

7. **Copying Gemini CLI MCP configs unchanged.** Antigravity expects `serverUrl` for remote servers, not `url` or `httpUrl`.

## Frequently Asked Questions

### Where do Antigravity rules go?

Project rules go in `AGENTS.md` or `GEMINI.md` in any directory, in `.agents/AGENTS.md` or `.agents/GEMINI.md`, or as modular files in `.agents/rules/*.md`. Global rules go in `~/.gemini/GEMINI.md`, `~/.gemini/AGENTS.md`, or `~/.gemini/config/rules/*.md`. Modular rule files need a `trigger` of `always_on`, `model_decision`, `glob`, or `manual`.

### Are Antigravity workflows being replaced by skills?

Legacy workflows in `.agents/workflows/` stop working on October 19, 2026. Google says a new workflows system is coming, and recommends skills in the meantime. The `/migrate-workflows` command converts workflows to skills and keeps the originals as `.bak` files.

### Where do Antigravity skills live?

Workspace skills live in `.agents/skills/<name>/SKILL.md`. Global skills live in `~/.gemini/config/skills/` for the app and IDE, and in `~/.gemini/antigravity-cli/skills/` for the CLI. Only the `description` field in the frontmatter is required.

### How do I see how much context an Antigravity conversation is using?

In Antigravity CLI, run `/context` to open the Context Usage panel. It shows the share of the model's window in use, a breakdown by category, and how many times the conversation has been compacted.

### How are rules different from skills in Antigravity?

Rules are guidance the agent should follow while it works, injected on every turn or when a trigger matches. Skills are procedures the agent loads only when a task calls for them, either by matching the skill's description or when you type `/<skill-name>`.

## Go Deeper

To learn more about working effectively with AI coding agents and managing context across development workflows, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
