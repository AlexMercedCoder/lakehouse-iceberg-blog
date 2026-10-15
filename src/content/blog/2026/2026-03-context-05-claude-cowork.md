---
title: "Claude Cowork Guide: Instructions, Projects, Scheduled Tasks"
pubDatetime: 2026-03-07T13:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "Claude Cowork runs multi-step tasks for you on paid plans. Set global, folder, and project instructions, connect tools, and schedule work with /schedule."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - claude cowork
slug: 2026-03-context-claude-cowork
draft: false
faqs:
  - question: "What is Claude Cowork?"
    answer: "Cowork brings Claude Code's agentic approach to knowledge work beyond coding: you hand Claude a multi-step task and it works through it, reading and writing files, using connectors, and splitting work into parallel workstreams. It is available in Claude Desktop on macOS and Windows, on the web, on mobile, and in the Claude in Chrome side panel."
  - question: "Which plans include Claude Cowork?"
    answer: "Cowork is available on paid plans. On Pro and Max it runs in the cloud; on Team plans, and on Enterprise plans where an admin has turned it on, cloud Cowork is in beta."
  - question: "How do I give Cowork standing instructions?"
    answer: "Use global instructions for durable preferences (Settings > Cowork, then Edit next to Global instructions, or Instructions for Claude under Settings > General in the newer experience). Add folder instructions when you select a local folder, and use project instructions for work that belongs to one project."
  - question: "How do scheduled tasks work in Cowork?"
    answer: "Type /schedule in any Cowork task, or open Scheduled in the left sidebar. Claude saves your prompt as the task's instructions and runs it on the cadence you choose. Scheduled tasks run in the cloud, so your computer does not need to be awake."
  - question: "How big is Cowork's context window?"
    answer: "On paid plans, Cowork gives Claude Opus 5.5, Sonnet 5.5, and Fable 5.1 a 1 million token window, Haiku 5.5 gets 500K, and Opus 4.6 and Sonnet 4.6 get 200K. Sonnet 5 compacts the conversation automatically at 500K tokens."
---

Claude Cowork represents a fundamentally different approach to AI context management. Unlike chat interfaces where you send messages and receive responses, Cowork brings Claude Code's agentic approach to knowledge work: it reads and writes files in folders you connect, uses your connectors, and executes multi-step tasks with minimal supervision. For knowledge workers who spend their days in documents, spreadsheets, and presentations, Cowork replaces the constant back-and-forth of copy-paste workflows with direct delegation.

This guide covers how to manage context effectively in Cowork, from setting up folder-level instructions to creating reusable workflows that run on schedule. It was reviewed on October 15, 2026 against Anthropic's help articles on [getting started with Cowork](https://support.claude.com/en/articles/13345190), [Cowork on web, desktop, and mobile](https://support.claude.com/en/articles/15520349), [context window sizes](https://support.claude.com/en/articles/8606394), and [computer use](https://support.claude.com/en/articles/14128542).

**The short answer:** Cowork is available on paid plans. On Pro and Max, tasks run in the cloud on Anthropic's servers (cloud Cowork is in beta on Team, and on Enterprise where an admin enables it), and you can start them from Claude Desktop on macOS and Windows, the web, mobile, or the Claude in Chrome side panel. Context comes from global instructions, folder instructions, projects, connectors, and the files you connect. Claude Opus 5.5, Sonnet 5.5, and Fable 5.1 get a 1 million token window in Cowork, and Haiku 5.5 gets 500K.

## How Cowork Differs from Other Claude Interfaces

Cowork is available wherever you use Claude, but the full experience is in Claude Desktop, where Claude can also reach your local files and browser. Cloud sessions reach the folders you connect on your computer only while the desktop app is open. In newer Claude experiences, Cowork is merged with chat: you ask for what you need, and Claude decides whether that is a quick answer or a task. The differences still matter for context management:

| Capability            | Claude Chat                              | Claude Cowork                                 |
| --------------------- | ---------------------------------------- | --------------------------------------------- |
| **Interaction model** | Conversational (you send, it responds)   | Autonomous (you delegate, it executes)        |
| **File access**       | Upload, connectors, or local MCP servers | Direct read/write in folders you connect      |
| **Output location**   | In the chat window                       | On your file system or connected services     |
| **Task duration**     | Minutes (conversational)                 | Minutes to hours (autonomous)                 |
| **Scheduling**        | Manual only                              | Scheduled with /schedule, or on demand        |
| **Parallel work**     | Single conversation thread               | Splits complex work into parallel workstreams |

Because Cowork operates autonomously on your files, context management is less about what you say in a conversation and more about how you structure your file system, instructions, and task definitions.

## Thinking About Context for Autonomous Tasks

When delegating to Cowork, the context equation changes. In a chat, you can course-correct in real time. With Cowork, you define the context upfront and the agent executes on its own. This means your context needs to be more complete and more explicit than in conversational interfaces.

### Before Delegating, Ask:

1. **Does the task have a clear, verifiable end state?** "Organize these files by date" is clear. "Make these files better" is not.
2. **Can I describe the success criteria in writing?** If you cannot articulate what "done" looks like, Cowork will struggle too.
3. **Does Cowork have access to everything it needs?** Files, folders, reference material, and formatting instructions should all be accessible before you start.

### The Delegation Spectrum

**Simple delegation (minimal context):** "Create a summary of every PDF in the /reports folder and save it as summary.md"

**Moderate delegation:** "Generate a weekly status report using the data in /projects/metrics.csv. Follow the format in /templates/weekly-report.md. Save the output to /reports/week-12-report.md"

**Complex delegation:** "Research the competitive landscape for product X by reading the documents in /research/competitors/. Create a presentation in PowerPoint format that covers market positioning, pricing comparison, and feature gaps. Use the company brand guidelines in /brand/style-guide.pdf for formatting."

Each level requires progressively more context, but all of it is provided through file access and instructions rather than conversation.

## Global and Folder Instructions

Cowork uses a layered instruction system that lets you set context at different scopes.

### Global Instructions

Global instructions apply across all Cowork tasks regardless of which folder or project you are working in. In Claude Desktop, open Settings > Cowork and click Edit next to Global instructions; in the newer experience they appear as Instructions for Claude under Settings > General. Keep them to durable preferences, such as:

- Your preferred writing style and tone
- Output format preferences (bullet points vs. prose, heading structure)
- General constraints ("Always use metric units," "Write in American English")
- Your role and expertise level

These function similarly to Custom Instructions in ChatGPT but are specific to Cowork's autonomous execution mode.

### Folder Instructions

Folder instructions add project-specific context when you select a local folder on desktop, and Claude can update them itself during a session. This is where context management gets powerful. You can create different instruction sets for different folders:

- `/work/project-alpha/` might have instructions about project-specific terminology and formatting
- `/work/blog-drafts/` might have instructions about your blog style guide and target audience
- `/work/financial-reports/` might have instructions about compliance requirements and number formatting

Write folder instructions so they refine your global instructions rather than contradict them, which gives you precise control over Cowork's behavior in each context.

### Project Instructions

Cowork projects group related tasks into workspaces with their own files, context, instructions, scheduled tasks, and memory. Project instructions apply only inside that project, so they are the right home for anything that is specific to one client, report, or initiative.

### Writing Effective Instructions

Focus on what Cowork needs to know to complete tasks autonomously:

```markdown
## Project Context

This folder contains marketing materials for Product X.
Target audience: enterprise IT decision-makers.
Tone: professional, authoritative, not salesy.

## File Organization

- /drafts/ contains work-in-progress documents
- /final/ contains approved, publication-ready content
- /assets/ contains images, charts, and data files
- /templates/ contains formatting templates

## Quality Standards

- All claims must be supported by data from the /assets/ folder
- Final documents must follow the template in /templates/standard.docx
- Run a readability check: target Flesch-Kincaid grade 10-12
```

## Connectors, MCP, and Plugins

Cowork reaches beyond your files through connectors, which are built on MCP (Model Context Protocol). Manage them from the "+" menu or Customize > Connectors, and choose a permission mode (Manual, Auto, or Skip). Remote custom connectors work wherever Cowork runs. Local connectors and plugins that include local MCP servers work only through the desktop app. Plugins bundle skills, connectors, and sub-agents for a role or team, and they work in chat and Claude Code too.

### Useful MCP Servers for Knowledge Workers

**Google Drive or OneDrive:** Access cloud-stored documents without downloading them first

**Notion or Confluence:** Read from and write to your team's knowledge base

**Slack:** Pull conversation context or post updates about completed tasks

**Calendar:** Check scheduling context when preparing meeting materials

**Email:** Draft responses based on incoming email content

### When MCP Adds Value for Cowork

MCP is most valuable when Cowork needs information from systems outside your local file system. If you are creating a report that combines local data with information from your company wiki, an MCP server for that wiki lets Cowork access both sources in a single task.

However, for purely local tasks (organizing files, generating documents from local data, processing spreadsheets), MCP adds unnecessary complexity. If the data is already on your machine, direct file access is simpler and faster.

## Scheduled Tasks: Context That Runs Automatically

One of Cowork's distinctive features is task scheduling. Type `/schedule` in any Cowork task, or open Scheduled in the left sidebar, and Claude saves your prompt as the task's instructions and runs it at the cadence you choose. Scheduled tasks run in the cloud, so they do not need your computer to be awake or the desktop app to be open.

### Use Cases for Scheduled Tasks

- **Weekly report generation:** Compile data from multiple sources into a formatted report every Monday
- **Daily email drafts:** Prepare responses to routine communications based on templates
- **Monthly file organization:** Sort and archive documents that have accumulated in download or inbox folders
- **Data processing:** Transform incoming CSV exports into formatted spreadsheets at regular intervals

### Context for Scheduled Tasks

Scheduled tasks need to be fully self-contained. The context must include:

1. **Where to find inputs** (file paths, folders to scan)
2. **What to do with them** (the processing logic)
3. **Where to put outputs** (destination paths)
4. **What quality checks to apply** (validation rules)
5. **What to do when something unexpected happens** (error handling)

Because you are not present during execution, the instructions must anticipate edge cases. For example: "If no new files are found in /inbox/, skip processing and do not create an empty report."

## Sub-Agent Delegation

Cowork breaks complex work into smaller tasks and coordinates parallel workstreams to complete them. This is particularly useful for tasks that involve independent workstreams.

### How Sub-Agents Improve Context Management

Instead of providing one massive context for a complex task, Cowork breaks it into smaller, focused contexts:

- **Sub-agent 1:** "Summarize the financial data in /data/q3-financials.csv"
- **Sub-agent 2:** "Extract key quotes from the customer interviews in /research/interviews/"
- **Sub-agent 3:** "Create a chart comparing year-over-year growth using the data in /data/growth.csv"

Each sub-agent gets a focused context, which typically produces better results than one agent trying to handle everything.

### Monitoring Sub-Agent Progress

Cowork shows its progress as it works, and you can follow or steer a session from the web or mobile while the desktop app stays open. Watch the plan and intervene if something goes off track. This transparency is a context management feature itself because it lets you assess whether the agent's understanding matches your intent before it completes the task.

## Working with External Documents

### PDFs

Cowork can read PDFs directly from your file system. Use PDFs for:

- Published specifications and standards
- Research papers and reports from external sources
- Contracts, legal documents, or compliance materials
- Documents you received from others in PDF format

### Markdown Files

Cowork excels with Markdown because the structure is unambiguous. Use Markdown for:

- Your own notes, outlines, and instructions
- Style guides and formatting templates
- Context documents you create specifically for Cowork
- Any document you plan to update frequently

### The Hybrid Strategy

Keep critical reference material as Markdown in well-organized project folders. Use PDFs for external documents you cannot control. This gives Cowork the cleanest possible context for the documents you author and reasonable access to everything else.

## Advanced Patterns

### The Template-Driven Workflow

Create a template folder with examples of your desired output format. In your folder or project instructions, reference these templates by path. Cowork will pattern-match against them when generating new content.

```
/project/
  /templates/
    blog-post-template.md
    report-template.md
    email-template.md
  /output/
```

This approach gives Cowork concrete examples of "what good looks like" for every type of output it might produce.

### The Progressive Delegation Pattern

Start with simple tasks to build confidence in Cowork's understanding of your context:

1. **Week 1:** File organization and simple summaries
2. **Week 2:** Document generation from templates
3. **Week 3:** Multi-source research and synthesis
4. **Week 4:** Complex deliverables with scheduled execution

Each phase lets you refine your instructions based on how Cowork interprets them.

### The Quality Gate Pattern

For high-stakes outputs, set up a two-stage workflow:

1. **Stage 1:** Cowork generates a draft and saves it to `/drafts/`
2. **Stage 2:** You review the draft and provide feedback
3. **Stage 3:** Cowork revises based on your feedback and saves to `/final/`

This pattern combines autonomous execution with human review, giving you the efficiency of delegation without sacrificing quality control.

## When to Use Cowork vs. Other Claude Interfaces

Cowork is not always the right choice. Here is how it compares for different scenarios:

**Use Cowork when:**

- The task involves creating, transforming, or organizing files on your local machine
- The work can be defined upfront with clear success criteria
- You want to delegate entirely and come back to a finished result
- The task is repeatable and benefits from scheduling

**Use Claude Web when:**

- You want an interactive conversation to explore ideas or get feedback
- The task is primarily knowledge-based (brainstorming, research questions, analysis)
- You need artifacts like code demos or documents that persist in a conversation

**Use Claude Desktop chat when:**

- You need local MCP servers during an interactive conversation
- You need the conversational interaction model with live external data

Computer use, where Claude clicks and types in desktop apps, lives in Cowork and Claude Code inside the desktop app (beta, Pro and Max, macOS and Windows), not in regular chat.

**Use Claude Code when:**

- You are working on a software codebase
- You need the agent to navigate code, run tests, and make pull requests
- You want terminal-level interaction with coding-specific tools

## Common Mistakes

1. **Vague task definitions.** "Make these documents better" gives Cowork nothing to work with. Specify what "better" means: more concise, better formatted, restructured for a different audience, updated with new data.

2. **Skipping folder and project instructions.** Without them, Cowork uses only global context and its general training. Folder instructions are what make Cowork effective for your specific workflow.

3. **Over-scoping tasks.** A single task that says "create an entire marketing strategy" is too broad. Break it into research, analysis, drafting, and formatting phases.

4. **Not reviewing outputs.** Cowork runs autonomously, but that does not mean blindly accepting its output. Always review, especially for scheduled tasks that run without your active oversight.

5. **Ignoring the file system.** Cowork works with files. If your files are disorganized, Cowork's output will be disorganized. Invest in clean folder structures before delegating.

6. **Underusing parallel workstreams.** If a task has independent workstreams, say so and let Cowork split it up. Trying to force everything into a single linear execution path is slower and produces worse results.

## Frequently Asked Questions

### What is Claude Cowork?

Cowork brings Claude Code's agentic approach to knowledge work beyond coding: you hand Claude a multi-step task and it works through it, reading and writing files, using connectors, and splitting work into parallel workstreams. It is available in Claude Desktop on macOS and Windows, on the web, on mobile, and in the Claude in Chrome side panel.

### Which plans include Claude Cowork?

Cowork is available on paid plans. On Pro and Max it runs in the cloud; on Team plans, and on Enterprise plans where an admin has turned it on, cloud Cowork is in beta.

### How do I give Cowork standing instructions?

Use global instructions for durable preferences (Settings > Cowork, then Edit next to Global instructions, or Instructions for Claude under Settings > General in the newer experience). Add folder instructions when you select a local folder, and use project instructions for work that belongs to one project.

### How do scheduled tasks work in Cowork?

Type `/schedule` in any Cowork task, or open Scheduled in the left sidebar. Claude saves your prompt as the task's instructions and runs it on the cadence you choose. Scheduled tasks run in the cloud, so your computer does not need to be awake.

### How big is Cowork's context window?

On paid plans, Cowork gives Claude Opus 5.5, Sonnet 5.5, and Fable 5.1 a 1 million token window, Haiku 5.5 gets 500K, and Opus 4.6 and Sonnet 4.6 get 200K. Sonnet 5 compacts the conversation automatically at 500K tokens.

## Go Deeper

To learn more about working effectively with AI agents and context management strategies, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
