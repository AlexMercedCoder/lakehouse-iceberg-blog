---
title: "ChatGPT Memory vs Custom Instructions vs Projects (2026)"
pubDatetime: 2026-03-07T09:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "Custom instructions set rules for every chat, memory keeps facts about you, and Projects bundle chats, files, and instructions for one body of work."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - chatgpt
slug: 2026-03-context-chatgpt
draft: false
faqs:
  - question: "What is the difference between ChatGPT memory and custom instructions?"
    answer: "Custom instructions are rules you write once and ChatGPT applies to every chat, such as tone, format, and your role. Memory is what ChatGPT learns about you over time: saved memories you ask it to keep, plus details it can reference from past chats. Use custom instructions for how to answer and memory for facts about you."
  - question: "How do ChatGPT Projects work with memory?"
    answer: "Each project uses default memory or project-only memory. With project-only memory, your saved memories are not referenced and chats can only draw on other conversations in the same project. Shared projects always use project-only memory."
  - question: "Do project instructions override custom instructions?"
    answer: "Yes. Project instructions apply only inside that project and override your global custom instructions there."
  - question: "How many files can I add to a ChatGPT project?"
    answer: "Free allows 5 files per project, Go and Plus allow 25, and Pro, Business, Enterprise, and Edu allow 40. You can upload 10 at a time, and each text or document file is capped at 512 MB and 2 million tokens."
  - question: "How big is ChatGPT's context window?"
    answer: "The ChatGPT pricing page lists Instant model windows of 27K tokens on Free, 54K on Go and Plus, and 128K on Pro, and Reasoning model windows of 256K on Go and Plus and 400K on Pro. The space for your own input is smaller because instructions, memories, and reasoning share the window."
---

Getting consistently useful results from ChatGPT requires more than writing good prompts. The real differentiator is how you manage context: the background information, instructions, documents, and accumulated knowledge that shapes every response ChatGPT generates. Without deliberate context management, you end up repeating yourself, getting generic answers, and wasting time course-correcting the AI.

**The short answer:** custom instructions are standing rules ChatGPT applies to every chat (up to 1,500 characters on Free and Go, 5,000 on paid plans). Memory is what ChatGPT learns about you: saved memories you ask it to keep, plus details it can reference from past chats. Projects are workspaces that bundle chats, files, and project instructions, and those instructions override your global custom instructions inside the project. Use custom instructions for how you want answers, memory for facts about you, and a project for any body of work with its own files.

This guide was reviewed on October 15, 2026 against OpenAI's help articles on [custom instructions](https://help.openai.com/en/articles/8096356-chatgpt-custom-instructions), [memory](https://help.openai.com/en/articles/8590148-memory-in-chatgpt), [projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt), and [file uploads](https://help.openai.com/en/articles/8555545-uploading-files-and-audio-to-chatgpt), plus the [ChatGPT pricing page](https://chatgpt.com/pricing/). Plans and limits change, so treat those pages as the authority.

It covers every context management tool ChatGPT offers, from custom instructions to project workflows, and explains when to use each one.

## What Is Context Management and Why Does It Matter?

Context management is the practice of controlling what information an AI model has access to when generating a response. Every time you interact with ChatGPT, the model processes a "context window," basically the sum of all text it can see at once, including your conversation history, uploaded files, system instructions, and memory. The quality of the response depends directly on how well you curate that window.

Poor context management looks like this:

- Repeating your role, preferences, and constraints in every new conversation
- Uploading the same reference documents over and over
- Getting responses that ignore your project's specific terminology or conventions
- Spending more time correcting the AI than doing actual work

Good context management means ChatGPT already knows your background, has access to relevant documents, follows your preferred style, and builds on previous conversations without you manually re-establishing all of that every time.

## How Big Is ChatGPT's Context Window?

It depends on your plan and on whether you are using an Instant or a Reasoning model. The ChatGPT pricing page lists these total context windows:

| Plan | Instant total window | Reasoning total window |
| ---- | -------------------- | ---------------------- |
| Free | 27K tokens           | Varies                 |
| Go   | 54K tokens           | 256K tokens            |
| Plus | 54K tokens           | 256K tokens            |
| Pro  | 128K tokens          | 400K tokens            |

The space you can actually fill with your own input is smaller, because the same window also holds system instructions, tools, memories, and the model's reasoning and reply. OpenAI estimates the Instant input maximum at roughly 12 pages of text on Free, 40 on Go and Plus, and 250 on Pro. The current lineup is the GPT-6 family (GPT-6.1 Sol, GPT-6 Sol, GPT-6 Luna, and GPT-6 Astra for Pro reasoning), and which models you can pick depends on your plan.

## Thinking About the Right Level of Context

Before configuring any tools, think about what level of context a given task actually needs. Not every conversation requires the same depth.

### Minimal Context (Quick Questions)

For simple factual questions, brainstorming, or one-off tasks, you often need zero setup. Just ask the question. Adding unnecessary context actually dilutes the model's attention and can lead to worse responses. If you are asking "What is the difference between TCP and UDP?" you do not need to upload your network architecture docs.

### Moderate Context (Focused Work)

For tasks like drafting emails, reviewing code snippets, or writing sections of a document, provide the immediately relevant information in the conversation. Paste the specific text you are working with, reference the specific style or tone you want, and state any constraints. This keeps the model focused without overwhelming it.

### Comprehensive Context (Extended Projects)

For ongoing projects, research, or multi-session work, use ChatGPT's structured context tools (Projects, Memory, and skills or plugins). This is where deliberate context management pays the biggest dividends. You define the context once and it persists across every conversation in that workspace.

### How to Decide

Ask yourself: "If I handed this task to a knowledgeable colleague, what would I need to tell them before they could start?" If the answer is "nothing, just the question," use minimal context. If you would need to hand them a style guide, a codebase overview, and three reference documents, set up a Project.

## Custom Instructions: Your Global Defaults

Custom Instructions are the most basic and most overlooked context management tool in ChatGPT. They apply to every conversation you have, except inside a Project, where project instructions take over.

### How They Work

On web and desktop, open **Settings > Personalization**, make sure **Enable customization** is on, and write in the **Custom Instructions** field. On iOS and Android the same field lives under **Settings > Customize ChatGPT**. Changes apply immediately to all chats. Free and Go users can save up to 1,500 characters; Plus, Pro, Business, Enterprise, and Education users can save up to 5,000.

Cover two things in that field:

1. **Who you are:** Your role and what background knowledge to assume. For example: "I am a senior data engineer working with Apache Iceberg, Spark, and Python. I build data lakehouse architectures for financial services companies."

2. **How to respond:** Your preferred output format, tone, and constraints. For example: "Be concise. Use code examples in Python unless I specify otherwise. Skip basic explanations of concepts I already know. Never use em dashes."

### Best Practices

- Keep instructions specific and actionable. "Be helpful" is useless. "When I ask about SQL, always format queries with uppercase keywords and include comments explaining each join" is useful.
- Update them as your needs change. If you switch projects or roles, update your instructions.
- Use negative constraints. Telling ChatGPT what NOT to do is often more effective than listing everything it should do.
- Do not overload them. The 1,500 or 5,000 character limit is a hint: use them for universal preferences, not project-specific details.

### Limitations

Custom Instructions are global. They apply everywhere unless overridden by project instructions. If you work across multiple domains (coding, writing, research), your instructions need to be general enough to help everywhere without being so vague they help nowhere. For domain-specific work, use Projects instead.

## Memory: Persistent Knowledge Across Conversations

ChatGPT's Memory feature allows the model to remember facts, preferences, and context across conversations without you re-stating them.

### How Memory Works

Memory controls live under **Settings > Personalization > Memory**, and they come in two parts:

- **Saved memories:** Details you explicitly ask ChatGPT to remember, or that it saves as useful context: "User prefers Python over JavaScript," "User's company uses PostgreSQL 15." Saved memories are stored separately from your chats, so deleting a chat does not delete a memory created from it.
- **Reference chat history:** ChatGPT draws on relevant details from past conversations. This is less fixed than saved memories; what it derives can change as ChatGPT updates what is most useful. Turning off Reference saved memories also turns off Reference chat history.

You can explicitly tell ChatGPT to remember things: "Remember that my team uses the Google style guide for Python." You can ask it what it remembers, review the memory summary, and correct or delete items. When a reply uses personal context, a **Sources** marker under the response shows which memory, past chat, or custom instruction shaped it. Exact controls vary by plan, region, and workspace.

### When to Use Memory

Memory is best for facts that apply broadly across conversations:

- Your technical stack and preferences
- Your role and expertise level
- Recurring project names or team members
- Style preferences that should persist everywhere

### When NOT to Use Memory

Memory is not a substitute for Projects or file uploads. It stores brief facts, not documents or complex context. Do not try to make ChatGPT "memorize" an entire API specification through Memory. Use file uploads for that.

### Temporary Chats

If you want a conversation that stays out of Memory (for example, helping someone else with their problem or exploring a sensitive topic), use **Temporary Chat**. Temporary chats never create or update memories. Before you start one, choose **Unpersonalized** if you also want it to ignore your existing memories and custom instructions; that choice cannot be changed after the chat begins.

## Projects: Dedicated Workspaces for Focused Work

Projects are ChatGPT's most powerful context management feature for sustained work. A Project is a dedicated workspace that groups related conversations, uploaded files, and custom instructions.

### Setting Up a Project

1. Select **New project** in the sidebar
2. Give it a descriptive name, icon, and color
3. Add **project instructions** from the project's ••• menu under **Project settings**. They apply only inside the project and override your global Custom Instructions there.
4. Add **files**: PDFs, spreadsheets, docs, images, or pasted text. The limit is 5 files per project on Free, 25 on Go and Plus, and 40 on Pro, Business, Enterprise, and Edu, uploaded at most 10 at a time. You can also add Google Drive files and folders or Slack channels as sources, and save a useful chat response back into the project.
5. Start conversations within the project, or move existing chats into it (chats created with a GPT cannot be moved)

### Project Memory

Each project uses either **default memory** or **project-only memory**, chosen when you create it and changeable later in Project settings. With project-only memory, your saved memories are not referenced, and chats can reference other conversations in the same project but nothing outside it. With default memory on Plus and Pro, ChatGPT uses your saved memories and prioritizes the project's chats and files when you ask a question there. Project-only memory is the better choice when you want a clean room for a client or a topic.

### Project Instructions vs. Custom Instructions

Project Instructions are scoped to the Project. They are the right place for:

- Project-specific terminology and conventions
- The structure or outline of what you are building
- Style guides or formatting requirements specific to this work
- Background context about the domain

Think of Custom Instructions as your personal defaults and Project Instructions as the briefing document for a specific engagement.

### File Management in Projects

You can upload various file types to a Project's knowledge base:

| File Type         | Best For                                                 |
| ----------------- | -------------------------------------------------------- |
| **PDF**           | Reference documentation, research papers, specifications |
| **CSV/Excel**     | Data samples, structured reference data                  |
| **Text/Markdown** | Style guides, code snippets, outlines, notes             |
| **Images**        | Diagrams, mockups, screenshots for visual context        |

Per-file limits apply everywhere in ChatGPT: documents can be up to 512 MB and are capped at 2 million tokens per text or document file, spreadsheets top out around 50 MB, and images at 20 MB each.

### When to Use PDFs vs. Markdown

This is a practical question that matters more than most people realize.

**Use PDFs when:**

- The document is a published specification, whitepaper, or research paper
- Layout and formatting matter (tables, figures, page references)
- You have the document in PDF form and do not want to convert it

**Use Markdown when:**

- You are creating context documents specifically for ChatGPT
- You want the AI to parse the content with maximum accuracy
- The content is structured text (code standards, API docs, outlines)
- You plan to update the document frequently

Markdown is generally a better format for AI consumption. The structure is unambiguous, there are no encoding issues from PDF extraction, and the content is more reliably parsed. If you are creating a reference document from scratch to guide ChatGPT, write it in Markdown.

### Project Sharing

Project sharing is available on every plan, from Free to Enterprise. Invitees get chat or edit access to the project's chats, files, and instructions. Shared projects automatically switch to project-only memory and cannot see any member's personal memories or custom instructions, which keeps one person's context from leaking into the team's answers. Free projects allow 5 collaborators, Go and Plus 10, and Pro and workspace plans 100.

## Custom GPTs, Skills, and Plugins: Reusable Workflows

Custom GPTs used to be the answer for repeatable tasks. That is changing. OpenAI's help center says it plans to retire custom GPTs and recommends moving those workflows to **Plugins**. Personal accounts (Free, Go, Plus, and Pro) can no longer create or publish new GPTs, though existing GPTs remain usable and editable where your plan allows. For affected Enterprise workspaces, retirement is planned for December 11, 2026, and other plans are expected to follow.

### What Replaces Them

A plugin bundles **skills** (reusable instructions and workflow guidance) with **connected apps** (links to external services such as Slack or Google Drive). A plugin can contain only skills and no app at all, which makes a skill the closest replacement for a GPT's instructions. When a GPT is migrated, its instructions become a skill inside the new plugin. ChatGPT uses installed plugins automatically when they are relevant, or you can call one with an @ mention.

### When to Use a Skill or Plugin vs. a Project

| Feature           | Project                             | Skill or Plugin                            |
| ----------------- | ----------------------------------- | ------------------------------------------ |
| **Best for**      | Extended work on a specific project | Repeatable tasks across different projects |
| **Context scope** | One body of work                    | One type of task                           |
| **Holds files**   | Yes                                 | Through skills and connected apps          |
| **Shareable**     | Yes (collaborators)                 | Yes (share a skill or a plugin)            |
| **Example**       | "Q3 Marketing Campaign"             | "Technical Blog Editor"                    |

A skill is like hiring a specialist. A Project is like setting up a war room for a specific mission.

### Writing Effective Reusable Instructions

- Write detailed behavioral instructions: the role, tone, output format, and constraints, scoped to one task.
- Name reference files descriptively. "company-style-guide-2026.md" is better than "doc1.pdf."
- Include a table of contents or summary at the top of large documents so ChatGPT can navigate them.
- Keep individual files focused. Ten small, focused files work better than one 200-page PDF.
- Test after setup. Ask questions that require specific sections of your documents to confirm they are being used.

## MCP Server Support

ChatGPT can connect to custom Model Context Protocol (MCP) servers, which expose external tools and data to the chat. According to OpenAI's help center, custom MCP server connections with full MCP support (including write and modify actions) are available to ChatGPT Business, Enterprise, and Edu workspaces on ChatGPT web. In the current experience you add one from **Plugins** by entering the server's public HTTPS endpoint (or a Secure MCP Tunnel), configuring authentication, and acknowledging a risk warning. On Business plans only admins and owners can create and publish these connections; Enterprise and Edu admins can delegate the permission with role-based access control. Availability on individual plans differs, so check your own Plugins page.

### What MCP Enables

- Fetch data from external systems (database queries, API lookups)
- Update external systems (create tickets, update records) where write actions are allowed
- Combine several apps in one workflow from the chat

### Why MCP Is Worth Learning

The same MCP server you connect to ChatGPT also works with Claude, Cursor, Codex, and other MCP-compatible tools, so the integration work is portable in a way that GPT Actions never were.

### Security Considerations

Write actions are powerful and risky. Test MCP server connections before publishing them to a workspace, especially servers that can modify external systems, and watch for prompt injection when a server returns content from untrusted sources.

## Structuring Context for Maximum Effectiveness

Beyond the tools themselves, how you structure the information you give ChatGPT matters significantly.

### The Inverted Pyramid

Put the most important context first. Language models tend to use information at the beginning and end of a long context more reliably than material buried in the middle. Structure your information like a news article:

1. **Lead:** The task, constraint, and desired output format
2. **Body:** Supporting details, reference material, examples
3. **Background:** Nice-to-have context that might help but is not critical

### Be Explicit About What You Want

Vague requests get vague results. Compare:

**Vague:** "Help me with my database."
**Specific:** "Review this PostgreSQL query for performance issues. The table has 50 million rows, is partitioned by date, and has indexes on customer_id and order_date. Suggest index changes or query rewrites that would reduce execution time."

The specific version gives ChatGPT enough context to provide actionable advice. The vague version will produce a generic tutorial.

### Use Reference Examples

When you want a specific output format or style, give ChatGPT an example. "Write a commit message in this style: [example]" is far more effective than describing the style in abstract terms. Examples are compressed context. One good example communicates more than a paragraph of description.

### Manage Conversation Length

Long conversations degrade response quality. As the conversation history grows, ChatGPT has less room in its context window for your actual question and the reasoning needed to answer it. For extended work:

- Start new conversations for new topics, even within the same Project
- Summarize progress before starting a new conversation ("Here is where we left off: [summary]")
- Use Projects so you do not lose the files and instructions when you start fresh

## Advanced Patterns

### The Briefing Document Pattern

Create a Markdown file that serves as a comprehensive briefing for ChatGPT. Include:

```markdown
# Project: [Name]

## Overview

[2-3 sentence summary of what this project is]

## Goals

- [Specific goal 1]
- [Specific goal 2]

## Constraints

- [Technical constraints]
- [Style/format constraints]

## Key Terminology

- **Term 1:** Definition specific to this project
- **Term 2:** Definition specific to this project

## Current Status

[Where the project stands right now]

## What I Need Help With

[Specific areas where ChatGPT should focus]
```

Upload this as a Project file or paste it at the start of key conversations. It gives ChatGPT a structured, scannable overview that dramatically improves response relevance.

### The Iterative Refinement Loop

For complex outputs (long documents, code architectures, research reports):

1. Start with a high-level outline and get ChatGPT's feedback
2. Refine the outline based on the feedback
3. Generate content section by section, reviewing each before moving on
4. Use follow-up prompts to refine specific sections
5. Do a final consistency pass

This approach keeps the context focused at each step rather than asking ChatGPT to hold the entire deliverable in mind at once.

### Specialized Workflows

For complex projects, split the work across focused setups:

- A research project with academic papers and data sources
- A writing skill with your style guide and brand voice instructions
- A code review skill with your codebase standards and architecture docs

Feed the output of one into the next. This keeps each setup focused on what it does best instead of trying to make one conversation do everything.

## Common Mistakes to Avoid

1. **Overloading context:** More is not always better. If you upload 25 files but your question only relates to one, the AI may pull irrelevant information from the other 24. Be selective.

2. **Ignoring Custom Instructions:** Many users never set them up, then wonder why ChatGPT gives generic responses. Spending 10 minutes on Custom Instructions saves hours of correction.

3. **Not using Projects for project work:** Having 50 disconnected conversations about the same project means ChatGPT has no persistent context. Use Projects.

4. **Treating Memory as a database:** Memory stores brief facts, not documents. If you need ChatGPT to reference a 30-page specification, upload it as a file.

5. **Never clearing context:** Sometimes the best thing to do is start a fresh conversation. If ChatGPT seems confused or is repeating mistakes, the conversation history may be working against you.

## Recommended Workflow for New Users

1. **First 10 minutes:** Set up Custom Instructions with your role, expertise level, and response preferences
2. **First project:** Create a Project, upload 2-3 key reference documents, and write Project Instructions
3. **First week:** Turn on Memory and let it accumulate useful facts. Review the memory summary and Sources periodically and correct anything stale.
4. **First month:** If you find yourself doing the same type of task repeatedly, turn it into a skill.

## Frequently Asked Questions

### What is the difference between ChatGPT memory and custom instructions?

Custom instructions are rules you write once and ChatGPT applies to every chat, such as tone, format, and your role. Memory is what ChatGPT learns about you over time: saved memories you ask it to keep, plus details it can reference from past chats. Use custom instructions for how to answer and memory for facts about you.

### How do ChatGPT Projects work with memory?

Each project uses default memory or project-only memory. With project-only memory, your saved memories are not referenced and chats can only draw on other conversations in the same project. Shared projects always use project-only memory.

### Do project instructions override custom instructions?

Yes. Project instructions apply only inside that project and override your global custom instructions there.

### How many files can I add to a ChatGPT project?

Free allows 5 files per project, Go and Plus allow 25, and Pro, Business, Enterprise, and Edu allow 40. You can upload 10 at a time, and each text or document file is capped at 512 MB and 2 million tokens.

### How big is ChatGPT's context window?

The ChatGPT pricing page lists Instant model windows of 27K tokens on Free, 54K on Go and Plus, and 128K on Pro, and Reasoning model windows of 256K on Go and Plus and 400K on Pro. The space for your own input is smaller because instructions, memories, and reasoning share the window.

## Go Deeper

To learn more about working effectively with AI tools, including detailed context management strategies for coding, research, and professional workflows, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
