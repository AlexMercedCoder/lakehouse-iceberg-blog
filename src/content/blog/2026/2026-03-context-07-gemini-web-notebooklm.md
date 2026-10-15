---
title: "NotebookLM Source Limits and the Gemini Context Window"
pubDatetime: 2026-03-07T15:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "NotebookLM, now Gemini Notebook, allows 50 sources per notebook free and up to 600 on Ultra, each up to 500,000 words or 200MB. Gemini chats: 32K to 1M tokens."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - gemini web notebooklm
slug: 2026-03-context-gemini-web-notebooklm
draft: false
faqs:
  - question: "How many sources can a NotebookLM notebook have?"
    answer: "Free (Standard) accounts get up to 50 sources per notebook. Google AI Plus raises that to 100, Pro to 300, and Ultra to 500 or 600 depending on the storage tier. Each source can be up to 500,000 words or 200MB for an uploaded file."
  - question: "Is NotebookLM now called Gemini Notebook?"
    answer: "Yes. Google renamed NotebookLM to Gemini Notebook on July 16, 2026. Google describes it as the same standalone product, still at notebooklm.google, and its notebooks also sync with the Gemini app."
  - question: "What is the Gemini app's context window?"
    answer: "Google's help center lists 32K tokens without a Google AI plan, 128K tokens with Google AI Plus, and 1 million tokens with Google AI Pro or Ultra. Google says 1 million tokens is roughly 1,500 pages of text or 30,000 lines of code."
  - question: "How many files can I upload to Gemini at once?"
    answer: "Up to 10 files per prompt. Each file can be up to 100 MB, videos up to 2 GB, and you can add one code folder or GitHub repository of up to 5,000 files and 100 MB per chat."
  - question: "What is happening to Gems in Gemini?"
    answer: "Gems are being replaced by skills. They go away on personal Google accounts in November 2026, on Workspace business accounts in March 2027, and on Workspace education accounts in June 2027, and existing Gems convert to skills automatically."
---

Google's AI tools for knowledge work center on two connected products: Gemini (the conversational AI at gemini.google.com) and NotebookLM (the research assistant at notebooklm.google), which Google renamed **Gemini Notebook** on July 16, 2026. Since April 2026, notebooks you create in the Gemini app sync with NotebookLM, so a source added in one appears in the other. The result is a persistent knowledge layer where documents you upload once are available in both the conversational and the research interface.

This guide was reviewed on October 15, 2026 against Google's [Gemini Notebook plans and limits](https://support.google.com/gemininotebook/answer/16213268?hl=en), the [Gemini Apps context window by plan](https://support.google.com/gemini/answer/16275805?hl=en), [Gemini Apps file upload limits](https://support.google.com/gemini/answer/14903178?hl=en), the [Gems to skills transition](https://support.google.com/gemini/answer/18560919?hl=en), and the [Gemini Notebook announcement](https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/). Limits change often, so treat those pages as the authority.

**The short answer:** a free NotebookLM (Gemini Notebook) account gets 100 notebooks with up to 50 sources each. Paid tiers raise that to 100 sources (Plus), 300 (Pro), and 500 or 600 (Ultra). Every source can hold up to 500,000 words or a 200MB upload. In the Gemini app, the context window is 32K tokens without an AI plan, 128K with Google AI Plus, and 1 million tokens with Google AI Pro or Ultra.

This guide covers context management strategies for both Gemini and NotebookLM, with a focus on how to use them together. It uses "NotebookLM" because that is still the name most people search for and the product's address.

## Gemini Web: Context Management Fundamentals

### The Context Window

Google's help center ties the Gemini app's context window to your plan:

| Plan                    | Context window |
| ----------------------- | -------------- |
| No Google AI plan       | 32K tokens     |
| Google AI Plus          | 128K tokens    |
| Google AI Pro and Ultra | 1M tokens      |

Google describes 1 million tokens as roughly 1,500 pages of text or 30,000 lines of code. The window includes everything: your instructions, conversation history, uploaded files, and Gemini's responses. Even at 1 million tokens, strategic context management still matters because relevance, not volume, determines response quality.

The model you get also depends on the plan. Gemini 3.6 Flash is available to all users, and Gemini 4 Argon began rolling out to Google AI Pro and Ultra subscribers on October 13, 2026.

### Custom Instructions

Gemini supports standing instructions that shape how it responds across conversations. Find them under Settings, then Personal Intelligence, then **Instructions for Gemini** (called "Saved info" in some regions). Effective instructions include:

- Your professional background and expertise level
- Preferred response style (concise vs. detailed, formal vs. conversational)
- Output format preferences (bullet points, structured sections, code formatting)
- Domain-specific terminology or constraints

Gemini can also remember details from past chats when memory is on, and you can turn Personal Intelligence off for a single chat.

### Gems and Skills: Specialized Assistants

Gems are custom assistants within Gemini. You create a Gem by giving it a name, instructions, and optional knowledge files. Unlike global instructions, each Gem operates with its own specialized context.

**Gems are being replaced by skills.** Google's help center says Gems go away on personal Google accounts in November 2026, on Workspace business, enterprise, and non-profit accounts in March 2027, and on Workspace education accounts in June 2027. Existing Gems convert to skills automatically, knowledge files included. Skills run when you type `/` and the skill name, and Gemini can also apply one automatically when it fits your prompt. You can keep up to 100 skills active at a time. Google says support for adding Google Drive files and Gemini Notebook notebooks to skills is coming.

**Use Gems or skills for repeatable workflows:**

- A "Technical Writer" assistant with your style guide and terminology baked in
- A "Data Analyst" assistant that knows your preferred visualization tools and analysis frameworks
- A "Meeting Prep" assistant that generates agendas and briefing documents in your format
- A "Code Reviewer" assistant that applies your team's coding standards consistently
- A "Content Editor" assistant that checks for brand voice compliance

If you are building a new one today, build it as a skill so you do not have to migrate it later.

### Writing Effective Instructions for Gems and Skills

The quality of a Gem or skill depends on the quality of its instructions. Write them as if you are onboarding a new team member to a specific role:

1. **Define the role** ("You are a technical documentation editor for a developer tools company")
2. **Specify the audience** ("Write for senior developers who know the basics but need guidance on advanced topics")
3. **Set quality standards** ("Every section must include at least one code example, use active voice, and stay under 300 words per subsection")
4. **Include anti-patterns** ("Never use jargon without defining it first, never assume the reader has used this tool before")
5. **Provide examples** of the desired output style when possible

### Notebooks in Gemini

Notebooks in Gemini, introduced in April 2026, are personal knowledge bases for organizing chats and files around a project. Click "New notebook" in the Gemini side panel, or move existing chats into one.

Within a notebook:

- Set custom instructions specific to the topic or project
- Add files such as documents and PDFs that Gemini uses together with its tools and web search
- Keep related conversations together without losing context between them
- Use NotebookLM features such as Video Overviews on the same sources, since the notebook syncs both ways

At launch, notebooks were available to Google AI Ultra, Pro, and Plus subscribers on the web, with free users and mobile to follow. They were not available to Workspace or Education accounts or to users under 18. The number of sources depends on your plan.

### File Uploads

Gemini supports direct file uploads in conversations:

| File Type        | Use Case                                        |
| ---------------- | ----------------------------------------------- |
| **PDF**          | Research papers, specifications, reports        |
| **Documents**    | Google Docs, Word files for editing or analysis |
| **Spreadsheets** | Data analysis, financial modeling               |
| **Images**       | Visual context, screenshots, diagrams           |
| **Audio**        | Transcription and analysis                      |
| **Video**        | Visual content analysis                         |
| **Code**         | A code folder or GitHub repository              |

The limits: up to 10 files per prompt; up to 100 MB per file, or 2 GB per video; 5 minutes of total video and 10 minutes of audio (1 hour of video and 3 hours of audio on Google AI Pro or Ultra); and one code folder or GitHub repository of up to 5,000 files and 100 MB per chat.

### Google Apps and Custom Apps

Personal Intelligence can connect Gemini to your Google apps, including Gmail, Drive, Docs, Calendar, and Photos. Connected Apps are off by default and you turn them on per app. With them on, Gemini can:

- Search your email history for relevant communications
- Reference documents in your Google Drive
- Check your calendar when you ask about scheduling
- Pull data from your spreadsheets for analysis

This makes your Google account a context source without copying files into a chat.

## NotebookLM: Deep Research Context Management

NotebookLM is purpose-built for research and knowledge work. Its context management is centered around notebooks, each of which contains sources (your uploaded documents) and a chat interface grounded in those sources.

### How NotebookLM Handles Context

Unlike Gemini (which draws freely on its training data and the web), NotebookLM answers from the sources you add and cites the passages it used. When you need answers based specifically on your documents rather than the model's general knowledge, NotebookLM provides citation-backed responses that point to specific sections of your sources.

Since the July 2026 update, each notebook also gets a secure cloud computer that can write and run code against your sources for deeper data analysis. It launched for Google AI Ultra users and qualifying Workspace business customers, with Pro users on the web to follow.

### Source Types

NotebookLM supports a wide range of source types:

- **PDFs and common document formats:** Research papers, reports, legal documents
- **Google Docs, Slides, and Sheets:** Your own writing, presentations (up to 100 slides), and spreadsheets (currently limited to 100k tokens)
- **Web URLs:** Articles, documentation, and reference pages
- **Public YouTube videos:** Analyzed from their transcripts
- **Audio files:** Podcast episodes, interviews, lectures
- **Images, ePub files, and Play Books ebooks**
- **Pasted text and notes:** Any plaintext content

### NotebookLM Limits by Plan

| Plan            | Notebooks | Sources per notebook |
| --------------- | --------- | -------------------- |
| Standard (free) | 100       | 50                   |
| Plus            | 200       | 100                  |
| Pro             | 500       | 300                  |
| Ultra (20 TB)   | 500       | 500                  |
| Ultra (30 TB)   | 500       | 600                  |

Each source can contain up to 500,000 words or up to 200MB for uploaded files, with no page limit. Paid plans come through a Google AI Plus, Pro, or Ultra subscription or a qualifying Workspace license, and Workspace accounts have their own table. Sharing a notebook does not change a collaborator's source limit.

### Custom Instructions in NotebookLM

NotebookLM supports custom chat settings for each notebook. You can set:

- Response style ("Explain like I am new to this field")
- Response length preferences
- Tone (academic, conversational, technical)
- Specific focus areas within your sources

### Audio Overviews

NotebookLM's Audio Overview feature generates podcast-style discussions of your sources. This is a different way to consume context: instead of reading AI-generated summaries, you listen to a conversation about your documents. Audio Overviews are useful for:

- Getting a high-level understanding of dense material before deep-reading
- Reviewing research while multitasking
- Sharing knowledge with colleagues who prefer audio formats

## Using Gemini and NotebookLM Together

The connection between Gemini and NotebookLM is where the real value emerges.

### The Knowledge Flow

1. **Add sources to a notebook:** Research papers, reports, specifications
2. **Let NotebookLM build a grounded knowledge base:** Ask questions, generate summaries, create Audio Overviews
3. **Open the same notebook in the Gemini app:** Because notebooks sync, Gemini works from the same sources
4. **Use Gemini for broader analysis:** Gemini combines your specific sources with its general knowledge and web search

This workflow gives you both grounded, citation-backed analysis (NotebookLM) and broader contextual understanding (Gemini) from the same source material.

### When to Use Each

| Need                                        | Use        |
| ------------------------------------------- | ---------- |
| Answers grounded strictly in your documents | NotebookLM |
| Broad research with web search integration  | Gemini Web |
| Citation-backed analysis of specific papers | NotebookLM |
| Creative ideation and brainstorming         | Gemini Web |
| Audio summaries of research material        | NotebookLM |
| Integration with Gmail, Drive, and Calendar | Gemini Web |
| Side-by-side comparison of source documents | NotebookLM |

### Gems with Notebooks and Drive Files

When you build a Gem, you can add a NotebookLM notebook through the upload menu, and you can add Google Drive files. Google says Gemini uses the most recent version of a Drive file, so edits to that file reach the Gem without re-uploading. The help center does not say whether a notebook attached to a Gem stays in sync, so if you need an assistant that always sees your latest sources, use a notebook in Gemini directly, since those sync both ways.

## External Documents: PDFs vs. Markdown

### In NotebookLM

NotebookLM works well with PDFs because it extracts and indexes the content for citation-backed retrieval. Since NotebookLM's primary job is to ground responses in specific documents, PDFs are well suited to this use case.

However, for your own notes, outlines, and structured reference material, Google Docs or Markdown files (uploaded as text) provide cleaner parsing and are easier to update.

### In Gemini Web

Gemini handles both PDFs and text-based formats well, but the same general rule applies: Markdown and plaintext provide the cleanest AI-parseable context. Use PDFs for published documents you received from others, and Markdown or Google Docs for context you author yourself.

## MCP Server Support

The Gemini app now supports **custom apps**: you connect a personal or third-party app by entering its MCP server URL under Settings, then Connected Apps, in the Gemini web app. Once connected, the app is available on both web and mobile. As of October 2026 the help center limits custom apps to users who are 18 or older, located in the US, signed in with a personal Google account, and have Keep Activity on, and the feature is English-only. Google does not vet third-party MCP servers, so connect only ones you trust.

Google's help pages for Gemini Notebook do not describe MCP connections. For developer workflows that need MCP, use a coding agent such as Gemini CLI or Antigravity, which configure MCP servers in local settings files.

## Advanced Patterns

### The Research Pipeline

1. **Collect sources in NotebookLM** (upload papers, articles, reports)
2. **Generate an Audio Overview** for high-level understanding
3. **Ask targeted questions in NotebookLM** for citation-backed answers
4. **Open the notebook in Gemini** for broader analysis
5. **Use Gemini with web search** to find related work not in your sources
6. **Draft your output in Gemini** using both grounded sources and general knowledge

### The Knowledge Base Strategy

Use NotebookLM notebooks as persistent knowledge bases for different domains:

- **"Industry Research"** notebook with market reports and analyst papers
- **"Technical Reference"** notebook with API docs and architecture papers
- **"Competitive Intelligence"** notebook with competitor materials

Each notebook becomes a specialized resource that you can query independently or combine with Gemini for cross-domain analysis.

### The Document Synthesis Pattern

When you need to synthesize multiple long documents:

1. Upload all documents to a single NotebookLM notebook
2. Ask NotebookLM to summarize each document individually
3. Ask it to identify common themes across all documents
4. Ask it to highlight contradictions or disagreements between documents
5. Use the results in Gemini for a final synthesized analysis

This approach uses NotebookLM's grounding for accurate summarization and Gemini's broader knowledge for synthesis.

## Structuring Context for Gemini and NotebookLM

### In Gemini: Lead with Purpose

Because Gemini can have a large context window, it is tempting to dump everything in and hope for the best. Resist this. Structure your inputs:

1. **State your goal first** ("I need a comparison table of three database solutions")
2. **Provide the relevant data** (paste or reference uploaded files)
3. **Specify the output format** ("Create a markdown table with columns for Feature, Solution A, Solution B, Solution C")

A clear goal and an explicit output format give the model something to anchor on when the context is large.

### In NotebookLM: Trust the Grounding

NotebookLM is designed to answer from your sources. You do not need to paste content into the chat because the sources are already indexed. Instead, ask specific questions that require the AI to synthesize across your documents:

- "Compare how Document A and Document B define the term 'data mesh'"
- "What evidence in my sources supports the claim that real-time processing reduces costs?"
- "Identify contradictions between the 2024 and 2025 reports on this topic"

## Common Mistakes

1. **Using Gemini when you need citations.** If you need responses backed by specific sources, use NotebookLM. Gemini's general knowledge is broad, but NotebookLM is the tool built to cite passages from your documents.

2. **Overloading a single NotebookLM notebook.** Even though paid plans allow 300 to 600 sources, having too many unrelated documents in one notebook dilutes the AI's focus. Create separate notebooks for distinct topics.

3. **Not using Audio Overviews.** Audio Overviews are one of NotebookLM's most underused features. They provide an efficient way to internalize complex material, especially before you start asking detailed questions.

4. **Ignoring notebook sync.** Using these tools in isolation means you miss the most useful workflow: grounded research in NotebookLM feeding into broader analysis in Gemini.

5. **Skipping custom instructions.** Both Gemini and NotebookLM support per-notebook instructions. Setting these up takes minutes and saves hours of course-correcting the AI.

6. **Building new Gems in late 2026.** Gems are going away; build repeatable assistants as skills instead.

7. **Expecting the free Gemini plan to hold a long document.** Without an AI plan the window is 32K tokens. Put long material in a notebook instead.

## Frequently Asked Questions

### How many sources can a NotebookLM notebook have?

Free (Standard) accounts get up to 50 sources per notebook. Google AI Plus raises that to 100, Pro to 300, and Ultra to 500 or 600 depending on the storage tier. Each source can be up to 500,000 words or 200MB for an uploaded file.

### Is NotebookLM now called Gemini Notebook?

Yes. Google renamed NotebookLM to Gemini Notebook on July 16, 2026. Google describes it as the same standalone product, still at notebooklm.google, and its notebooks also sync with the Gemini app.

### What is the Gemini app's context window?

Google's help center lists 32K tokens without a Google AI plan, 128K tokens with Google AI Plus, and 1 million tokens with Google AI Pro or Ultra. Google says 1 million tokens is roughly 1,500 pages of text or 30,000 lines of code.

### How many files can I upload to Gemini at once?

Up to 10 files per prompt. Each file can be up to 100 MB, videos up to 2 GB, and you can add one code folder or GitHub repository of up to 5,000 files and 100 MB per chat.

### What is happening to Gems in Gemini?

Gems are being replaced by skills. They go away on personal Google accounts in November 2026, on Workspace business accounts in March 2027, and on Workspace education accounts in June 2027, and existing Gems convert to skills automatically.

## Go Deeper

To learn more about context management strategies for AI tools, research workflows, and agentic systems, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
