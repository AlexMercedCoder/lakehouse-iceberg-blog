---
title: "Perplexity Spaces (Now Projects), Memory, and File Limits"
pubDatetime: 2026-03-07T21:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "Perplexity Spaces are now Projects: up to 10,000 files and 5 GB each, 100 MB per file, 8,000-character instructions. Thread uploads are capped at 40 MB a file."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - perplexity
slug: 2026-03-context-perplexity
draft: false
faqs:
  - question: "What happened to Perplexity Spaces?"
    answer: 'Perplexity''s help center now documents Spaces as Projects, and the old "What are Spaces" article redirects to "What are Projects." A Project keeps searches, files, instructions, links, and connected tools in one hub.'
  - question: "How many files can a Perplexity Project hold?"
    answer: "Up to 10,000 files and 5 GB of total storage, with each file up to 100 MB, according to the Projects help article, which says these limits are the same on every plan. Files attached to an ordinary thread are limited to 40 MB each and count against a weekly allowance."
  - question: "Does Perplexity have memory?"
    answer: "Yes. Memory uses saved memories and, if you allow it, your past searches. You manage it in Settings under Memory, where you can turn each source on or off and delete individual memories. Incognito mode does not use or keep memory."
  - question: "Does Perplexity still have Focus modes?"
    answer: "Not in the old form. The Pro Search documentation describes narrowing searches to sources such as Web, Academic, Finance, and your own files, and Enterprise accounts use a Choose sources menu instead of Focus."
  - question: "How long can Perplexity Project instructions be?"
    answer: "Project instructions can be up to 8,000 characters. They apply to every session in that Project, so use them for role, sourcing rules, and output format."
---

Perplexity AI holds a distinct position among AI tools: it is a research-first assistant that combines conversational AI with real-time web search to produce answers grounded in current, cited sources. Unlike coding-focused tools or general chatbots, Perplexity is built for information retrieval, analysis, and synthesis. Its context management is designed around Spaces (which Perplexity's help center now documents as **Projects**), source selection, Memory, file uploads, and Research mode.

This guide was reviewed on October 15, 2026 against the Perplexity Help Center articles on [Projects](https://www.perplexity.ai/help-center/en/articles/10352961-what-are-projects), [Memory](https://www.perplexity.ai/help-center/en/articles/10968016-memory), [File Uploads](https://www.perplexity.ai/help-center/en/articles/10354807-file-uploads), [Pro Search](https://www.perplexity.ai/help-center/en/articles/10352903-what-is-pro-search), and [local and remote MCPs](https://www.perplexity.ai/help-center/en/articles/11502712-local-and-remote-mcps-for-perplexity). Perplexity changes features and limits often, so treat those pages as the authority.

**The short answer:** Spaces are now Projects, and the old "What are Spaces" help link redirects to the Projects article. A Project keeps searches, files, instructions (up to 8,000 characters), links, and connected tools in one place, and holds up to 10,000 files and 5 GB of storage with each file up to 100 MB. Files you attach to an ordinary thread are limited to 40 MB each and count against a rolling weekly allowance. Memory lives in Settings, under Memory, where you control saved memories and whether past searches are used.

## How Perplexity Manages Context

Perplexity builds context from several sources:

1. **Web search results** - real-time retrieval of current information
2. **Projects (formerly Spaces)** - persistent workspaces with files, instructions, links, and connectors
3. **Source selection** - the focus that controls where Perplexity searches
4. **Conversation history** - the thread of questions and answers in the current session
5. **Uploaded files** - documents you attach for analysis
6. **Memory** - saved memories and past searches Perplexity can draw on across conversations

The key difference from other AI tools is that Perplexity searches the web by default. Its context combines your instructions and files with fresh information from the internet, producing answers with citations you can verify.

Perplexity does not publish a single context window figure. The limit depends on the model handling your request, and the model selector (which offers models from Perplexity, OpenAI, Anthropic, Google, and others, varying by plan) is the authoritative list for your account.

## Projects (Formerly Spaces): Persistent Research Workspaces

Projects are Perplexity's equivalent of Projects in other AI tools. A Project keeps searches, files, instructions, and connected tools in one hub, along with the Project's session history.

### Setting Up a Project

1. Create a new Project with a descriptive name
2. Add **instructions** in its settings (up to 8,000 characters)
3. Upload **files**, individually or as folders, or add them from connected sources
4. Add **links and domains** you want Perplexity to prioritize
5. Choose which **connectors** the Project uses, with connector-specific instructions if needed

### Project Instructions

Instructions in a Project function like a system prompt for every session within it:

```markdown
# Research Project: Renewable Energy Markets

## Role

You are a market research assistant focused on renewable energy.

## Requirements

- Cite all claims with sources less than 6 months old
- Include market size and growth rate data when available
- Compare data across geographic regions when relevant
- Flag any statistics from sources over 1 year old

## Format

- Use structured sections with clear headers
- Include a "Sources" section at the end of every response
- Present data in tables when comparing multiple items
```

### Files in Projects

Projects accept any file type for persistent reference:

| File Type         | Use Case                                  |
| ----------------- | ----------------------------------------- |
| **PDF**           | Research papers, reports, whitepapers     |
| **Documents**     | Analysis templates, style guides          |
| **Spreadsheets**  | Data for analysis and comparison          |
| **Text/Markdown** | Notes, outlines, custom context documents |

The help center sets the Project limits at 10,000 files and 5 GB of total storage, with each file up to 100 MB, and says those limits are the same on every plan. (The plan comparison page lists a lower per-project upload count for Pro, so check your account if you hit a limit.) Files added from connectors are one-time copies and do not update when the original changes. Files in a Project are available across all sessions in it, so you upload a report once and reference it everywhere.

### Brain and Sharing

Projects can also build **Brain**, an ongoing memory of the work done in the Project. Brain is a Max subscriber feature tied to Perplexity Computer. Projects are private by default; you can invite contributors with Owner, Can edit, or Can view roles (up to 5 contributors on a personal account).

### When to Create a Project

- You are researching a topic across multiple sessions
- You have reference documents you want the AI to consult alongside web results
- You need consistent response formatting and focus
- You are working on a project that requires accumulating research over time

## Source Selection: Controlling Search Scope

Perplexity's older Focus Modes (All, Academic, Writing, Math, Video, Social) have been reworked. The current Pro Search documentation describes narrowing a search to specific content types such as **Web**, **Academic**, **Finance**, and **your own files**. In Enterprise organizations, Focus has been replaced by **Choose sources** in the search bar, with options for Web, Org Files, Web plus Org Files, or None, and the Org Files source is being retired in favor of Projects and file connectors.

| Source       | What it searches                    | Best For                                |
| ------------ | ----------------------------------- | --------------------------------------- |
| **Web**      | The open internet                   | General research, broad questions       |
| **Academic** | Scholarly and peer-reviewed sources | Scientific research, literature reviews |
| **Finance**  | Financial data and filings          | Market, company, and earnings questions |
| **Files**    | Your uploaded or connected files    | Questions about your own documents      |

The exact options shown depend on your plan and app, so check the source picker in your search bar.

### Using Sources as Context Filters

Source selection is a form of context management because it determines what kind of information reaches the model. Choosing the right source prevents irrelevant results from diluting the response:

- **Researching a technical specification?** Use Web for comprehensive coverage
- **Writing a literature review?** Use Academic to prioritize scholarly sources
- **Analyzing a company?** Use Finance for financial data
- **Asking about your own documents?** Search your files, or work inside a Project that holds them

### Switching Sources Mid-Research

You can change sources between questions. A common pattern:

1. Start with Academic to find foundational research
2. Switch to Web for industry reports and market data
3. Search your files to compare findings with your own documents
4. Ask for the synthesis in the same thread so the gathered context carries over

Each source shapes the context differently, giving you control over the type of information the model works with.

## Thinking About Context Levels

### Quick Questions (Minimal Context)

For factual questions with clear answers, just ask. Perplexity will search the web and return a sourced response:

"What is the current market size of the global data analytics industry?"

No Project, no file uploads, no special source selection needed. Perplexity's default behavior handles this well.

### Focused Research (Moderate Context)

For deeper exploration, create a Project with instructions and upload relevant reference material:

"Based on the market report I uploaded and current web data, compare the growth trajectories of the three largest cloud providers in the data analytics space."

The combination of uploaded files (for baseline data) and web search (for current information) produces comprehensive analysis.

### Extended Research Projects (Comprehensive Context)

For multi-week research, use a fully configured Project with detailed instructions, multiple uploaded documents, prioritized links, and deliberate source switching. Build on previous sessions by referencing insights from earlier threads.

## Research Mode (Deep Research)

Perplexity's Research mode, which older material calls Deep Research, performs multi-step research on its own. Select "Research" from the mode selector in the search box. The system:

1. Analyzes your question and creates a research plan
2. Runs dozens of searches across diverse sources
3. Reads and reasons through the material, refining its plan as it learns
4. Synthesizes findings into a comprehensive report
5. Provides structured output with citations

Free users get limited Research access (the plan comparison page lists one per month), and paid plans get more. You cannot pick the model in Research mode; Perplexity chooses it. Finished reports can be exported or turned into a Perplexity Page.

### Context Management for Research Mode

Research mode benefits from clear, specific prompts. Because it runs autonomously, your initial prompt is the primary context it works from:

**Less effective:** "Tell me about AI in healthcare"

**More effective:** "Research the current state of AI-powered diagnostic tools in radiology. Focus on: (1) FDA-approved systems as of 2026, (2) clinical accuracy compared to human radiologists, (3) adoption rates across US hospitals, and (4) barriers to wider adoption. Prioritize peer-reviewed sources and official regulatory data."

The specific prompt gives Research mode a structured plan to follow, producing a more focused and useful report.

## Structuring Prompts for Effective Context

### The Research Question Framework

Structure your prompts using this framework for best results:

1. **Topic:** What are you researching?
2. **Scope:** What specific aspects matter?
3. **Sources:** What type of sources do you want?
4. **Recency:** How current must the information be?
5. **Format:** How should the response be structured?

Example: "Research [topic]. Focus on [scope]. Prioritize [source type] from [time period]. Present findings as [format]."

### Follow-Up Strategies

Perplexity maintains conversation context within a thread. Use follow-ups strategically:

- **Drilling down:** "Tell me more about point 3 from your previous response"
- **Pivoting:** "How does this compare to the European market?"
- **Validating:** "Find additional sources that support or contradict the statistics you cited"
- **Updating:** "What has changed on this topic in the last 3 months?"

Each follow-up builds on the accumulated context of the conversation, producing progressively deeper analysis.

## MCP Server Support

Perplexity supports both local and remote MCP (Model Context Protocol) servers.

### Local MCP on Mac

Local MCP is available in the Perplexity Mac app from the Mac App Store. Local servers let Perplexity work with files, databases, applications, and services on your computer while sending the minimum data needed to Perplexity, which makes them a good fit for sensitive material.

### Remote MCP

Remote MCP servers are cloud services that you add as custom plugins: open Plugins in the sidebar and select Add custom. Remote HTTP and SSE MCP servers also work inside imported plugins. Availability can vary by plan, so check the Plugins panel in your account.

### When MCP Adds Value

For most Perplexity use cases, web search is the primary context extension mechanism. MCP adds value when you need Perplexity to combine its web research with your own data:

- Researching a topic while cross-referencing your local documents
- Analyzing data from a local database alongside web-sourced information
- Pulling records from a SaaS tool into a research thread

### Web Search vs. MCP

Where other tools use MCP to reach databases or APIs, Perplexity's distinguishing feature is its web search. MCP complements this by adding your own data. If you need extensive tool use in a code repository (editing files, running tests, managing migrations), pair Perplexity with a coding agent.

## File Uploads and Document Formats

### Upload Limits

Files attached to a thread are limited to 40 MB each. Free, Pro, and Max plans each get a weekly upload allowance that resets on a rolling basis, with Max higher than Pro, and images and files from connected apps count against the same allowance. Supported types include text, code, PDFs, images, audio (MP3, WAV, FLAC, and others), and video (MP4, MOV, WebM, and others); Perplexity transcribes speech in audio and video so it is searchable. Enterprise plans have separate limits.

### PDFs in Perplexity

Perplexity handles PDFs well, especially for research papers and reports. Upload them to a Project for persistent reference. Perplexity can:

- Extract text and answer questions about the content
- Compare information across multiple uploaded PDFs
- Combine uploaded PDF data with web search results

### Markdown

For context documents you author (instructions, outlines, research frameworks), Markdown is cleaner and more precisely parsed. Use Markdown for structure-dependent content where formatting matters.

### The Hybrid Approach

Use PDFs for received documents (research papers, reports, specifications). Use Markdown for documents you create (Project instructions, research frameworks, output templates).

## Memory

Perplexity's Memory lets it remember details between conversations. It draws on two things: saved memories (preferences and information you share) and your past searches. Perplexity uses them only when they improve an answer and cites any memory that shaped a response.

Manage it in **Settings, then Memory**, where you can turn "Use search history" and "Notes" on or off separately and open "Manage memories" to search, filter, and delete entries. Turning Memory off stops future use but does not delete what is stored. Incognito mode turns Memory and search history off entirely. In Enterprise organizations, admins control Memory, and memories belong to the organization.

Memory is personal and cross-topic. Projects are scoped: their instructions and files apply only inside that Project. Use Memory for stable facts about you and Projects for topic-specific context.

## Advanced Patterns

### The Research Pipeline Pattern

Use Perplexity as the front end of a research pipeline:

1. **Discovery:** Use Research mode to survey a topic comprehensively
2. **Validation:** Switch to Academic sources to verify key claims
3. **Grounding:** Compare the findings with documents stored in your Project
4. **Synthesis:** Ask for a draft analysis in the same thread, based on the accumulated context
5. **Export:** Export the report or copy the synthesized research into your writing tool

### The Comparative Analysis Pattern

Use Projects to compare multiple topics or options:

1. Upload comparison criteria as a Markdown file
2. Research each option in a separate session within the Project
3. Use a final session to synthesize the findings into a comparison table

The Project maintains the criteria and accumulated research across all sessions.

### The Source Quality Verification Pattern

Use source switching to verify claims across different source types:

1. Find a claim with Web search
2. Verify it with Academic sources (scholarly backing)
3. Check it against your own files or Finance data where relevant
4. Ask what has changed recently to catch retractions or updates

This multi-angle verification produces higher-confidence research than relying on a single source type.

## Common Mistakes

1. **Not using Projects for ongoing research.** Individual threads do not share instructions or files. Projects keep your instructions, files, and session history together.

2. **Ignoring source selection.** Searching the whole web for everything misses the specialized results that Academic, Finance, and file search provide. Match the source to the question.

3. **Vague Research prompts.** Research mode executes autonomously, so a vague prompt produces a vague report. Be specific about what you want investigated and how you want it structured.

4. **Uploading too many unrelated files to one Project.** Keep Projects focused on specific topics. A Project with 30 unrelated documents dilutes the context for any specific query.

5. **Not verifying citations.** Perplexity provides source citations for a reason. Click through and verify key claims, especially for high-stakes research.

6. **Forgetting what Memory knows.** Review saved memories occasionally in Settings. A stale preference can quietly shape answers across every thread.

## Frequently Asked Questions

### What happened to Perplexity Spaces?

Perplexity's help center now documents Spaces as Projects, and the old "What are Spaces" article redirects to "What are Projects." A Project keeps searches, files, instructions, links, and connected tools in one hub.

### How many files can a Perplexity Project hold?

Up to 10,000 files and 5 GB of total storage, with each file up to 100 MB, according to the Projects help article, which says these limits are the same on every plan. Files attached to an ordinary thread are limited to 40 MB each and count against a weekly allowance.

### Does Perplexity have memory?

Yes. Memory uses saved memories and, if you allow it, your past searches. You manage it in Settings under Memory, where you can turn each source on or off and delete individual memories. Incognito mode does not use or keep memory.

### Does Perplexity still have Focus modes?

Not in the old form. The Pro Search documentation describes narrowing searches to sources such as Web, Academic, Finance, and your own files, and Enterprise accounts use a Choose sources menu instead of Focus.

### How long can Perplexity Project instructions be?

Project instructions can be up to 8,000 characters. They apply to every session in that Project, so use them for role, sourcing rules, and output format.

## Go Deeper

To learn more about AI-assisted research, context management, and agentic workflows, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
