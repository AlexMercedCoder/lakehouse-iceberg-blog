---
title: "Run AI Locally: Ollama, Open Models, and Hermes Agent"
pubDatetime: 2026-06-01T09:00:00Z
modDatetime: 2026-10-15T12:00:00Z
description: "Run AI on your own computer: the hardware you need, which open models fit 8GB to 24GB of VRAM, and how Ollama, LM Studio, OpenCode, and Hermes fit together."
author: "Alex Merced"
category: "Artificial Intelligence"
tags:
  - ai
  - artificial intelligence
  - machine learning
  - llm
  - productivity
slug: ai-for-all-levels-june-1-5-going-advanced
draft: false
canonicalURL: "https://datalakehousehub.com/blog/ai-for-all-levels-5-going-advanced/"
faqs:
  - question: "What is the easiest way to run an AI model locally?"
    answer: "Install Ollama from ollama.com, open a terminal, and run a command such as ollama run qwen3.5:9b. Ollama downloads the model and starts a chat session. If you prefer a graphical app, LM Studio gives you a model browser and chat window instead."
  - question: "How much VRAM do I need to run a local LLM?"
    answer: "Small models of 1 to 4 billion parameters run on CPU with 8GB of RAM. A GPU with 8GB of VRAM handles 7 to 9 billion parameter models such as Qwen 3.5 9B, and 16 to 24GB of VRAM handles models in the 14 to 32 billion range at 4 bit quantization."
  - question: "Is Hermes Agent free to use?"
    answer: "Hermes Agent is open source and free to install. What you pay depends on the model behind it: a cloud provider bills for usage, while a local model served by Ollama or LM Studio costs nothing beyond your hardware and electricity."
  - question: "Can OpenCode use a local model?"
    answer: "Yes. Add a provider to opencode.json that uses the @ai-sdk/openai-compatible package and points baseURL at http://localhost:11434/v1 for Ollama or http://127.0.0.1:1234/v1 for LM Studio, then list the local model names you want to use."
  - question: "Are local models as good as ChatGPT or Claude?"
    answer: "Not yet for the hardest work. Frontier cloud models such as GPT-6 Astra and Claude Opus 5.5 still lead on complex reasoning, but a well chosen local model handles summaries, drafts, and everyday questions well, with full privacy."
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/ai-for-all-levels-5-going-advanced/).

This is the final installment of "Catching Up with Using AI for All Levels." Parts 1 through 4 covered the fundamentals, free tools, paid services, and specialized creative tools. This post goes deeper. We will explore the open source ecosystem: models you can download and run on your own computer, agent frameworks that automate complex tasks, and coding tools that work entirely offline.

This is the most technical post in the series, but do not let that scare you. The tools have matured significantly in 2026. Installing and running a local AI model is easier than it was six months ago, and the benefits are real: privacy, offline access, no subscription fees, and unlimited usage after the initial hardware investment.

Reviewed October 15, 2026 against the [Ollama model library](https://ollama.com/library), the [Hermes Agent docs](https://hermes-agent.nousresearch.com/docs), the [OpenCode provider docs](https://opencode.ai/docs/providers/), and [LM Studio's LM Link docs](https://lmstudio.ai/docs/lmlink). Model names and sizes below reflect what those pages list today.

[Return to Part 1: What AI Is and Isnt](/posts/ai-for-all-levels-june-1-1-what-ai-is-and-isnt/)

[Return to Part 2: Getting Started for Free](/posts/ai-for-all-levels-june-1-2-getting-started-for-free/)

[Return to Part 3: ChatGPT and Claude Deep Dive](/posts/ai-for-all-levels-june-1-3-chatgpt-and-claude-deep-dive/)

[Return to Part 4: Specialized AI Tools for Creation](/posts/ai-for-all-levels-june-1-4-specialized-ai-tools/)

---

## Why Run AI on Your Own Hardware

Before we get into the tools, it is worth understanding why someone would choose local AI over the convenience of cloud services.

**Privacy.** When you use ChatGPT, Claude, or Gemini, your conversations are processed on someone else's servers. The companies store and analyze your data. For personal use, this might be acceptable. For business use, especially with sensitive or proprietary information, it is a deal breaker. Local models process everything on your computer. Nothing leaves your machine.

**Offline access.** Cloud services require an internet connection. Local models work anywhere: on a plane, in a remote area, in a secure facility with no external network access. If connectivity is unreliable where you live or work, local AI is the only option.

**No subscription fees.** The popular paid cloud tiers cost $20 to $200 per month. Local models cost nothing to use after you buy the hardware. Over three years, ChatGPT Plus adds up to $720 and Claude Max 20x to $7,200. A $2,000 computer that runs local models is far cheaper than the second number, and if you already own capable hardware, it beats the first one too.

**Unlimited usage.** Cloud subscriptions have rate limits. Pro users hit them regularly. Local models have no rate limits. You can use them as much as you want, as fast as your hardware allows.

**Customization.** Open source models can be fine tuned, modified, and specialized for your specific needs. You can train a model on your own documents. You can adjust its behavior in ways that cloud APIs do not permit.

The tradeoffs are performance and capability. Local models are slower than cloud models. They are less capable, especially at complex reasoning tasks. A 9 billion parameter model running on a laptop cannot match GPT-6 Astra or Claude Opus 5.5. But the gap has narrowed significantly, and for many everyday tasks, local models are good enough.

---

## The Hardware You Need

Running local AI requires a capable computer. The most important component is the GPU (graphics processing unit), because AI inference runs much faster on GPUs than on CPUs.

**Minimum setup:** 8GB of RAM and a modern CPU. You can run small models (1 to 3 billion parameters) on CPU alone. They will be slow, taking 10 to 30 seconds per response, but they work. This is enough for basic text generation and summarization. Edge sized models like Gemma 4 E2B or Qwen 3.5 4B are built for this kind of hardware.

**Good setup:** 16GB of RAM and a GPU with 8GB of VRAM, such as an RTX 3060 or RTX 4060. This handles 7 to 8 billion parameter models comfortably. Response times are 2 to 5 seconds. Most mid range gaming laptops and desktop GPUs from the last few years meet this requirement. This is the sweet spot for most users: you can run Qwen 3.5 9B, Gemma 4 E4B, or the DeepSeek R1 8B distill with good performance.

**Great setup:** 32GB of RAM and a GPU with 16 to 24GB of VRAM, such as an RTX 4090, RTX 5090, or a used RTX 3090. This handles 13 to 30 billion parameter models. Response times are under 2 seconds. Models like DeepSeek R1 14B, Qwen 3.6 27B, and Gemma 4 26B (a mixture of experts model with about 4B active parameters) run well here.

**Overkill:** 64GB+ RAM and 48GB+ VRAM, such as dual RTX 5090s or professional GPUs like the NVIDIA A series. This handles 70 billion parameter dense models and mid sized mixture of experts models such as Llama 4 Scout (109B total parameters, 17B active), where only part of the model activates for each token. The very largest open weight models, such as Llama 4 Maverick (400B total) or DeepSeek V4 Pro (about 1.6 trillion parameters), need far more memory than this even with aggressive quantization.

The good news is that model quantization has improved dramatically. Quantization compresses models to use less memory with minimal quality loss. A 70 billion parameter model that used to require 140GB of VRAM with full precision can now run on 24GB with 4 bit quantization while retaining most of its capability.

### What You Can Expect at Each Level

At the minimum level, you get a capable assistant for simple tasks. It can summarize short documents, draft emails, answer questions about general knowledge, and help with basic coding. The responses are slower but usable.

At the good level, you get a solid daily driver. It handles most tasks well: document analysis, longer writing, moderate reasoning, and code generation. The speed is good enough for interactive use without frustration.

At the great level, you approach cloud model quality for many tasks. Complex reasoning, multi step instructions, and long context windows work well. The difference between this and GPT-6 Astra or Claude Opus 5.5 is noticeable on hard tasks but acceptable for everyday use.

### CPU Only: Is It Worth Trying?

If you do not have a GPU, you can still run local models on CPU. The experience depends on the model size and your patience. Small models (1 to 3B parameters) run at reasonable speed. Medium models (7 to 8B) run at 3 to 10 tokens per second on a modern CPU, which means 10 to 30 seconds per response. This is usable for batch processing or tasks where speed does not matter, but it is too slow for interactive conversation.

The CPU path is worth trying to understand the ecosystem before investing in a GPU. Install Ollama, download a small model, and see what local AI feels like.

---

## Ollama: The Easiest Way to Run Local Models

Ollama is the simplest tool for running local LLMs. It handles model downloading, management, and inference through a single command line interface. It also serves an OpenAI compatible API, which means any application that works with OpenAI's API can work with your local models.

### Installation

Ollama runs on macOS, Linux, and Windows. Download the installer from ollama.com and run it. The installation takes about two minutes. After installation, Ollama runs as a background service.

### Running a Model

Open a terminal and run:

```
ollama run qwen3.5:9b
```

Ollama downloads the model (about 7GB for this one) and starts an interactive chat session. Avoid starting with `ollama run llama4`: the default Llama 4 tag is a 67GB download. Type your questions and get responses from the local model. Type /exit to leave.

The first download takes time depending on your internet speed. Subsequent runs use the cached model and start instantly.

### Available Models

Ollama hosts hundreds of models. Here are the ones worth knowing about in 2026.

**Llama 4 (Meta).** Meta's Llama 4 family uses a mixture of experts design. Scout has 109 billion total parameters with 17 billion active per token, and Maverick has 400 billion total with 17 billion active. Even Scout is a 67GB download in Ollama, so Llama 4 belongs on a workstation, not a laptop.

**DeepSeek V4 and R1.** DeepSeek's models have been a sensation in the open source community. V4 is their current general purpose family, released as V4 Flash and V4 Pro. R1 is their reasoning model that shows its chain of thought before answering, and Ollama offers it in sizes from 1.5B to 671B. The smaller distilled versions (7B, 8B, and 14B) run on consumer hardware and punch above their weight class. The V4 models are far larger (V4 Flash alone is roughly 290 billion parameters), so most people use them through DeepSeek's API.

**Qwen 3.5 and 3.6 (Alibaba).** Qwen models have consistently improved. The 3.5 series, released in February 2026, comes in sizes from 0.8B to 122B and performs well across coding, reasoning, and general tasks. Qwen 3.6 follows with 27B and 35B models focused on agentic coding. The 4B and 9B Qwen 3.5 models are popular choices for laptops.

**Gemma 4 (Google).** Google's open model family is designed for efficient inference. Gemma 4 26B is a mixture of experts model with about 4B active parameters, so it runs quickly on a single 24GB GPU. The edge sized E2B and E4B models target laptops and phones, and a 12B model sits in between.

**Mistral.** Mistral's models are known for efficiency. Mistral Small 4 is a 119B mixture of experts model with about 6B active parameters, which puts it in workstation territory. On ordinary GPUs, Mistral Small 3.2 (24B) and Mistral Nemo (12B) are the practical picks.

**Phi 4 (Microsoft).** Microsoft's Phi series focuses on small, capable models. Phi 4 runs on modest hardware and handles coding and reasoning tasks surprisingly well for its size.

### Practical Example

Install Ollama, download Qwen 3.5 9B, and start using it as a local assistant. Ask it to summarize documents (paste the text directly), draft emails, explain concepts, or brainstorm ideas. The quality is not as good as GPT-6 Astra, but it is fast, private, and free.

For better quality, try DeepSeek R1 14B. The chain of thought reasoning makes it more thorough for complex questions, and it runs well on 12GB of VRAM.

---

## LM Studio: A Graphical Interface for Local Models

If the command line is not your preference, LM Studio provides a graphical interface for running local models. It includes a model browser, download manager, and chat interface in a single desktop application.

LM Studio also serves an OpenAI compatible API endpoint, just like Ollama. You can start the local server and point any application at `http://localhost:1234/v1`. This is useful for connecting local models to other tools.

The key advantage of LM Studio is LM Link, a feature that lets you access a model running on one computer from other devices on your network. You can run a large model on your powerful desktop and access it from your laptop. LM Studio built it with Tailscale, so traffic between your devices is end to end encrypted and works across networks.

---

## DeepSeek: The Open Weight Powerhouse

DeepSeek deserves special attention because it changed the open source AI landscape. In January 2025, DeepSeek released R1, a reasoning model built on its V3 base model that rivaled OpenAI's reasoning models on many benchmarks at a reported fraction of the training cost. The V4 family followed.

DeepSeek models are open weight, meaning you can download the actual trained parameters and run them on your own hardware. This is different from open source models that release only the architecture and training code. Open weight models let you inspect, fine tune, and deploy the exact model that achieved specific benchmark results.

DeepSeek V4 is available through DeepSeek's own chat app and API, through third party API providers, and as downloadable weights for anyone with the hardware to run them.

The pricing advantage is substantial. As of October 2026, DeepSeek lists V4 Pro at $3.96 per million output tokens at peak hours, while OpenAI lists GPT-6 Astra at $50 per million output tokens. This makes it attractive for developers building applications that make many API calls, and for users who want to experiment with advanced models without committing to a $200 per month subscription.

---

## OpenCode: Terminal Based Coding Agent

OpenCode is an open source, provider agnostic coding agent that runs in your terminal. It is similar to Claude Code but works with any model provider, including local models.

### Installation

OpenCode installs with a single command: `curl -fsSL https://opencode.ai/install | bash`. You can also use `npm install -g opencode-ai`, or Homebrew with `brew install anomalyco/tap/opencode`. The setup takes under a minute.

### Configuration

OpenCode works out of the box with cloud providers by default. To use it with a local model, add a provider to your `opencode.json` configuration file that points to your local endpoint.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {
        "deepseek-r1:14b": {
          "name": "DeepSeek R1 14B"
        }
      }
    }
  }
}
```

This configuration tells OpenCode to use a model running on Ollama's local endpoint.

### Daily Use

OpenCode operates in two modes. Interactive mode (`opencode`) opens a terminal UI where you describe your task and OpenCode works through it step by step. One shot mode (`opencode run "Add error handling to the API calls in src/client.py"`) executes a single task and exits.

For developers, OpenCode replaces or supplements GitHub Copilot and Claude Code. It understands your project structure, reads and writes files, runs terminal commands, and manages git operations. The key advantage is provider flexibility: you can use a local model for simple tasks and switch to a cloud model for complex ones, all within the same tool.

For non developers, OpenCode is less directly useful. But it powers other applications that may benefit you indirectly, such as automated document processing pipelines and data transformation tools.

---

## Hermes Agent: The AI Orchestrator

Hermes Agent, created by Nous Research, is an open source AI agent framework that runs in your terminal. Think of it as an AI assistant that can use tools, remember context across sessions, and coordinate with other AI tools.

### What Makes Hermes Different

Hermes is provider agnostic. It works with Nous Portal, OpenRouter, OpenAI, LM Studio, or any OpenAI compatible endpoint, which includes a local Ollama server. You configure the provider once, and Hermes handles the rest.

The persistent memory system is a standout feature. Hermes remembers facts across sessions. Tell it your preferences once, and they apply to all future conversations. This is similar to ChatGPT's memory feature, but the memories are stored on your machine. Pair Hermes with a local model and nothing leaves your computer.

The skill system lets you save reusable procedures. If you have a workflow you repeat often, you can save it as a skill, and Hermes runs it automatically when the relevant context appears. Hermes can also write and refine skills on its own as it learns how you work, and you can read and edit them yourself.

### Installation

`bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes setup
`

The setup walks you through configuration: choosing a provider, setting up tools, and configuring your preferred model. `hermes setup --portal` is the fastest path if you want Nous Research's hosted model gateway.

### Daily Use

Use Hermes in three ways.

**Interactive chat.** Run `hermes` to start an interactive session. You can ask questions, request tasks, and have multi turn conversations, just like ChatGPT or Claude, but with the ability to run commands, access files, and use tools.

**One shot queries.** `hermes chat -q "Summarize the changes in the last three git commits" --oneshot` runs a single query, prints the result, and exits. This is useful for scripting and automation.

**Scheduled tasks.** Hermes has built in cron scheduling (`hermes cron create`). Set up a daily briefing that summarizes your calendar, email, and task list every morning. The output can be delivered to a messaging platform such as Slack or Telegram, or saved to a file.

### Daily Productivity Examples for Non Developers

For readers who are not developers, Hermes might sound like a developer tool. It is, but its uses extend beyond coding. Here are concrete examples that anyone can use.

**Research automation.** Save a research workflow as a Hermes skill. When you need to research a topic, run the skill, and Hermes searches the web, extracts key information, and compiles a summary. You do not need to manually search, copy, and paste. The skill remembers your preferred format: bullet points, paragraph summaries, or structured reports.

**File organization.** Ask Hermes to organize your Downloads folder by file type, date, or project. "Find all PDFs modified in the last week and move them to a Research folder. Delete any .tmp files older than 30 days. Create subfolders by category based on file names." Hermes executes the task using its terminal access, moving and organizing files according to your instructions.

**Meeting notes.** Record meeting notes as a Hermes skill. When you finish a meeting, run the skill and Hermes prompts you for key decisions, action items, and follow ups. It formats the output consistently and saves it to your notes folder with a timestamp and meeting title. Over time, you build a searchable archive of formatted meeting notes.

**Content repurposing skill.** Save a skill that takes a piece of content and produces versions for different platforms. Input: a blog post. Output: LinkedIn summary, Twitter thread, newsletter excerpt, and internal memo. Run it once, get all four formats. The skill defines the tone and length for each platform so you do not need to repeat instructions.

**Weekly review.** Set up a scheduled Hermes task that runs every Friday at 4 PM. It reviews your week's activity, summarizes what you accomplished, and drafts a status report. You review and send. The cron based scheduling means the task runs automatically without you remembering to start it.

**The key insight is that Hermes remembers.** Unlike ChatGPT or Claude, which start fresh each conversation, Hermes saves skills and memories. Every hour you invest in setting up skills pays back in future sessions as tasks that used to take ten minutes now take one.

---

## Privacy First: The Local AI Stack

The most interesting development in 2026 is the local AI stack: a fully private, offline setup that replaces cloud dependent tools. The standard combination is:

**LM Studio** or **Ollama** to run models locally.
**OpenCode** for coding tasks, pointing at the local model.
**Hermes Agent** for general purpose tasks and orchestration, also pointing at the local model.

All three tools can use the same local model through Ollama's API. You install Ollama once, download a few models, and point both OpenCode and Hermes at its local endpoint.

The result is a fully private AI setup. Your data never leaves your machine. No subscriptions. No rate limits. No privacy concerns. The tradeoff is capability: local models are not as smart as the cloud frontier models. But for many everyday tasks, they are good enough.

Because Hermes can run terminal commands, it can call `opencode run` to hand coding work to OpenCode. The general purpose agent delegates to the specialized tool, and the whole system works together.

---

## Open Source Image Generation

Local AI is not limited to text. Image generation models also run on your own hardware.

**Stable Diffusion 3.5** runs locally via ComfyUI, InvokeAI, or similar front ends. You download the model once and generate unlimited images with no per image costs. The quality is competitive with cloud services for many use cases.

**FLUX** models from Black Forest Labs are available as open weights. FLUX.2 [klein] comes in 4B and 9B sizes that fit consumer GPUs, while FLUX.2 [dev] is a 32B model that needs a high end card or heavy quantization. Check each model's license before commercial use, because several are non commercial.

Running image generation locally requires a GPU with sufficient VRAM. 8GB handles smaller models such as Stable Diffusion 3.5 Medium and FLUX.2 [klein] 4B. 16GB or more gives you room for larger models and higher resolution outputs.

---

## The Bottom Line

The open source AI ecosystem in 2026 is mature enough for daily use. You can run a capable language model, a coding assistant, an agent framework, and an image generator all on a single consumer grade computer, all for free after the hardware purchase.

For anyone who values privacy or needs offline access. Anyone who wants unlimited usage without subscription fees. Anyone who enjoys tinkering with technology and wants full control over their AI tools.

The privacy argument is the strongest for most users. Consider this: ChatGPT's pricing page states that content on its consumer plans is used to train OpenAI's models unless you opt out. Every document you upload to Claude is processed on Anthropic's servers. For personal use, you might be comfortable with this. For work related tasks, your employer's policies may prohibit sending data to third party AI services. Local models remove this concern entirely.

**Who should stick with cloud services?** Anyone who wants the best possible quality with zero setup effort. Cloud models are still smarter, faster, and more reliable than local alternatives. For mission critical work where quality matters most, the cloud is the better choice. If you are a writer producing polished content, a researcher synthesizing complex information, or a developer solving hard problems, the $20 per month for ChatGPT Plus or Claude Pro is money well spent.

**Who should try local?** Anyone who is curious, values privacy, works offline sometimes, or wants to avoid ongoing subscription costs. The setup takes an afternoon. The hardware costs money upfront but pays for itself over time. And the learning process itself is valuable: running a local model gives you a deeper understanding of how AI actually works, which is the whole point of this series.

The best approach is hybrid. Use cloud services for the hard stuff: complex reasoning, long form writing, creative brainstorming. Use local models for everyday tasks: simple questions, document summaries, quick drafts, and anything involving sensitive data. Both have their place, and the tools now make it easy to switch between them.

### Quick Decision Guide

| Goal                                        | Recommendation                                                        |
| ------------------------------------------- | --------------------------------------------------------------------- |
| Best quality, no setup                      | ChatGPT Plus ($20/mo) or Claude Pro ($20/mo)                          |
| Best quality, AI that works on your desktop | Claude Pro ($20/mo) or Max (from $100/mo) for Cowork and computer use |
| Privacy, offline, zero recurring cost       | Ollama + local models, free after hardware                            |
| Best balance of privacy and capability      | Hybrid: cloud for hard tasks, local for sensitive work                |
| Developer coding assistant                  | OpenCode or Claude Code with your choice of model                     |
| Full AI automation on your machine          | Hermes Agent with skills and scheduled tasks                          |

### The Takeaway

You do not need to choose one approach exclusively. The best AI setup in 2026 uses multiple tools for different tasks. Free Google services for everyday queries. A $20 subscription for hard problems. Local models for sensitive work. Specialized tools for creative projects. The ecosystem is broad enough that there is a right tool for every task and a price point for every budget.

---

## Frequently Asked Questions

### What is the easiest way to run an AI model locally?

Install Ollama from ollama.com, open a terminal, and run a command such as ollama run qwen3.5:9b. Ollama downloads the model and starts a chat session. If you prefer a graphical app, LM Studio gives you a model browser and chat window instead.

### How much VRAM do I need to run a local LLM?

Small models of 1 to 4 billion parameters run on CPU with 8GB of RAM. A GPU with 8GB of VRAM handles 7 to 9 billion parameter models such as Qwen 3.5 9B, and 16 to 24GB of VRAM handles models in the 14 to 32 billion range at 4 bit quantization.

### Is Hermes Agent free to use?

Hermes Agent is open source and free to install. What you pay depends on the model behind it: a cloud provider bills for usage, while a local model served by Ollama or LM Studio costs nothing beyond your hardware and electricity.

### Can OpenCode use a local model?

Yes. Add a provider to opencode.json that uses the @ai-sdk/openai-compatible package and points baseURL at http://localhost:11434/v1 for Ollama or http://127.0.0.1:1234/v1 for LM Studio, then list the local model names you want to use.

### Are local models as good as ChatGPT or Claude?

Not yet for the hardest work. Frontier cloud models such as GPT-6 Astra and Claude Opus 5.5 still lead on complex reasoning, but a well chosen local model handles summaries, drafts, and everyday questions well, with full privacy.

---

## Where to Go From Here

This series covered the full spectrum of AI tools available in 2026. You started with the fundamentals in Part 1: how prediction engines, vectors, and transformers work. You moved to free tools in Part 2: Gemini, NotebookLM, and the Google AI ecosystem. Part 3 covered the paid powerhouses: ChatGPT and Claude with their desktop apps, Dispatch, and advanced features. Part 4 toured the creative side: image, video, music, and audio generation. This final part opened the door to the open source world: local models, agent frameworks, and complete privacy.

The point of this series is not to sell you on any particular tool or approach. It is to give you a map of the landscape so you can choose what fits your needs. The best AI tool is the one you actually use. Start with the free tier. Add a paid subscription when you hit limits. Explore local models if privacy matters to you. Switch between tools depending on the task.

AI is not magic and it is not sentient, as we covered in Part 1. It is a tool, like a search engine or a spreadsheet, but more versatile than either. The more you understand what it is and what it is not, the better you will use it.

[Return to Part 1: What AI Is and Isnt](/posts/ai-for-all-levels-june-1-1-what-ai-is-and-isnt/)

[Return to Part 2: Getting Started for Free](/posts/ai-for-all-levels-june-1-2-getting-started-for-free/)

[Return to Part 3: ChatGPT and Claude Deep Dive](/posts/ai-for-all-levels-june-1-3-chatgpt-and-claude-deep-dive/)

[Return to Part 4: Specialized AI Tools for Creation](/posts/ai-for-all-levels-june-1-4-specialized-ai-tools/)
