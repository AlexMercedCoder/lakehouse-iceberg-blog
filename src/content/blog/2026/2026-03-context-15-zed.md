---
title: "Zed AI Context: Agent Panel, AGENTS.md, Rules, and MCP"
pubDatetime: 2026-03-07T23:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-03-07"
description: "Zed's Agent Panel loads one project instruction file (.rules first, then AGENTS.md or CLAUDE.md), takes @-mentions as context, and adds MCP via context_servers."
author: "Alex Merced"
category: "AI Tools"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - AI tools
  - context management
  - prompt engineering
  - zed
slug: 2026-03-context-zed
draft: false
faqs:
  - question: "Does Zed support AGENTS.md?"
    answer: "Yes. Zed reads AGENTS.md as a project instruction file, and it also reads a personal ~/.config/zed/AGENTS.md (%APPDATA%\\Zed\\AGENTS.md on Windows). In a project, Zed uses only the first match from .rules, .cursorrules, .windsurfrules, .clinerules, .github/copilot-instructions.md, AGENT.md, AGENTS.md, CLAUDE.md, and GEMINI.md, so a .rules file takes priority over AGENTS.md."
  - question: "How do I add files as context in Zed's Agent Panel?"
    answer: "Type @ in the message editor and pick a file, directory, symbol, previous thread, skill, diagnostics, branch diff, or URL. You can also add selected editor text with cmd-> (ctrl-> on Linux and Windows)."
  - question: "How do I configure MCP servers in Zed?"
    answer: "Open Settings > AI > MCP Servers > Add Server, install a server packaged as a Zed extension, or add an entry under context_servers in settings.json. Local servers take command, args, and env; remote servers take url and optional headers."
  - question: "What happened to Zed's slash commands and Rules Library?"
    answer: "Zed replaced text threads and the old /file-style slash commands with @-mentions in the Agent Panel. The Rules Library was split into Instructions (always-on files such as .rules and AGENTS.md) and Skills (SKILL.md folders invoked with / or @skill)."
  - question: "What happens when a Zed thread runs out of context?"
    answer: "Zed automatically compacts long Zed Agent threads as they approach agent.auto_compact.threshold, which defaults to 90%. You can compact manually with /compact or start a fresh thread with New From Summary."
---

Zed is a high-performance code editor built in Rust that prioritizes speed, simplicity, and real-time collaboration. Its AI integration is built around the Agent Panel, an Inline Assistant, project instruction files, Skills, MCP servers, and a flexible provider system that supports many AI services. What sets Zed apart from other AI editors is its focus on performance (everything runs natively, not in Electron) and its built-in multiplayer editing.

**The short answer:** Zed's agent gets context from four places. It reads one project instruction file, picking the first match in this order: `.rules`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`, `AGENT.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`. It also reads your personal `~/.config/zed/AGENTS.md`. You add task context by typing `@` in the Agent Panel to mention files, directories, symbols, past threads, skills, diagnostics, branch diffs, or URLs. MCP servers go under `context_servers` in `settings.json` (or Settings > AI > MCP Servers > Add Server). Long threads auto-compact at 90% of the window by default, and `/compact` does it on demand.

This guide was reviewed on October 15, 2026 against Zed's docs for the [Agent Panel](https://zed.dev/docs/ai/agent-panel), [Instructions](https://zed.dev/docs/ai/instructions), [Skills](https://zed.dev/docs/ai/skills), [MCP](https://zed.dev/docs/ai/mcp), and [Agent Settings](https://zed.dev/docs/ai/agent-settings). Earlier versions of this article described the old Assistant Panel, text threads, and `/file`-style slash commands; Zed has since replaced those, and the sections below reflect the current design.

## How Zed Manages Context

Zed builds AI context from several sources:

1. **Agent Panel threads** - multi-turn conversations with an agent that can read, write, and run code in your project
2. **Instructions** - one project instruction file plus your personal `AGENTS.md`, loaded automatically
3. **@-mentions** - files, directories, symbols, threads, skills, diagnostics, diffs, and URLs you add explicitly
4. **Skills** - reusable task instructions invoked by name
5. **Inline Assistant** - focused edits on a selection, line, or multiple cursors
6. **Agent tools** - built-in tools the agent uses to inspect and change your project
7. **MCP servers** - external tools and prompts configured as context servers

Zed's design leans toward explicit control: you can see the instruction file, every @-mention in your message, and the token count for the active thread, so it is clear what the model is working with.

## The Agent Panel: Structured Conversations

The Agent Panel is the primary interface for AI work that needs more than the current selection. Open it from the status bar icon or with the `agent: new thread` action in the Command Palette.

### How the Panel Works

Each thread is a conversation with an agent that can use tools to read files, make edits, and run commands. After the model edits files, a **Restore Checkpoint** button lets you roll back to the earlier state. Agent Profiles control which built-in and MCP tools the agent may use.

### Thread History and Token Usage

Thread History keeps your threads across all projects, sorted by date, so you can return to an ongoing conversation about a feature or decision. Zed shows how many tokens the active thread is using next to the profile selector. When a Zed Agent thread nears the configured threshold (`agent.auto_compact.threshold`, `90%` by default), Zed compacts it automatically. You can run `/compact` yourself or use **New From Summary** to start a fresh thread seeded with a summary of the old one.

### External Agents

The Agent Panel can also host external agents that connect through the Agent Client Protocol (ACP). Those agents bring their own context handling; for example, a Claude-based agent reads `CLAUDE.md` natively rather than through Zed's instruction loader.

## Zed's Explicit Context Philosophy

In Zed, you decide much of what the model sees by choosing @-mentions and by keeping a clean instruction file. The agent can still explore on its own with its tools, but explicit context is the fastest path to a good answer. This has tradeoffs:

**Advantages of explicit context:**

- You always know what the AI is working with
- No surprises from irrelevant code being included
- Works well with smaller model context windows (no wasted tokens)
- Context is reproducible: the same mentions produce the same starting context

**Tradeoffs:**

- Requires more manual effort to set up context
- You need some idea of which files are relevant before asking, or you spend tokens while the agent searches

Understanding this philosophy helps you use Zed's AI features effectively: invest time in selecting the right context rather than expecting the editor to figure it out for you.

## Real-Time Collaboration and AI

Zed's built-in multiplayer editing lets developers work in the same project and channel notes in real time, and the Inline Assistant works inside channel notes as well as editors. A common pattern is for one developer to drive the agent while another reviews the diffs as they land, then both discuss the result in the shared project.

## Instructions: Project Rules, AGENTS.md, and CLAUDE.md

Instructions are the always-on layer. Zed has replaced its old Rules Library: always-on rules became Instructions, and reusable rules became Skills.

### Project Instructions

Zed looks in the project root for these files and uses **only the first one it finds**:

1. `.rules`
2. `.cursorrules`
3. `.windsurfrules`
4. `.clinerules`
5. `.github/copilot-instructions.md`
6. `AGENT.md`
7. `AGENTS.md`
8. `CLAUDE.md`
9. `GEMINI.md`

This order matters. If a repo has both `.rules` and `AGENTS.md`, Zed's agent reads `.rules` and ignores `AGENTS.md`. If your team shares instructions across several tools, keep a single `AGENTS.md` and avoid leaving a stale `.cursorrules` or `.windsurfrules` in the root.

### Personal Instructions

Your own defaults live in `~/.config/zed/AGENTS.md` on macOS and Linux (`%APPDATA%\Zed\AGENTS.md` on Windows). When personal and project instructions conflict, the project file wins.

```markdown
# AGENTS.md

## Stack

- TypeScript, Node 22, PostgreSQL via Prisma

## Conventions

- Validate all input with Zod
- Never edit generated files in src/gen/

## Testing

- Run `pnpm test` after changes and fix failures before finishing
```

## @-Mentions: Explicit Context Injection

Type `@` in the Agent Panel message editor to add specific context to a prompt.

| Mention             | What it adds                                 |
| ------------------- | -------------------------------------------- |
| Files / directories | The content of a file or a directory's files |
| Symbols             | A function, class, or other symbol           |
| Threads             | A previous Agent Panel thread                |
| Skills              | A skill's instructions                       |
| Diagnostics         | Current language server errors and warnings  |
| Branch diff         | The changes on your current branch           |
| URLs                | The fetched content of a web page            |

You can also add selected editor text to the message with `cmd->` (`ctrl->` on Linux and Windows).

### Using Mentions Effectively

The power of mentions is precision. Instead of hoping the agent finds the right files, you point it at them:

```
@src/auth/middleware.ts @src/auth/types.ts plus the current diagnostics

Fix the TypeScript errors in the auth middleware.
The types file defines the expected interfaces.
```

This focused approach produces better results than sending the AI a vague question against a massive context window. Each piece of context is intentional and relevant.

### Diagnostics for Error-Driven Context

Mentioning diagnostics pulls language server errors and warnings straight into the conversation. Instead of manually copying error messages, one mention gives the AI structured diagnostic information.

### URLs for External Documentation

Mentioning a URL fetches the page into context, which is handy for API references and framework docs you do not want to paste by hand.

## Skills: Reusable Prompts

Skills replaced the saved prompts of the old Rules Library. A skill is a folder containing a `SKILL.md` file with YAML frontmatter (`name` and `description` are required) followed by Markdown instructions.

### Where Skills Live

- Global: `~/.agents/skills/<skill-name>/SKILL.md`
- Project: `.agents/skills/<skill-name>/SKILL.md`

### Creating a Skill

```markdown
---
name: code-review
description: Review code for security, performance, and error handling issues.
---

Review the provided code for:

1. Security vulnerabilities (injection, XSS, CSRF)
2. Performance issues (N+1 queries, unnecessary allocations)
3. Error handling completeness
4. Type safety issues
5. Missing edge cases

For each issue found:

- Describe the problem
- Explain the risk
- Provide a fix
```

### Using Skills

Type `/` in the message editor and pick the skill by name, or use `@skill`, then mention the file to review. This combines your predefined criteria with the specific code, creating a structured, repeatable workflow.

### When to Create Skills

Create skills for tasks you perform regularly:

- Code reviews with consistent criteria
- Documentation generation in a specific format
- Refactoring with specific patterns (extract function, apply interface)
- Test generation following your testing conventions

## AI Provider Configuration

Zed supports many ways to reach a model: Zed-hosted models, direct API access (including Anthropic-compatible and OpenAI-compatible providers), existing subscriptions such as ChatGPT, Claude, or Copilot, gateways such as OpenRouter, Bedrock, and Vercel, and local or self-hosted models.

### Context Window Implications

Different providers offer different context window sizes. Zed shows token usage for the active thread, so you can see when a model is getting full. With a smaller local model, be more selective with mentions. With a large cloud model, you can include more files, but auto-compaction will still kick in near the threshold.

### Configuring in settings.json

```json
{
  "agent": {
    "default_model": {
      "provider": "anthropic",
      "model": "claude-opus-4-6"
    },
    "auto_compact": {
      "threshold": "90%"
    }
  }
}
```

`agent.inline_assistant_model` lets you pick a different, faster model for the Inline Assistant.

## The Inline Assistant

For quick edits that do not require a full conversation, the Inline Assistant lets you select code and apply AI changes directly in the editor.

### How It Works

1. Select code (or place the cursor on a line)
2. Press `ctrl-enter`
3. Type your instruction ("Add error handling" or "Convert to async/await")
4. Zed replaces the selection with the model's response

With multiple cursors, the same prompt runs at every cursor at once. The Inline Assistant also works in the terminal panel and in channel notes.

### Context for the Inline Assistant

The Inline Assistant sends your selection (or current line) plus your instruction. You can @-mention files, directories, symbols, instruction files, and past threads (`@thread`) to give it more to work with. It uses your Zed-configured providers; external agents are not available here.

## MCP Server Support

Zed supports MCP tools and prompts through what it calls context servers.

### Configuration

Add a server from **Settings > AI > MCP Servers > Add Server**, install one as an extension (many servers, such as GitHub, are packaged that way), or edit `settings.json` directly:

```json
{
  "context_servers": {
    "local-mcp-server": {
      "command": "some-command",
      "args": ["arg-1", "arg-2"],
      "env": {}
    },
    "remote-mcp-server": {
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

A remote server without an `Authorization` header triggers the MCP OAuth flow. A green dot next to the server in MCP Servers settings means it is active. By default Zed asks before running any tool (`agent.tool_permissions.default` is `"confirm"`), and you can set per-tool rules with keys like `mcp:github:create_issue`.

### When to Use MCP in Zed

MCP is most useful when the agent needs live data (database schemas, API responses, running service status) that cannot be obtained from static files. For code-only tasks, mentions and the agent's built-in tools are sufficient.

## External Documents: PDFs vs. Markdown

### Markdown for Everything You Control

Instructions, skills, reference documents, and coding standards should be Markdown. Zed's instruction files and skills are plain text by design.

### PDFs

For reference material in PDF form, extract relevant sections into Markdown files in your project and @-mention them. If the content is available online, mention the URL instead.

## Thinking About Context Levels in Zed

### Minimal Context (Inline Edits)

Select code, press `ctrl-enter`, describe the change. The selection and your instruction provide enough context for small changes.

### Moderate Context (Feature Work)

Use the Agent Panel with targeted mentions: the relevant files, current diagnostics, and a skill for your coding standards.

### Comprehensive Context (Architecture)

Mention multiple files and directories, pull in architecture docs by URL, rely on your project instruction file for conventions, and start from a summary of an earlier thread with **New From Summary** when a long investigation needs a fresh window.

## Advanced Patterns

### The Multi-File Context Pattern

For changes that span multiple files, mention each one:

```
@src/models/user.ts @src/services/userService.ts
@src/routes/users.ts @tests/services/userService.test.ts

Add a "preferences" field to the User model and propagate it through the service layer, API routes, and tests.
```

### The Diagnostic-Driven Fix Pattern

1. Run your build or test suite
2. Open the Agent Panel
3. Mention diagnostics to load all current errors
4. Ask the agent to fix the errors systematically

### The Collaborative AI Pattern

Zed's multiplayer features mean multiple developers can work in the same project in real time while one of them drives the agent. One developer sets up the context and prompt while another reviews the diffs as they arrive.

### The Speed-Focused Workflow

For developers who prioritize responsiveness:

1. Set a fast model as `inline_assistant_model` for inline edits
2. Use a more capable model for Agent Panel threads
3. Keep threads focused and short, and compact or start from a summary when they grow
4. Use the Inline Assistant for most edits, reserving the panel for complex tasks

## Common Mistakes

1. **Over-including context.** Zed gives you explicit control over context. Use it wisely. Mentioning a whole directory when only 2 files are relevant dilutes the AI's focus.

2. **Shadowing AGENTS.md with an old rules file.** Zed reads only the first matching instruction file. A forgotten `.rules` or `.cursorrules` in the root silently wins over your `AGENTS.md`.

3. **Not using skills.** If you repeat the same instructions across threads, save them as a skill. One `/code-review` is better than retyping your review criteria every time.

4. **Ignoring diagnostics.** Mentioning diagnostics provides structured error context that is faster and more accurate than manually pasting error messages.

5. **Using the Agent Panel for simple edits.** The Inline Assistant is faster and needs less setup. Use the panel for complex, multi-file work.

6. **Letting threads run forever.** Watch the token count, and use `/compact` or New From Summary before quality drops.

## Frequently Asked Questions

### Does Zed support AGENTS.md?

Yes. Zed reads AGENTS.md as a project instruction file, and it also reads a personal ~/.config/zed/AGENTS.md (%APPDATA%\Zed\AGENTS.md on Windows). In a project, Zed uses only the first match from .rules, .cursorrules, .windsurfrules, .clinerules, .github/copilot-instructions.md, AGENT.md, AGENTS.md, CLAUDE.md, and GEMINI.md, so a .rules file takes priority over AGENTS.md.

### How do I add files as context in Zed's Agent Panel?

Type @ in the message editor and pick a file, directory, symbol, previous thread, skill, diagnostics, branch diff, or URL. You can also add selected editor text with cmd-> (ctrl-> on Linux and Windows).

### How do I configure MCP servers in Zed?

Open Settings > AI > MCP Servers > Add Server, install a server packaged as a Zed extension, or add an entry under context_servers in settings.json. Local servers take command, args, and env; remote servers take url and optional headers.

### What happened to Zed's slash commands and Rules Library?

Zed replaced text threads and the old /file-style slash commands with @-mentions in the Agent Panel. The Rules Library was split into Instructions (always-on files such as .rules and AGENTS.md) and Skills (SKILL.md folders invoked with / or @skill).

### What happens when a Zed thread runs out of context?

Zed automatically compacts long Zed Agent threads as they approach agent.auto_compact.threshold, which defaults to 90%. You can compact manually with /compact or start a fresh thread with New From Summary.

## Go Deeper

To learn more about AI-assisted development and context management strategies, check out these resources by Alex Merced:

- [The 2026 Guide to AI-Assisted Development](https://www.amazon.com/2026-Guide-AI-Assisted-Development-Engineering-ebook/dp/B0GQW7CTML/) covers AI-assisted development workflows, prompt engineering, and context strategies for software engineers.

- [The 2026 Guide to Lakehouses, Apache Iceberg and Agentic AI](https://www.amazon.com/Lakehouses-Apache-Iceberg-Agentic-Hands/dp/B0GQNY21TD/) explores how AI agents are reshaping data architecture and how to build systems that support agentic workflows.

And for a fictional take on where AI is heading:

- [The Emperors of A.I. Valley: A Novel of Power, Code, and the War for the Future](https://www.amazon.com/Emperors-I-Valley-Novel-Future/dp/B0GQHKF4ZT/) is a novel about the power struggles and ethical dilemmas behind the companies building the most powerful AI systems in the world.
