---
title: "OpenWork Guide: Open-Source Claude Cowork Alternative"
pubDatetime: 2026-03-07T19:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "OpenWork is a free, open-source desktop agent built on OpenCode. Context comes from your workspace folder, SKILL.md skills, MCP connectors, and saved sessions."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - openwork
slug: 2026-03-context-openwork
draft: false
faqs:
  - question: "What is OpenWork?"
    answer: "OpenWork is an open-source desktop app maintained by Different AI and built on OpenCode, where AI agents work on files in folders you authorize. Its repository describes it as the open-source alternative to Claude Cowork, and it runs on macOS, Windows, and Linux."
  - question: "Does OpenWork have memory across chats?"
    answer: "Not as a separate memory database. Cross-chat memory comes from saved session history: the agent can search sessions and read recent messages from one when you ask, but old chats are not injected into new prompts automatically."
  - question: "How do skills work in OpenWork?"
    answer: "Skills are SKILL.md playbooks the agent loads when a task matches. You can keep one local in the workspace (for example .opencode/skills/<name>/SKILL.md) or ask OpenWork to turn a finished chat into a private cloud skill you can share later."
  - question: "Is OpenWork free?"
    answer: "The desktop app is MIT-licensed and free, with no sign-in needed to use it locally. The Team plan for shared skills, keys, and cloud automations is $10 per seat per month, and Enterprise is priced per deployment."
  - question: "Which models does OpenWork support?"
    answer: "OpenWork works with 50+ model providers. You can bring your own API key, sign in with ChatGPT, use Gemini or Vertex AI, or run local models through Ollama, LM Studio, or another OpenAI-compatible server."
---

OpenWork is an open-source desktop app, maintained by Different AI (`different-ai` on GitHub), where AI agents do real work on files in folders you choose. Its own [GitHub repository](https://github.com/different-ai/openwork) describes it as the open-source alternative to Claude Cowork, and it is built on [OpenCode](https://opencode.ai). The desktop app runs on macOS, Windows, and Linux and is MIT-licensed, and its context management centers on workspaces, skills, connectors, and saved session history.

**The short answer:** OpenWork gives an agent context from four places: the workspace folder you authorize, skills (`SKILL.md` playbooks the agent loads when a task matches), connectors and plugins (MCP services and bundles of skills), and the chat itself. It has no separate long-term memory database; "memory" across chats comes from saved session history that the agent can search and read on request. Durable instructions belong in workspace files or skills, not in an old thread. The desktop app is free and works with 50+ model providers, your own API keys, a ChatGPT sign-in, or local models through Ollama or LM Studio; the Team plan for shared skills and keys is $10 per seat per month.

This guide was reviewed on October 15, 2026 against the [OpenWork repository README](https://github.com/different-ai/openwork) (latest release v0.18.58), and the official docs on [cross-chat memory](https://openworklabs.com/docs/start-here/do-work-with-it/cross-chat-memory), [creating skills](https://openworklabs.com/docs/start-here/do-work-with-it/create-a-skill-from-chat), and [pricing and licensing](https://openworklabs.com/docs/start-here/pricing-and-licensing). OpenWork ships frequently, so check the [docs](https://openworklabs.com/docs) for current behavior.

## How OpenWork Manages Context

OpenWork builds its context from several layers:

1. **The workspace:** a folder or repository you authorize. OpenWork only works in folders you allow, and it reads files in place rather than from uploaded copies.
2. **Skills:** written instructions in the `SKILL.md` format that the agent loads when a task matches
3. **Connectors and plugins:** MCP services that reach external systems, and plugins that bundle skills, MCP servers, and other components
4. **The session:** the current chat, bound to a model and a reasoning effort level
5. **Saved session history:** past chats the agent can search and read when you ask
6. **Your instructions:** natural language guidance and any briefing files you point it at

The key difference between OpenWork and a chat website is that the work happens on your machine, against your real files. Your files stay local unless you choose the optional cloud features.

## Skills: Reusable Playbooks

Skills in OpenWork are written instructions the agent loads when a task matches. OpenWork uses the same `SKILL.md` format as Claude skills, which is why the official migration guide can move skills from Claude Cowork without rewriting them.

### Where Skills Live

- **Local workspace skill:** a `SKILL.md` file inside the workspace, for example `.opencode/skills/<name>/SKILL.md`. It needs no cloud account and appears in `Settings > Library`, but OpenWork Cloud cannot assign or update it for a team.
- **Personal cloud skill:** when you are signed in and ask OpenWork to create a skill "for me," it saves a private plugin in your OpenWork Cloud organization that only you can use until you share it.
- **Plugin:** a bundle of skills and MCP servers distributed as one unit. When you create a skill, OpenWork wraps it in a small plugin, so "skill or plugin?" rarely needs a decision.

### Create a Skill From Chat

The official workflow is to do the work once, then ask: "Turn what we just did into a reusable skill for me." OpenWork saves it and confirms the name and description. Later you can call it by name or describe the same kind of task and let it trigger. You can also add one from `Settings > Library` by filtering to Skills and selecting `Add skill`.

### Writing a Custom Skill

```markdown
---
name: monthly-report
description: Generate the monthly departmental report from the sales, feedback, and team data folders
---

# Monthly Report Generator

## Inputs Required

- Sales data CSV from data/sales/
- Customer feedback file from data/feedback/
- Team metrics from data/team/

## Process

1. Read and validate all input files
2. Calculate key metrics (revenue, growth, satisfaction scores)
3. Generate narrative summary for each section
4. Format the report using the template in templates/monthly-report.md
5. Save to reports/YYYY-MM-monthly-report.md

## Quality Checks

- All numerical values must be sourced from the input data
- The report must include year-over-year comparisons
- Format all currency values with two decimal places
```

Because the agent decides whether to load a skill from its description, make the description say exactly when it applies. Well-defined skills reduce the amount of context you need to type into each task.

## Sessions and Cross-Chat Memory

Each OpenWork session is a chat bound to a model and a reasoning effort, and sessions are saved so you can come back to them. What OpenWork does **not** have is a separate long-term memory store. According to the official cross-chat memory docs, memory across chats comes from saved session history, and old chats are not automatically injected into new prompts.

### Asking About Past Sessions

Inside the app, the agent can list sessions, search them by title or transcript text, and read recent messages from a session by ID without opening it. So you can ask "Find the session about the pricing page redesign and remind me what we decided." The docs list the limits: lookups cover the sessions loaded for the current app and workspace, transcript reads return a bounded set of recent messages, and this is not yet semantic search over every message. Clear session titles make it work much better.

### Starting Fresh

For unrelated work, start a new session. Carrying over context from a previous project creates noise that degrades the agent's focus, and anything you need again should already be in a workspace file or a skill. The migration guide says it plainly: conversation history does not transfer automatically, so keep important instructions in workspace files or skills rather than relying on an old thread.

## The Workspace: Direct Local Interaction

The workspace folder is one of OpenWork's primary context advantages. The agent reads files in place and writes output directly to your file system. A good first task from the official getting-started steps is simply "Summarize this folder," which confirms the agent can see what you expect.

### Context From Your Workspace

- **Project structures:** The agent can browse directories to understand organization
- **Document contents:** Read text-based files without manual copying
- **Data files:** Process CSVs, JSON files, and other structured data in place
- **Configuration:** Per-workspace settings such as model providers live in `opencode.jsonc` at the workspace root

### Best Practices

- **Organize files before delegating.** A well-structured workspace gives OpenWork better context than a messy one.
- **Use descriptive file names.** `q3-revenue-analysis.csv` gives the agent more context than `data2.csv`.
- **Create a dedicated workspace** for each project or task category.
- **Store templates** in a consistent location so skills can reference them.

## Connectors, Plugins, and MCP

OpenWork's docs describe a small set of building blocks: a **connector** is an MCP service that reaches a system, a **connection** is your own signed-in instance of it, a **skill** is the playbook, a **plugin** is the bundle, and the **Library** is where you see what you have.

### When Connectors Add Value

- **Databases and internal services:** Let OpenWork pull data for report generation
- **Workspace apps:** Google Workspace and Microsoft 365 capabilities are available through OpenWork's MCP
- **Web search:** Exa search can be added as a connector or as an MCP server in your workspace
- **Thin connectors:** When a connector reaches a system but is awkward to use, write skills for that system's rules and bundle them into one plugin

### Configuration

In the desktop app, start in `Settings > Library` and filter by Connectors. Use `Add Custom App` to connect an MCP server that is not listed.

### Using OpenWork From Other Agents

OpenWork also runs the other direction. Its MCP Gateway (`https://api.openworklabs.com/mcp/agent`) brings your assigned skills, plugins, and connections into Codex, Claude Code, Cursor, OpenCode, and other MCP clients. It exposes four tools: `search_capabilities`, `execute_capability`, `list_skills`, and `get_skill`. That means a skill you write once can serve the desktop app and your coding agent alike.

## Thinking About Context Levels

### Simple Tasks (Minimal Context)

For straightforward file operations ("Rename all files in downloads/ to include today's date"), the task description and workspace access provide sufficient context.

### Moderate Tasks

For tasks requiring judgment ("Review the documents in contracts/ and flag any that expire within 30 days"), provide the criteria and desired output format. OpenWork will use any matching skills and its workspace access to execute.

### Complex Tasks

For multi-step workflows ("Create a quarterly business review presentation from data in three different folders, following the template in /templates/"), invest in a detailed briefing file and make sure the relevant skills are installed.

## Structuring Context for Effective Delegation

### The Briefing Document Approach

For complex tasks, create a briefing document that OpenWork reads before starting:

```markdown
# Task Briefing: Q3 Performance Analysis

## Objective

Create a comprehensive performance analysis comparing Q3 results
against Q2 and the same quarter last year.

## Data Sources

- /data/revenue/q3-2026.csv (primary revenue data)
- /data/revenue/q2-2026.csv (previous quarter)
- /data/revenue/q3-2025.csv (year-over-year comparison)
- /data/kpis/team-metrics.json (operational metrics)

## Required Sections

1. Executive Summary (250 words max)
2. Revenue Analysis with charts
3. Year-over-Year Comparison
4. Team Performance Metrics
5. Recommendations

## Formatting

- Use the template at /templates/quarterly-analysis.md
- All percentages to one decimal place
- Currency in USD with comma separators
- Charts as ASCII/text-based tables

## Quality Standards

- Every claim must reference a specific data point
- Include both absolute and percentage change figures
- Flag any anomalies or data gaps
```

This structured briefing gives OpenWork comprehensive context without relying on interactive conversation.

### The Progressive Detail Pattern

Provide context in layers, starting broad and getting specific:

1. **High-level goal:** "Create a monthly financial report"
2. **Specific requirements:** "Include revenue, costs, and margin analysis"
3. **Data locations:** "Source data is in /finance/monthly/"
4. **Quality criteria:** "All numbers must reconcile with the source data"
5. **Output format:** "Follow the template in /templates/"

Each layer adds specificity without contradicting previous layers.

## Multi-Session Coordination

OpenWork agents can create sessions and send prompts to existing sessions by ID without changing what is on your screen, according to the cross-chat memory docs. That supports a simple coordination pattern:

### Parallel Sessions

- **Session 1:** Processes financial data and creates charts
- **Session 2:** Summarizes customer feedback from text files
- **Session 3:** Compiles operational metrics from log files

Each session works with its own focused context, and you combine the results into a final deliverable. Give each session a clear title so it is easy to find and read later.

### Sequential Handoffs

For workflows where each step depends on the previous one:

1. Session A produces raw analysis and saves it to a file
2. Session B reads that file, then reviews and refines the analysis
3. Session C formats the final output

Passing work through files in the workspace is more reliable than relying on one session to read another's transcript, because transcript reads are bounded.

## External Documents: PDFs vs. Markdown

### PDFs

OpenWork can read PDFs directly from your workspace. Use PDFs for:

- Existing reports and documents that are already in PDF format
- External specifications or contracts received from others
- Formatted documents where layout matters

### Markdown

For documents you create specifically for OpenWork (templates, instructions, style guides), use Markdown. It parses more reliably and is easier for the agent to reference precisely.

### The File-Based Advantage

Because OpenWork accesses files directly (not through uploads), the format matters less than it does for web-based tools. Both PDFs and Markdown are readable from the workspace. Choose based on the source: use the original format for received documents, and Markdown for documents you author.

## Advanced Patterns

### The Scheduled Workflow Pattern

OpenWork supports scheduled tasks, and its Team and Enterprise plans include cloud automations. The official migration guide advises recreating each schedule and verifying its workspace, permissions, and output location:

1. Define the task with clear inputs, processes, and outputs, ideally as a skill
2. Schedule it to run at a specific time (daily, weekly, monthly)
3. Confirm the workspace and output folder it will use
4. Review the output when convenient

This is ideal for report generation, data processing, file organization, and routine maintenance tasks.

### The Multi-Step Pipeline Pattern

Chain multiple skills into a pipeline:

1. **Step 1 (Data Collection):** Gather data from multiple sources
2. **Step 2 (Processing):** Clean, transform, and analyze the data
3. **Step 3 (Generation):** Create the output document or presentation
4. **Step 4 (Verification):** Check the output against quality criteria

Each step builds on the context from previous steps, creating a coherent end-to-end workflow.

### The Delegation Escalation Pattern

Start with simple delegations and gradually increase complexity:

- **Week 1:** File organization and simple document creation
- **Week 2:** Data processing and report generation
- **Week 3:** Multi-source research and synthesis
- **Week 4:** Fully automated recurring workflows

This builds your confidence in OpenWork's handling of context while you capture what works as skills and workspace files.

## When to Use OpenWork vs. Other Tools

**Use OpenWork when:**

- Your tasks involve working on local files and folders
- You need multi-step autonomous execution
- You want an open-source, model-agnostic alternative to Claude Cowork
- Your work is document-centric (reports, presentations, data processing)

**Use a terminal agent (Claude Code, Gemini CLI, OpenCode) when:**

- Your work is code-centric
- You live in the terminal and want compilers, test runners, and build tools inline
- You still want OpenWork's skills there: add its MCP Gateway to the terminal agent

**Use a web-based tool (ChatGPT, Claude Web) when:**

- You need interactive conversation and brainstorming
- The task is primarily knowledge-based
- You do not need local file system access

## Common Mistakes

1. **Vague task descriptions.** "Work on my files" gives OpenWork nothing to execute. Specify what files, what action, and what output you expect.

2. **Skipping skills for repeatable work.** If you delegate the same type of task more than twice, ask OpenWork to turn it into a skill.

3. **Not reviewing autonomous output.** Scheduled tasks run without supervision. Always review the results, especially during the first few runs.

4. **Disorganized workspaces.** OpenWork's effectiveness depends on finding and understanding your files. Messy directories produce messy results.

5. **Over-scoping single tasks.** Break large projects into multiple tasks with clear handoff points. OpenWork handles focused, well-defined tasks better than vague, sweeping ones.

6. **Treating chat history as memory.** OpenWork does not inject old chats into new ones. Write decisions into a workspace file or skill so the next session starts with them.

7. **Granting more access than the task needs.** Authorize only the folders a task requires. On Enterprise, admins can set agent permissions to allow, ask first, or block commands, file edits, and websites.

## Frequently Asked Questions

### What is OpenWork?

OpenWork is an open-source desktop app maintained by Different AI and built on OpenCode, where AI agents work on files in folders you authorize. Its repository describes it as the open-source alternative to Claude Cowork, and it runs on macOS, Windows, and Linux.

### Does OpenWork have memory across chats?

Not as a separate memory database. Cross-chat memory comes from saved session history: the agent can search sessions and read recent messages from one when you ask, but old chats are not injected into new prompts automatically.

### How do skills work in OpenWork?

Skills are SKILL.md playbooks the agent loads when a task matches. You can keep one local in the workspace (for example `.opencode/skills/<name>/SKILL.md`) or ask OpenWork to turn a finished chat into a private cloud skill you can share later.

### Is OpenWork free?

The desktop app is MIT-licensed and free, with no sign-in needed to use it locally. The Team plan for shared skills, keys, and cloud automations is $10 per seat per month, and Enterprise is priced per deployment.

### Which models does OpenWork support?

OpenWork works with 50+ model providers. You can bring your own API key, sign in with ChatGPT, use Gemini or Vertex AI, or run local models through Ollama, LM Studio, or another OpenAI-compatible server.

## Go Deeper

To learn more about working effectively with AI agents and context management strategies, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
