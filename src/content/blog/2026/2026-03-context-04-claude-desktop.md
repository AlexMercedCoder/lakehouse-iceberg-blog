---
title: "Claude Desktop MCP Setup: Config File, Extensions, Context"
pubDatetime: 2026-03-07T12:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "Add MCP servers to Claude Desktop with one-click .mcpb extensions or by editing claude_desktop_config.json (Settings > Developer > Edit Config), then restart."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - claude desktop
slug: 2026-03-context-claude-desktop
draft: false
faqs:
  - question: "Where is the Claude Desktop MCP config file?"
    answer: "Open Settings from the Claude menu, go to the Developer tab, and click Edit Config. That opens claude_desktop_config.json, which lives at ~/Library/Application Support/Claude/claude_desktop_config.json on macOS and %APPDATA%\\Claude\\claude_desktop_config.json on Windows."
  - question: "How do I add an MCP server to Claude Desktop?"
    answer: "The easiest path is a desktop extension: open Settings > Extensions and install one from the directory, or install a .mcpb file. For any other local server, add it under mcpServers in claude_desktop_config.json and fully quit and restart Claude Desktop so it launches the server."
  - question: "Can Claude Desktop connect to remote MCP servers?"
    answer: "Yes. Add them as custom connectors under Customize > Connectors (Team and Enterprise owners add them in Organization settings). Claude connects to remote servers from Anthropic's cloud, so the server must be reachable from the public internet. Free plans are limited to one custom connector."
  - question: "Does Claude Desktop have computer use?"
    answer: "Computer use runs inside the desktop app, but in Cowork and Claude Code rather than in regular chat. It is in beta for Pro and Max plans on macOS and Windows, and Claude tries connectors and the browser before it falls back to clicking around the screen."
  - question: "How big is the context window in Claude Desktop?"
    answer: "Desktop chat uses the same limits as claude.ai. On paid plans, Claude Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1 have a 1 million token window in chat; several older models are capped at 500K, and others at 200K."
---

Claude Desktop takes everything available in Claude Web and adds capabilities that change how you manage context: local MCP servers that link Claude to tools and data on your machine, direct local file access that eliminates the upload-download cycle, and a home for Cowork and Claude Code sessions that can use computer use. These additions make Claude Desktop the right choice when your work requires live data, local file system access, or integration with tools that Claude Web cannot reach.

This guide explains how to use each of Claude Desktop's context management features, when to use them, and how they complement the Projects, artifacts, and conversation patterns covered in the Claude Web guide. It was reviewed on October 15, 2026 against the official [local MCP server guide](https://modelcontextprotocol.io/docs/develop/connect-local-servers), Anthropic's help articles on [desktop extensions](https://support.claude.com/en/articles/10949351), [custom connectors](https://support.claude.com/en/articles/11175166), [computer use](https://support.claude.com/en/articles/14128542), and [context window sizes](https://support.claude.com/en/articles/8606394).

**The short answer:** to give Claude Desktop a local MCP server, either install a desktop extension (Settings > Extensions, or a `.mcpb` file) or open Settings > Developer > Edit Config and add the server under `mcpServers` in `claude_desktop_config.json`, then quit and restart the app. Remote MCP servers go in as custom connectors instead. On paid plans, desktop chat gets a 1 million token context window with Claude Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1.

## What Claude Desktop Adds Over Claude Web

Claude Desktop shares the same core features as Claude Web: Projects with instructions and knowledge files, artifacts, memory, remote connectors, and the same context windows (1 million tokens on the current models for paid plans). The key additions are:

| Feature                            | Claude Web  | Claude Desktop                                |
| ---------------------------------- | ----------- | --------------------------------------------- |
| **Projects**                       | Yes         | Yes                                           |
| **Artifacts**                      | Yes         | Yes                                           |
| **Knowledge files**                | Yes         | Yes                                           |
| **Remote MCP (custom connectors)** | Yes         | Yes                                           |
| **Local MCP servers**              | No          | Yes (extensions or JSON config)               |
| **Local file access**              | Upload only | Direct read/write through a local server      |
| **Computer use**                   | No          | In Cowork and Claude Code (beta, Pro and Max) |

If your work is purely knowledge-based (writing, research, analysis), Claude Web is sufficient. Switch to Claude Desktop when you need to connect Claude to your local environment or external services.

## MCP Servers: The Core Differentiator

Local MCP servers are what make Claude Desktop a genuinely different tool from the web interface. MCP is an open standard that allows Claude to connect to external services, databases, file systems, and tools through standardized server implementations.

### How MCP Works in Claude Desktop

Claude Desktop acts as the MCP host. It starts each local server you configure when the app launches, and Claude gains access to the tools those servers expose, asking for your approval before it runs them. When Claude needs information from an external source, it calls the appropriate MCP tool, receives the results, and incorporates them into its response.

### Practical MCP Use Cases

**Database Access:**
Connect a database MCP server to let Claude query your development database directly. Instead of copying and pasting query results, Claude can run queries itself:

- Explore schema to understand your data model
- Run diagnostic queries when debugging
- Verify data after explaining a migration plan

**File System Access:**
Connect a filesystem MCP server to give Claude access to specific directories on your machine. This is especially useful for:

- Browsing project directories without manually uploading each file
- Reading configuration files, logs, or data files
- Writing output files (reports, generated code, processed data) directly to disk

**Version Control:**
Connect a Git MCP server to let Claude interact with your repository:

- Review recent commits and diffs
- Understand the project's change history
- Create branches or commits (with your approval)

**API Integration:**
Connect MCP servers for services your workflow depends on:

- Jira or Linear for project management context
- Notion or Confluence for internal documentation
- Slack for team communication context

### Setting Up MCP Servers

You have three ways to add a server:

1. **Desktop extensions.** Open Settings > Extensions and install one from the directory, or install a `.mcpb` package you trust. Extensions are single-click installs, and Claude Desktop ships its own Node.js runtime so you do not need to install it.
2. **The JSON config file.** Click the Claude menu, choose Settings, open the Developer tab, and click Edit Config. That opens `claude_desktop_config.json` at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows.
3. **Custom connectors for remote servers.** Remote MCP servers are added under Customize > Connectors, not in the JSON file. Claude reaches them from Anthropic's cloud, so they must be reachable from the public internet.

A config file with a filesystem server and a Postgres server looks like this:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/you/projects/my-app"
      ]
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@bytebase/dbhub",
        "--dsn",
        "postgresql://user:pass@localhost:5432/mydb"
      ]
    }
  }
}
```

After saving, fully quit and restart Claude Desktop. If a server does not appear, check `mcp.log` and the per-server `mcp-server-NAME.log` files in `~/Library/Logs/Claude` (macOS) or `%APPDATA%\Claude\logs` (Windows).

### When to Use MCP

**Use MCP when:**

- Your task requires data that is not (and should not be) in the conversation or project files
- You need Claude to interact with live systems (databases, APIs, file systems)
- You want Claude to verify its work against real systems
- The data changes frequently and uploading snapshots is impractical

**Do not use MCP when:**

- The task is self-contained (writing, brainstorming, planning)
- You can provide the needed context by pasting or uploading files
- You are working with sensitive production systems (connect to dev/staging only)
- The MCP server adds latency that slows your workflow

### MCP Security Considerations

MCP servers run locally and can access real systems. Best practices:

- Only connect to development or staging environments, never production
- Use read-only database credentials when possible
- Limit filesystem access to specific directories using the server's configuration
- Review Claude's MCP calls before approving actions that modify data
- Install extensions and connectors only from sources you trust; custom connectors can reach services Anthropic has not verified
- Use environment variables for credentials rather than hardcoding them in configuration
- Audit your MCP server configurations periodically to remove servers you no longer use

### Choosing the Right MCP Servers

Not every project needs every MCP server. Start with the minimum set and add more as your workflow demands:

**Solo developers:** Filesystem + database (if applicable)
**Frontend developers:** Filesystem + browser automation (Playwright)
**Backend developers:** Filesystem + database + API testing
**Full-stack teams:** Filesystem + database + Git + project management

Adding servers you do not actively use wastes Claude's attention. Each connected server expands the list of available tools Claude must evaluate for every request.

## Computer Use: Desktop-Level Interaction

Computer use lets Claude interact with your desktop by taking screenshots, moving the mouse, and typing. In the Claude Desktop app it is available in Cowork and Claude Code sessions rather than in regular chat, and it is in beta for Pro and Max plans on macOS and Windows. The app has to stay open and your computer awake while it works.

### When Computer Use Helps with Context

Computer use is a context-gathering tool in addition to being an interaction tool. Sometimes the easiest way to give Claude context is to let it look at what you are looking at:

- **GUI applications:** Show Claude your IDE, database tools, or monitoring dashboards
- **Web applications:** Let Claude navigate internal tools in a browser
- **Design tools:** Have Claude reference designs in a desktop design app
- **Spreadsheets:** Let Claude read complex Excel layouts that do not convert cleanly to CSV

### How Claude Chooses It

Claude reaches for the most precise tool first: a connector (such as Gmail, Google Drive, Microsoft 365, or Slack), then a browser (the built-in browser or Chrome through Claude in Chrome), and only then direct screen interaction. That order matches the advice below.

### Computer Use Limitations

Computer use is slower than MCP-based interactions because it relies on visual processing rather than structured data exchange. Use it as a fallback for tools that lack MCP servers or APIs, not as your primary context mechanism. For anything that can be done through MCP (database queries, file access, API calls), MCP is faster and more reliable. Anthropic also advises against using it with sensitive data such as health, financial, or personal records.

## Local File Access: Eliminating the Upload Cycle

With a filesystem MCP server or extension, Claude Desktop can read from and write to the folders you allow, eliminating the need to manually upload and download files.

### Advantages Over Web Uploads

- **No upload step:** Claude opens files where they already live instead of waiting for an upload
- **Live files:** Claude reads the current version of a file, not a snapshot uploaded hours ago
- **Write capability:** Claude can save outputs directly to your file system
- **Directory browsing:** Claude can explore project structures to understand organization

### Best Practices for Local File Access

- **Scope access narrowly.** Point the filesystem MCP server at the specific project directory, not your home folder.
- **Use it for exploration.** Let Claude browse your project structure to build understanding, then focus on specific files.
- **Combine with Projects.** Use Project instructions to set context and local file access to provide the actual content. This gives Claude both the "how" (instructions) and the "what" (files).

## External Documents: PDFs and Markdown in Claude Desktop

Claude Desktop handles external documents the same way as Claude Web: through Project knowledge files and conversation uploads. However, the addition of local file access changes the strategy.

### The Hybrid Approach

**For persistent reference material:** Upload to Project knowledge files (PDFs or Markdown). These are always available in every conversation within the Project.

**For working documents:** Access via the filesystem MCP server. This way Claude reads the live version of your files without requiring re-uploads when content changes.

**For published specifications:** Upload PDFs to Project knowledge files. These do not change, so the snapshot approach works fine.

**For your own documentation:** Keep it in Markdown files on disk and access via MCP. This way both you and Claude are always working with the latest version.

## Building an Effective Claude Desktop Workflow

### Step 1: Set Up Your Project

Create a Claude Desktop Project with:

- Project Instructions covering your role, style, constraints, and terminology
- Knowledge files for stable reference material (style guides, specifications, standards)

### Step 2: Configure MCP Servers

Add MCP servers for the external systems you work with regularly:

- Filesystem server pointing at your project directory
- Database server connected to your development database (if applicable)
- Any service-specific MCP servers for tools you use daily

### Step 3: Use the Right Tool for Each Context Need

| Context Need                   | Best Approach                           |
| ------------------------------ | --------------------------------------- |
| Project conventions and style  | Project Instructions                    |
| Stable reference documents     | Project Knowledge Files                 |
| Current code and config files  | Filesystem MCP                          |
| Database state and schema      | Database MCP                            |
| Visual UI or application state | Computer use (in Cowork or Claude Code) |
| One-off data or examples       | Paste in conversation                   |

### Step 4: Manage Conversation Threads

Even with MCP and local file access, conversation management matters:

- Start new conversations for new topics (Project context persists)
- Use artifacts for important outputs you want to reference later
- Summarize progress when starting fresh threads

## Advanced Patterns

### The Live Debugging Pattern

When debugging an issue:

1. Let Claude read the relevant source code via filesystem MCP
2. Let Claude query the database to check data state
3. Let Claude read log files to identify error patterns
4. Have a conversation where Claude synthesizes all of this context into a diagnosis

This approach gives Claude real-time access to a broader context than you could reasonably paste into a conversation.

### The Document Generation Pipeline

For creating documents that reference live data:

1. Claude reads data via MCP (database stats, API responses, configuration)
2. Claude generates the document in a conversation
3. Claude writes the output directly to a file on disk
4. You review and iterate

This eliminates the copy-paste cycle between Claude and your file system.

### The Research and Synthesis Pattern

For research projects spanning multiple sources:

1. Upload academic papers and specifications as Project knowledge files
2. Connect a web-search MCP server for current information
3. Use filesystem MCP to read your existing notes and drafts
4. Claude synthesizes across all sources, referencing each by name

## Common Mistakes

1. **Connecting production databases.** Always use development or staging credentials. Even read-only production access introduces risk.

2. **Over-scoping filesystem access.** Do not give Claude access to your entire home directory. Point the filesystem server at the specific project folder.

3. **Using MCP for everything.** If you just need Claude to reference a style guide, upload it to Project knowledge files. MCP is for live, changing data.

4. **Forgetting Project Instructions.** MCP and local file access do not replace the need for clear instructions. Claude still needs to know your style, constraints, and output format.

5. **Not reviewing MCP actions.** When Claude performs actions through MCP (writing files, running queries), review them. The protocol provides transparency, but you need to exercise your approval authority.

## Frequently Asked Questions

### Where is the Claude Desktop MCP config file?

Open Settings from the Claude menu, go to the Developer tab, and click Edit Config. That opens `claude_desktop_config.json`, which lives at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS and `%APPDATA%\Claude\claude_desktop_config.json` on Windows.

### How do I add an MCP server to Claude Desktop?

The easiest path is a desktop extension: open Settings > Extensions and install one from the directory, or install a `.mcpb` file. For any other local server, add it under `mcpServers` in `claude_desktop_config.json` and fully quit and restart Claude Desktop so it launches the server.

### Can Claude Desktop connect to remote MCP servers?

Yes. Add them as custom connectors under Customize > Connectors (Team and Enterprise owners add them in Organization settings). Claude connects to remote servers from Anthropic's cloud, so the server must be reachable from the public internet. Free plans are limited to one custom connector.

### Does Claude Desktop have computer use?

Computer use runs inside the desktop app, but in Cowork and Claude Code rather than in regular chat. It is in beta for Pro and Max plans on macOS and Windows, and Claude tries connectors and the browser before it falls back to clicking around the screen.

### How big is the context window in Claude Desktop?

Desktop chat uses the same limits as claude.ai. On paid plans, Claude Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1 have a 1 million token window in chat; several older models are capped at 500K, and others at 200K.

## Go Deeper

To learn more about context management strategies for AI tools and agentic workflows, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
