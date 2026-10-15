---
title: "What Is MCP? Model Context Protocol and How Tools Connect"
pubDatetime: 2026-03-07T09:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "MCP is an open protocol that lets AI apps call tools and read data on servers over stdio or Streamable HTTP. How it works and how 17 AI tools connect to it."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - mcp deep dive
slug: 2026-03-context-mcp-deep-dive
draft: false
faqs:
  - question: "What is MCP (Model Context Protocol)?"
    answer: "MCP is an open protocol that standardizes how AI applications connect to external tools and data. A host application such as Claude, ChatGPT, Cursor, or VS Code runs MCP clients that talk to MCP servers using JSON-RPC messages, and each server exposes tools, resources, and prompts the model can use."
  - question: "How does an AI tool connect to an MCP server?"
    answer: "Through one of two standard transports. With stdio, the host launches the server as a local subprocess and exchanges newline-delimited JSON-RPC over stdin and stdout. With Streamable HTTP, each message is an HTTP POST to one MCP endpoint, which suits remote servers and supports OAuth-based authorization."
  - question: "Is the MCP SSE transport deprecated?"
    answer: "Yes. The older HTTP+SSE transport has been deprecated since spec version 2025-03-26, and the 2026-07-28 spec formally marks it Deprecated under the new feature lifecycle policy. New servers should use Streamable HTTP, which can still stream replies over a request-scoped SSE stream."
  - question: "What is the current MCP specification version?"
    answer: "The current revision is 2026-07-28. It makes the protocol stateless by removing the initialize handshake and protocol-level sessions, adds server/discover, moves tasks into an official extension, and deprecates the Roots, Sampling, and Logging features."
  - question: "Who maintains MCP?"
    answer: "Anthropic released MCP in November 2024 and in December 2025 donated it to the Agentic AI Foundation, a directed fund under the Linux Foundation co-founded by Anthropic, Block, and OpenAI. Technical decisions still run through the project's maintainers and Specification Enhancement Proposals (SEPs)."
---

The Model Context Protocol (MCP) has become the universal standard for connecting AI models to external tools, data sources, and services. Originally open-sourced by Anthropic in November 2024 and donated in December 2025 to the Agentic AI Foundation, a directed fund under the Linux Foundation, MCP solves one of the biggest frustrations in working with AI: getting models to interact with the systems where your actual work lives. Instead of copying and pasting data into chat windows or uploading files manually, MCP lets AI tools query databases, read documentation, interact with APIs, manage files, and perform actions across your entire tool ecosystem through a standardized protocol.

This guide explains how MCP works at a technical level, what problems it solves, and exactly how each of the 17 major AI tools supports it (or does not). If you use any AI coding assistant, research tool, or chat interface, understanding MCP will help you build a more connected and productive AI workflow.

This guide was reviewed on October 15, 2026 against the [MCP specification](https://modelcontextprotocol.io/specification/latest) (revision 2026-07-28) and its [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog), the official [server-building guide](https://modelcontextprotocol.io/docs/develop/build-server), the [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview), and each client's own documentation.

**The short answer:** MCP is an open, JSON-RPC based protocol in which an AI application (the host) runs clients that connect to servers. Servers expose **tools** the model can call, **resources** it can read, and **prompts** users can pick. Local servers run as subprocesses over **stdio**; remote servers use **Streamable HTTP** with OAuth-based authorization. The old HTTP+SSE transport is deprecated. Configure a server once and any client that supports its transport can use it.

## What Is MCP and Why Does It Matter?

MCP is a client-server protocol that standardizes how AI applications connect to external resources. Before MCP, every AI tool that wanted to connect to an external service needed a custom integration. If you wanted Claude to query your PostgreSQL database, you needed one integration. If you wanted ChatGPT to do the same thing, you needed a completely different integration. MCP eliminates this duplication by creating a single protocol that works across tools.

### The Architecture

MCP uses a three-part architecture, with all messages encoded as JSON-RPC 2.0:

1. **Host:** The AI application you are using (ChatGPT, Claude Desktop, Cursor, etc.)
2. **Client:** The component within the host that manages MCP connections
3. **Server:** An external process that exposes tools, resources, and prompts to the AI

The server is where the power lives. An MCP server can expose any capability: reading files, querying databases, calling APIs, running commands, searching the web, or interacting with services like GitHub, Jira, or Slack. The AI model discovers these capabilities through the protocol and can invoke them during conversations.

### How Communication Works

MCP supports multiple transport mechanisms:

**stdio (Standard Input/Output):** The host launches the MCP server as a local subprocess and exchanges newline-delimited JSON-RPC messages over stdin and stdout. This is the most common approach for local servers.

**Streamable HTTP:** The server runs as a web service with a single MCP endpoint. Each message is an HTTP POST, and replies come back as a JSON object or a request-scoped SSE stream. This is used for remote servers and cloud-hosted services, and the spec defines OAuth-based authorization for it (many servers also accept bearer tokens).

**HTTP+SSE (legacy):** The older transport built on Server-Sent Events. It has been deprecated since spec version 2025-03-26 and is formally marked Deprecated in the 2026-07-28 revision. Some clients still accept it for older servers, but new servers should use Streamable HTTP.

The current revision, 2026-07-28, also made MCP stateless: there is no `initialize` handshake or protocol-level session anymore, and every request carries its protocol version and client capabilities. SDKs negotiate with older clients automatically, so most server authors only notice this when they upgrade.

### What MCP Servers Expose

An MCP server can expose three core types of capabilities:

1. **Tools:** Functions the AI can call (query a database, create a file, search an API)
2. **Resources:** Data the AI can read (file contents, database schemas, documentation)
3. **Prompts:** Pre-built prompt templates the AI can use

Clients can offer features back to servers too. Elicitation lets a server ask the user for missing information. The older Roots, Sampling, and Logging features still work but are deprecated as of 2026-07-28. Optional extensions add more, including Tasks for long-running work and MCP Apps, which let a server return an interactive HTML interface that renders in a sandboxed frame inside the chat.

When an AI tool connects to an MCP server, it discovers the available tools and their parameter schemas. The AI model then decides when to invoke these tools based on the user's request. For example, if you ask "What tables are in my database?", the AI sees that a database MCP server has a "list_tables" tool and calls it automatically.

## The MCP Server Ecosystem

The MCP ecosystem has grown rapidly. Common server categories include:

### Data and Database Servers

| Server             | Function                                    |
| ------------------ | ------------------------------------------- |
| **PostgreSQL MCP** | Query PostgreSQL databases, inspect schemas |
| **MySQL MCP**      | Query MySQL databases                       |
| **SQLite MCP**     | Read and write SQLite databases             |
| **MongoDB MCP**    | Query MongoDB collections                   |
| **Snowflake MCP**  | Query Snowflake data warehouse              |

### Development Tool Servers

| Server             | Function                               |
| ------------------ | -------------------------------------- |
| **GitHub MCP**     | Manage repos, issues, PRs, code search |
| **GitLab MCP**     | GitLab API integration                 |
| **Jira MCP**       | Create and manage tickets              |
| **Sentry MCP**     | Error tracking and debugging           |
| **Playwright MCP** | Browser automation and testing         |

### Productivity and Communication Servers

| Server               | Function                           |
| -------------------- | ---------------------------------- |
| **Google Drive MCP** | Read and manage Google Drive files |
| **Slack MCP**        | Read and send Slack messages       |
| **Gmail MCP**        | Read and send emails               |
| **Notion MCP**       | Query and update Notion pages      |
| **Calendar MCP**     | Manage calendar events             |

### Specialized Servers

| Server                   | Function                     |
| ------------------------ | ---------------------------- |
| **Filesystem MCP**       | Read and write local files   |
| **Brave Search MCP**     | Web search capabilities      |
| **Fetch MCP**            | HTTP requests to URLs        |
| **Memory/Knowledge MCP** | Persistent knowledge storage |
| **Docker MCP**           | Container management         |

The key insight is that an MCP server you set up works across every MCP-compatible tool that supports its transport. A local stdio PostgreSQL server configured once can be used by Claude Desktop, Claude Code, Cursor, Codex, and other local clients; host it behind Streamable HTTP and remote-only clients such as ChatGPT and Claude on the web can reach it too.

## Writing Your Own MCP Server

MCP servers can be written in any language that supports stdin/stdout or HTTP. Official SDKs exist for many languages; the most common implementations use TypeScript or Python. The examples below follow the official [server-building guide](https://modelcontextprotocol.io/docs/develop/build-server) as of the 2026-07-28 revision.

### Basic Server Structure (TypeScript)

Install the server package and zod with `npm install @modelcontextprotocol/server zod`:

```typescript
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

// serveStdio may call this more than once, so return a fresh server each time
function createServer() {
  const server = new McpServer({ name: "my-custom-server", version: "1.0.0" });

  server.registerTool(
    "get_weather",
    {
      description: "Get the current weather for a location",
      inputSchema: z.object({
        location: z.string().describe("City name"),
      }),
    },
    async ({ location }) => {
      const weather = await fetchWeatherAPI(location);
      return {
        content: [{ type: "text", text: JSON.stringify(weather) }],
      };
    }
  );

  return server;
}

// Serves both current clients and older clients that still send initialize
serveStdio(createServer);
```

### Basic Server Structure (Python)

Install the SDK with `uv add "mcp[cli]"` (Python 3.10 or later). The `MCPServer` class builds tool definitions from type hints and docstrings:

```python
from mcp.server import MCPServer

mcp = MCPServer("my-custom-server")

@mcp.tool()
async def get_weather(location: str) -> str:
    """Get the current weather for a location.

    Args:
        location: City name
    """
    weather = await fetch_weather_api(location)
    return str(weather)

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

The protocol handles discovery, parameter validation, and response formatting. Your server just needs to define the tools it exposes and implement the logic for each one.

## MCP Support Across Every Major AI Tool

Here is how MCP support works across all 17 AI tools covered in this series, grouped by support level.

### Full Native MCP Support

These tools have deep, first-class MCP integration built into their core architecture.

---

#### Claude Desktop

**Support level:** Full native support for local and remote servers

**Configuration:** Install a desktop extension from Settings > Extensions (or a `.mcpb` package), or open Settings > Developer > Edit Config to edit `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@bytebase/dbhub",
        "--dsn",
        "postgresql://user@localhost:5432/mydb"
      ]
    }
  }
}
```

**How it works:** Claude Desktop acts as the MCP host. When you start the app, it launches the configured local servers as child processes, so restart it after editing the file. Claude discovers the available tools and asks for approval before using them. Desktop extensions are single-click installs that ship with their own Node.js runtime. Remote servers are added as custom connectors under Customize > Connectors rather than in the JSON file.

---

#### Claude Code

**Support level:** Full native support via the `claude mcp` CLI command

**Configuration:** Managed through the command line:

```bash
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub --dsn "postgresql://user@localhost:5432/mydb"
claude mcp add --transport http notion https://mcp.notion.com/mcp
claude mcp list
claude mcp remove db
```

**How it works:** Claude Code is an MCP client for stdio and Streamable HTTP servers (it still accepts the deprecated SSE transport for older servers). Servers can be scoped `local` (default, just you), `project` (shared in `.mcp.json` and approved before first use), or `user` (all your projects). By default it lists only MCP tool names up front and loads full tool schemas on demand, and `/mcp` inside a session shows status and handles OAuth.

---

#### Claude Cowork

**Support level:** Full support through connectors

**How it works:** Cowork uses the same connectors as the rest of Claude, managed from the "+" menu or Customize > Connectors. Remote custom connectors work wherever Cowork runs, while local connectors and plugins that include local MCP servers work only through the Claude Desktop app. Plugins can bundle skills, connectors, and sub-agents for a role or team.

---

#### OpenAI Codex CLI

**Support level:** Full native support via `config.toml`

**Configuration:** MCP servers are configured globally (`~/.codex/config.toml`) or per project (`.codex/config.toml`, which Codex reads only for trusted projects):

```toml
[mcp_servers.postgres]
command = "npx"
args = ["-y", "@bytebase/dbhub", "--dsn", "postgresql://user@localhost:5432/mydb"]
```

Management commands:

```bash
codex mcp add postgres -- npx -y @bytebase/dbhub --dsn "postgresql://user@localhost:5432/mydb"
codex mcp list
codex mcp login postgres  # for OAuth servers
```

**How it works:** Codex supports stdio and Streamable HTTP servers, with bearer tokens read from an environment variable or OAuth for remote servers. Inside the TUI, `/mcp` shows the active servers. You can limit which tools a server exposes with `enabled_tools` and `disabled_tools`.

---

#### Gemini CLI

**Support level:** Full native support via `settings.json`

**Configuration:**

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@bytebase/dbhub",
        "--dsn",
        "postgresql://user@localhost:5432/mydb"
      ]
    }
  }
}
```

Local servers use `command`, Streamable HTTP servers use `httpUrl`, and legacy SSE servers use `url`. Manage them with `gemini mcp add`, `list`, `remove`, `enable`, and `disable` from the shell, or with `/mcp list`, `/mcp auth`, `/mcp enable`, and `/mcp disable` inside a session.

**How it works:** Tools exposed by MCP servers become available to the Gemini agent alongside its built-in file system and terminal tools, with OAuth 2.0 for remote servers. Note that Google moved individual Google AI Pro, Ultra, and free accounts from Gemini CLI to Antigravity CLI in June 2026; Gemini CLI still works with API keys and Code Assist Standard and Enterprise.

---

#### Cursor

**Support level:** Full native support

**Configuration:** Add servers from the Customize page in the sidebar (Marketplace or custom), or edit `.cursor/mcp.json` in a project or `~/.cursor/mcp.json` globally. Cursor supports stdio, SSE, and Streamable HTTP, with OAuth for remote servers.

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@bytebase/dbhub",
        "--dsn",
        "postgresql://user@localhost:5432/mydb"
      ]
    }
  }
}
```

**How it works:** The agent uses MCP tools automatically when they fit the task, including in Plan Mode, or you can name a tool directly. Tool calls require your approval by default.

---

#### Windsurf (now Devin Desktop)

**Support level:** Full native support

**Configuration:** Windsurf's documentation now lives under Devin Desktop. The user-level file is `mcp_config.json` with an `mcpServers` key, at `~/.config/devin/mcp_config.json` on macOS and Linux or `%APPDATA%\devin\mcp_config.json` on Windows. In the legacy Cascade agent, open the ... menu in the Cascade panel and choose Open MCP config file. Transports are stdio, Streamable HTTP, and SSE, all with OAuth support.

**How it works:** Cascade can use up to 100 MCP tools at a time. The MCP Marketplace and one-click installs belong to the newer Devin Local agent, which also reads project-level `.devin/mcp_config.json` files.

---

#### Google Antigravity

**Support level:** Full native support

**Configuration:** Add servers from the MCP Store in the app, or edit `mcp_config.json` with an `mcpServers` key: `~/.gemini/config/mcp_config.json` globally or `.agents/mcp_config.json` in a workspace. Local servers use `command`; remote servers (Streamable HTTP, SSE, or WebSocket) use `serverUrl`. In the CLI, use `/mcp`.

**How it works:** MCP tools sit alongside the agent's built-in tools (file system, terminal, browser), with OAuth for remote servers. Best used when tasks require information from outside the codebase.

---

#### OpenCode

**Support level:** Full native support via `opencode.json` or `opencode.jsonc`

**Configuration:** Servers go under the `mcp` key, with `type` set to `local` (a `command` array) or `remote` (a `url`):

```json
{
  "mcp": {
    "postgres": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "@bytebase/dbhub",
        "--dsn",
        "postgresql://user@localhost:5432/mydb"
      ]
    }
  }
}
```

Management: `opencode mcp list`, `opencode mcp auth <name>`, `opencode mcp logout <name>`, and `opencode mcp debug <name>`. OAuth starts automatically when a remote server asks for it.

**How it works:** MCP tools become automatically available to the LLM powering OpenCode. Important security note: a project-level config can define local servers that run commands on your machine, so be cautious with untrusted repositories.

---

#### Zed

**Support level:** Full support via extensions and settings

**Configuration:** Open Settings > AI > MCP Servers, install a server packaged as a Zed extension, or add it under `context_servers` in `settings.json`:

```json
{
  "context_servers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@bytebase/dbhub",
        "--dsn",
        "postgresql://user@localhost:5432/mydb"
      ]
    }
  }
}
```

**How it works:** Local servers take `command`, `args`, and `env`; remote servers take a `url` and optional headers, with standard MCP OAuth when no Authorization header is set. Zed uses MCP tools and prompts in the Agent Panel. Zed also created the Agent Client Protocol (ACP), launched with Google's Gemini CLI as the first external agent; JetBrains joined in October 2025 and now co-governs it.

### MCP Support Through Application Features

These tools support MCP but through specific application features rather than general-purpose configuration.

---

#### Claude Web

**Support level:** Remote MCP server support via custom connectors

**Configuration:** On Pro or Max, go to **Customize > Connectors**, click **+ Add**, and choose **Add custom connector** with the server's URL. On Team and Enterprise, an Owner adds connectors in Organization settings > Connectors. Custom connectors are available on Free, Pro, Max, Team, and Enterprise plans; Free users get one.

**How it works:** Claude connects to remote MCP servers from Anthropic's cloud, so they must be reachable from the public internet. Claude on the web also supports MCP Apps, which render interactive UIs (dashboards, forms, viewers) directly in the chat. For local stdio servers, use Claude Desktop.

---

#### ChatGPT

**Support level:** Custom MCP servers on ChatGPT web (developer mode, beta)

**Configuration:** According to OpenAI's help center, full MCP support (including write and modify actions) is available to ChatGPT Business, Enterprise, and Edu workspaces. You add a server from Plugins by entering its public HTTPS endpoint (or a Secure MCP Tunnel for servers on a private network) and configuring authentication. Availability on individual plans differs, so check your own Plugins page.

**How it works:** ChatGPT connects only to remote servers, then fetches data from and updates external systems directly from the chat. OpenAI cautions that write actions carry risk and should be tested carefully.

---

#### Perplexity

**Support level:** Local MCP on the macOS app, plus remote MCP

**Configuration:** In the Perplexity app, add servers under Plugins > Add custom. Local servers run only on macOS through Perplexity's helper service; remote servers (HTTP or SSE) can be added the same way.

**How it works:** MCP servers give Perplexity access to your file system, local databases, and other services, complementing its primary web search capabilities.

---

#### T3 Chat

**Support level:** Not documented

T3 Chat's public documentation does not describe native MCP server connections as of this review, so do not plan a workflow around them without checking your own settings first.

---

#### OpenWork

**Support level:** MCP through connectors and plugins

**Configuration:** OpenWork, the open-source desktop agent from Different AI built on OpenCode, treats connectors as MCP services and plugins as bundles of skills and MCP servers. You add them in the app, and they show up in its Library.

**How it works:** MCP connections become tools the agent and its skills can use during file and task operations.

---

#### VS Code with LLM Plugins

**Support level:** Native in VS Code, varies by extension

| Extension                    | MCP Support                      | Configuration                                                  |
| ---------------------------- | -------------------------------- | -------------------------------------------------------------- |
| **GitHub Copilot (VS Code)** | Full support, including MCP Apps | `.mcp.json` in the workspace, user config, or `code --add-mcp` |
| **Cline**                    | Full support                     | `cline_mcp_settings.json` (`mcpServers`)                       |
| **Continue**                 | Full support in Agent mode       | `mcpServers` block or files in `.continue/mcpServers/`         |
| **Aider**                    | Not supported                    | Uses direct terminal commands instead                          |

**How it works:** VS Code itself is an MCP host for stdio, HTTP, and SSE servers, and Copilot's agent mode can use their tools, resources, and prompts. Cline and Continue manage their own MCP connections inside their chat and agent interfaces.

### Limited or No MCP Support

---

#### Gemini Web and NotebookLM

**Gemini app:** The consumer Gemini app can now add custom MCP servers at Settings > Connected Apps > Custom apps by pasting the server's URL. Google currently limits this to personal accounts in the US, in English, for users 18 and older, and write actions need your confirmation. Gemini Enterprise and Workspace have their own MCP support.

**NotebookLM:** No MCP support that I could find. Use it for its strength in source-grounded research and document analysis, and use Gemini CLI, Antigravity, or the Gemini app when you need MCP.

## Choosing the Right MCP Configuration

### For Individual Developers

Start with 2 to 3 MCP servers that match your daily workflow:

1. **Filesystem MCP** for local file access (if your tool does not have built-in file access)
2. **Database MCP** for your primary database (PostgreSQL, MySQL, or SQLite)
3. **GitHub MCP** for repository management

### For Teams

Standardize on a common set of MCP servers and share configurations:

- Store MCP configurations in version control
- Use project-level configs (`.mcp.json` for Claude Code, `.codex/config.toml`, `opencode.jsonc`, `.cursor/mcp.json`) so the entire team connects to the same servers
- Document which MCP servers are required for each project

### For Multi-Tool Workflows

The biggest advantage of MCP is portability. Set up a server once and use it everywhere:

- Configure your database MCP server and use it from Claude Desktop, Claude Code, Cursor, and Codex
- Use the same GitHub MCP server across all your coding tools
- Create custom MCP servers for internal APIs and share them across the team

## Security Considerations

MCP servers can be powerful but carry security implications:

1. **Local execution:** stdio MCP servers run as local processes with your user permissions. A malicious server could access your file system, environment variables, or network.

2. **Write operations:** MCP servers that support writes (database updates, file modifications, API calls) can make changes that are difficult to undo. Always review tool calls before approving, especially for unfamiliar servers.

3. **Untrusted configurations:** Be cautious with project-level MCP configurations in repositories you do not control. A malicious `opencode.json`, `.mcp.json`, or `.codex/config.toml` could define servers that execute harmful commands, which is why Claude Code asks before using project-scoped servers and Codex reads project config only for trusted projects.

4. **Authentication:** For remote MCP servers, use the OAuth flow the spec defines, or bearer tokens where a server requires them. Never embed credentials directly in configuration files that are committed to version control.

5. **Approval flows:** The spec says hosts must obtain user consent before invoking a tool, and most AI tools prompt before each call. Keep this enabled, especially for write operations. Some tools (like Cline) let you auto-approve specific tools while requiring manual review for others.

## Common MCP Patterns

### The Database Query Pattern

Connect a database MCP server and let the AI query your data directly:

"What were our top 10 customers by revenue last quarter?"

The AI invokes the database MCP tool, runs the appropriate SQL query, and presents the results. No manual query writing required.

### The Cross-System Pattern

Connect multiple MCP servers to work across systems:

"Create a GitHub issue for the bug we found in yesterday's Sentry errors, and add it to our Jira sprint board."

The AI uses Sentry MCP to find the error, GitHub MCP to create the issue, and Jira MCP to add it to the sprint.

### The Local Development Pattern

Connect filesystem, database, and browser MCP servers for a complete development workflow:

"Run the test suite, check for failures, look at the database state after the failed test, and fix the issue."

The AI uses terminal access for tests, database MCP for state inspection, and file access for the fix.

## The Future of MCP

MCP is rapidly becoming the standard interface between AI models and external systems. The Agentic AI Foundation that now houses it was co-founded by Anthropic, Block, and OpenAI with support from Google, Microsoft, AWS, Cloudflare, and Bloomberg, and the protocol is likely to expand into:

- **More remote server hosting:** Cloud-hosted MCP servers that require no local setup
- **Richer authentication:** Enterprise SSO and role-based access built on the spec's OAuth model
- **Standardized approval workflows:** Consistent permission models across tools
- **Marketplace ecosystems:** Cursor's Marketplace, Antigravity's MCP Store, and Claude's extension and connector directories already exist

Understanding MCP now positions you to take advantage of these developments as the ecosystem matures. The AI tools that support MCP today will become more capable as the server ecosystem grows, and the MCP servers you configure today will work with the AI tools of tomorrow.

## Frequently Asked Questions

### What is MCP (Model Context Protocol)?

MCP is an open protocol that standardizes how AI applications connect to external tools and data. A host application such as Claude, ChatGPT, Cursor, or VS Code runs MCP clients that talk to MCP servers using JSON-RPC messages, and each server exposes tools, resources, and prompts the model can use.

### How does an AI tool connect to an MCP server?

Through one of two standard transports. With stdio, the host launches the server as a local subprocess and exchanges newline-delimited JSON-RPC over stdin and stdout. With Streamable HTTP, each message is an HTTP POST to one MCP endpoint, which suits remote servers and supports OAuth-based authorization.

### Is the MCP SSE transport deprecated?

Yes. The older HTTP+SSE transport has been deprecated since spec version 2025-03-26, and the 2026-07-28 spec formally marks it Deprecated under the new feature lifecycle policy. New servers should use Streamable HTTP, which can still stream replies over a request-scoped SSE stream.

### What is the current MCP specification version?

The current revision is 2026-07-28. It makes the protocol stateless by removing the initialize handshake and protocol-level sessions, adds `server/discover`, moves tasks into an official extension, and deprecates the Roots, Sampling, and Logging features.

### Who maintains MCP?

Anthropic released MCP in November 2024 and in December 2025 donated it to the Agentic AI Foundation, a directed fund under the Linux Foundation co-founded by Anthropic, Block, and OpenAI. Technical decisions still run through the project's maintainers and Specification Enhancement Proposals (SEPs).

## Go Deeper

To learn more about AI-assisted development, context management, and agentic workflows, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
