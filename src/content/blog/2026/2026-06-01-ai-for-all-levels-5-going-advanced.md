     1|---
     2|title: "Going Advanced: Open Source Models, Hermes Agent, and Local AI"
     3|pubDatetime: 2026-06-01T09:00:00Z
     4|description: "Tired of subscriptions and privacy concerns? Open source models and agent frameworks let you run AI on your own hardware. Here is how to get started with Hermes Agent, OpenCode, DeepSeek, and local Llama models."
     5|author: "Alex Merced"
     6|category: "Artificial Intelligence"
     7|tags:
     8|  - ai
     9|  - artificial intelligence
    10|  - machine learning
    11|  - llm
    12|  - productivity
    13|slug: ai-for-all-levels-5-going-advanced
    14|draft: false
    15|---
    16|
    17|This is the final installment of "Catching Up with Using AI for All Levels." Parts 1 through 4 covered the fundamentals, free tools, paid services, and specialized creative tools. This post goes deeper. We will explore the open source ecosystem: models you can download and run on your own computer, agent frameworks that automate complex tasks, and coding tools that work entirely offline.
    18|
    19|This is the most technical post in the series, but do not let that scare you. The tools have matured significantly in 2026. Installing and running a local AI model is easier than it was six months ago, and the benefits are real: privacy, offline access, no subscription fees, and unlimited usage after the initial hardware investment.
    20|
    21|**Return to Part 1: What AI Is and Isnt**
    22|
    23|**Return to Part 2: Getting Started for Free**
    24|
    25|**Return to Part 3: ChatGPT and Claude Deep Dive**
    26|
    27|**Return to Part 4: Specialized AI Tools for Creation**
    28|
    29|---
    30|
    31|## Why Run AI on Your Own Hardware
    32|
    33|Before we get into the tools, it is worth understanding why someone would choose local AI over the convenience of cloud services.
    34|
    35|**Privacy.** When you use ChatGPT, Claude, or Gemini, your conversations are processed on someone else's servers. The companies store and analyze your data. For personal use, this might be acceptable. For business use, especially with sensitive or proprietary information, it is a deal breaker. Local models process everything on your computer. Nothing leaves your machine.
    36|
    37|**Offline access.** Cloud services require an internet connection. Local models work anywhere: on a plane, in a remote area, in a secure facility with no external network access. If connectivity is unreliable where you live or work, local AI is the only option.
    38|
    39|**No subscription fees.** The cloud services cost $20 or $200 per month. Local models cost nothing to use after you buy the hardware. If you do the math over three years, a $2,000 computer running local models is cheaper than $720 of ChatGPT Plus or $7,200 of Claude Max.
    40|
    41|**Unlimited usage.** Cloud subscriptions have rate limits. Pro users hit them regularly. Local models have no rate limits. You can use them as much as you want, as fast as your hardware allows.
    42|
    43|**Customization.** Open source models can be fine tuned, modified, and specialized for your specific needs. You can train a model on your own documents. You can adjust its behavior in ways that cloud APIs do not permit.
    44|
    45|The tradeoffs are performance and capability. Local models are slower than cloud models. They are less capable, especially at complex reasoning tasks. A 7 billion parameter model running on a laptop cannot match GPT 5.4 or Claude Opus. But the gap has narrowed significantly, and for many everyday tasks, local models are good enough.
    46|
    47|---
    48|
    49|## The Hardware You Need
    50|
    51|Running local AI requires a capable computer. The most important component is the GPU (graphics processing unit), because AI inference runs much faster on GPUs than on CPUs.
    52|
    53|**Minimum setup:** 8GB of RAM and a modern CPU. You can run small models (1 to 3 billion parameters) on CPU alone. They will be slow, taking 10 to 30 seconds per response, but they work. This is enough for basic text generation and summarization. Models like Phi 4 (14B) in 4 bit quantization can run on CPU with acceptable speed for occasional use.
    54|
    55|**Good setup:** 16GB of RAM and a GPU with 8GB of VRAM, such as an RTX 3060 or RTX 4060. This handles 7 to 8 billion parameter models comfortably. Response times are 2 to 5 seconds. Most mid range gaming laptops and desktop GPUs from the last few years meet this requirement. This is the sweet spot for most users: you can run Llama 4 8B, Qwen 3.5 7B, or DeepSeek R1 7B with good performance.
    56|
    57|**Great setup:** 32GB of RAM and a GPU with 16 to 24GB of VRAM, such as an RTX 4090, RTX 5090, or a used RTX 3090. This handles 13 to 30 billion parameter models. Response times are under 2 seconds. Models like DeepSeek R1 14B, Qwen 3.5 32B, and Mistral Small 4 24B run well here.
    58|
    59|**Overkill:** 64GB+ RAM and 48GB+ VRAM, such as dual RTX 5090s or professional GPUs like the NVIDIA A series. This handles 70+ billion parameter models, including the largest open weight models like Llama 4 405B or DeepSeek V4 671B (mixture of experts, so only part of the model activates at a time). Response times are comparable to cloud services for many tasks.
    60|
    61|The good news is that model quantization has improved dramatically. Quantization compresses models to use less memory with minimal quality loss. A 70 billion parameter model that used to require 140GB of VRAM with full precision can now run on 24GB with 4 bit quantization while retaining most of its capability.
    62|
    63|### What You Can Expect at Each Level
    64|
    65|At the minimum level, you get a capable assistant for simple tasks. It can summarize short documents, draft emails, answer questions about general knowledge, and help with basic coding. The responses are slower but usable.
    66|
    67|At the good level, you get a solid daily driver. It handles most tasks well: document analysis, longer writing, moderate reasoning, and code generation. The speed is good enough for interactive use without frustration.
    68|
    69|At the great level, you approach cloud model quality for many tasks. Complex reasoning, multi step instructions, and long context windows work well. The difference between this and GPT 5.4 or Claude Opus is noticeable on hard tasks but acceptable for everyday use.
    70|
    71|### CPU Only: Is It Worth Trying?
    72|
    73|If you do not have a GPU, you can still run local models on CPU. The experience depends on the model size and your patience. Small models (1 to 3B parameters) run at reasonable speed. Medium models (7 to 8B) run at 3 to 10 tokens per second on a modern CPU, which means 10 to 30 seconds per response. This is usable for batch processing or tasks where speed does not matter, but it is too slow for interactive conversation.
    74|
    75|The CPU path is worth trying to understand the ecosystem before investing in a GPU. Install Ollama, download a small model, and see what local AI feels like.
    76|
    77|---
    78|
    79|## Ollama: The Easiest Way to Run Local Models
    80|
    81|Ollama is the simplest tool for running local LLMs. It handles model downloading, management, and inference through a single command line interface. It also serves an OpenAI compatible API, which means any application that works with OpenAI's API can work with your local models.
    82|
    83|### Installation
    84|
    85|Ollama runs on macOS, Linux, and Windows. Download the installer from ollama.com and run it. The installation takes about two minutes. After installation, Ollama runs as a background service.
    86|
    87|### Running a Model
    88|
    89|Open a terminal and run:
    90|
    91|```
    92|ollama run llama4
    93|```
    94|
    95|Ollama downloads the model (a few gigabytes) and starts an interactive chat session. Type your questions and get responses from the local model. Type /exit to leave.
    96|
    97|The first download takes time depending on your internet speed. Subsequent runs use the cached model and start instantly.
    98|
    99|### Available Models

100|
101|Ollama hosts hundreds of models. Here are the ones worth knowing about in 2026.
102|
103|**Llama 4 (Meta).** Meta's latest open model family ranges from 8 billion to 405 billion parameters. The 8B model runs on modest hardware and handles general conversation, summarization, and simple tasks well. The 70B and 405B models require powerful hardware but approach cloud model quality.
104|
105|**DeepSeek V4 and R1.** DeepSeek's models have been a sensation in the open source community. V4 is their general purpose model, comparable to GPT 4 class models. R1 is their reasoning model that shows its chain of thought before answering. Both are available in sizes from 7B to 671B (mixture of experts). The smaller distilled versions (7B and 14B) run on consumer hardware and punch above their weight class.
106|
107|**Qwen 3.5 and 3.6 (Alibaba).** Qwen models have consistently improved. The 3.5 series offers strong performance across coding, reasoning, and general tasks. Qwen 3.6, released in mid 2026, adds improved instruction following and longer context handling. The 7B and 14B versions are popular choices for local deployment.
108|
109|**Gemma 4 (Google).** Google's open model family is designed for efficient inference. Gemma 4 26B performs well for its size and runs on a single 24GB GPU. The smaller Gemma 4 9B runs on 8GB hardware.
110|
111|**Mistral Small 4 and Mixtral.** Mistral's models are known for efficiency. Mistral Small 4 (24B) punches above its weight. The Mixtral 8x22B mixture of experts model offers strong performance with efficient resource usage.
112|
113|**Phi 4 (Microsoft).** Microsoft's Phi series focuses on small, capable models. Phi 4 runs on modest hardware and handles coding and reasoning tasks surprisingly well for its size.
114|
115|### Practical Example
116|
117|Install Ollama, download Llama 4 8B, and start using it as a local assistant. Ask it to summarize documents (paste the text directly), draft emails, explain concepts, or brainstorm ideas. The quality is not as good as GPT 5.4, but it is fast, private, and free.
118|
119|For better quality, try DeepSeek R1 14B. The chain of thought reasoning makes it more thorough for complex questions, and it runs well on 12GB of VRAM.
120|
121|---
122|
123|## LM Studio: A Graphical Interface for Local Models
124|
125|If the command line is not your preference, LM Studio provides a graphical interface for running local models. It includes a model browser, download manager, and chat interface in a single desktop application.
126|
127|LM Studio also serves an OpenAI compatible API endpoint, just like Ollama. You can start the local server and point any application at `http://localhost:1234/v1`. This is useful for connecting local models to other tools.
128|
129|The key advantage of LM Studio is LM Link, a feature that lets you access a model running on one computer from other devices on your network. You can run a large model on your powerful desktop and access it from your laptop. This uses Tailscale for secure tunneling and works across networks.
130|
131|---
132|
133|## DeepSeek: The Open Weight Powerhouse
134|
135|DeepSeek deserves special attention because it changed the open source AI landscape. In early 2025, DeepSeek released R1, a reasoning model that matched OpenAI's best models at a fraction of the training cost. The company followed with V3 and V4, each improving on the last.
136|
137|DeepSeek models are open weight, meaning you can download the actual trained parameters and run them on your own hardware. This is different from open source models that release only the architecture and training code. Open weight models let you inspect, fine tune, and deploy the exact model that achieved specific benchmark results.
138|
139|DeepSeek V4 is available through various providers. You can access it through chat.deepseek.com for free with rate limits, through API providers for pay per use pricing, or download it for local deployment.
140|
141|The pricing advantage is substantial. DeepSeek's API costs roughly 10 to 20 times less than OpenAI's API for comparable quality. This makes it attractive for developers building applications that make many API calls, and for users who want to experiment with advanced models without committing to a $200 per month subscription.
142|
143|---
144|
145|## OpenCode: Terminal Based Coding Agent
146|
147|OpenCode is an open source, provider agnostic coding agent that runs in your terminal. It is similar to Claude Code but works with any model provider, including local models.
148|
149|### Installation
150|
151|OpenCode installs with a single command. On macOS: `brew install opencode`. On Linux and Windows, the website provides installers. The setup takes under a minute.
152|
153|### Configuration
154|
155|OpenCode works out of the box with cloud providers by default. To use it with a local model, create an `opencode.jsonc` configuration file that points to your local endpoint.
156|
157|`json
   158|{
   159|  "provider": {
   160|    "local": {
   161|      "name": "Local Model",
   162|      "npm": "@ai-sdk/openai-compatible",
   163|      "options": {
   164|        "baseURL": "http://localhost:11434/v1"
   165|      },
   166|      "models": {
   167|        "deepseek-r1-14b": {
   168|          "name": "DeepSeek R1 14B",
   169|          "modalities": { "input": ["text"], "output": ["text"] }
   170|        }
   171|      }
   172|    }
   173|  }
   174|}
   175|`
176|
177|This configuration tells OpenCode to use a model running on Ollama's local endpoint.
178|
179|### Daily Use
180|
181|OpenCode operates in two modes. Interactive mode (`opencode`) opens a terminal UI where you describe your task and OpenCode works through it step by step. One shot mode (`opencode run "Add error handling to the API calls in src/client.py"`) executes a single task and exits.
182|
183|For developers, OpenCode replaces or supplements GitHub Copilot and Claude Code. It understands your project structure, reads and writes files, runs terminal commands, and manages git operations. The key advantage is provider flexibility: you can use a local model for simple tasks and switch to a cloud model for complex ones, all within the same tool.
184|
185|For non developers, OpenCode is less directly useful. But it powers other applications that may benefit you indirectly, such as automated document processing pipelines and data transformation tools.
186|
187|---
188|
189|## Hermes Agent: The AI Orchestrator
190|
191|Hermes Agent, created by Nous Research, is an open source AI agent framework that runs in your terminal. Think of it as an AI assistant that can use tools, remember context across sessions, and coordinate with other AI tools.
192|
193|### What Makes Hermes Different
194|
195|Hermes is provider agnostic. It works with any LLM provider: OpenAI, Anthropic, OpenRouter, or local models via Ollama. You configure the provider once, and Hermes handles the rest.
196|
197|The persistent memory system is a standout feature. Hermes remembers facts across sessions. Tell it your preferences once, and they apply to all future conversations. This is similar to ChatGPT's memory feature but runs entirely on your machine with no data sent to a cloud service.
198|
199|The skill system lets you save reusable procedures. If you have a workflow you repeat often, you can save it as a skill, and Hermes runs it automatically when the relevant context appears. Skills are just markdown files that describe the workflow, making them easy to create and modify.
200|
201|### Installation
202|
203|`bash
   204|curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
   205|hermes setup
   206|`
207|
208|The setup walks you through configuration: choosing a provider, setting up tools, and configuring your preferred model.
209|
210|### Daily Use
211|
212|Use Hermes in three ways.
213|
214|**Interactive chat.** Run `hermes` to start an interactive session. You can ask questions, request tasks, and have multi turn conversations, just like ChatGPT or Claude, but with the ability to run commands, access files, and use tools.
215|
216|**One shot queries.** `hermes chat -q "Summarize the changes in the last three git commits"` runs a single query and returns the result. This is useful for scripting and automation.
217|
218|**Scheduled tasks.** Hermes can run tasks on a schedule using cron. Set up a daily briefing that summarizes your calendar, email, and task list every morning. The output can be delivered to Slack, Telegram, email, or saved to a file.
219|
220|### Daily Productivity Examples for Non Developers
221|
222|For readers who are not developers, Hermes might sound like a developer tool. It is, but its uses extend beyond coding. Here are concrete examples that anyone can use.
223|
224|**Research automation.** Save a research workflow as a Hermes skill. When you need to research a topic, run the skill, and Hermes searches the web, extracts key information, and compiles a summary. You do not need to manually search, copy, and paste. The skill remembers your preferred format: bullet points, paragraph summaries, or structured reports.
225|
226|**File organization.** Ask Hermes to organize your Downloads folder by file type, date, or project. "Find all PDFs modified in the last week and move them to a Research folder. Delete any .tmp files older than 30 days. Create subfolders by category based on file names." Hermes executes the task using its terminal access, moving and organizing files according to your instructions.
227|
228|**Meeting notes.** Record meeting notes as a Hermes skill. When you finish a meeting, run the skill and Hermes prompts you for key decisions, action items, and follow ups. It formats the output consistently and saves it to your notes folder with a timestamp and meeting title. Over time, you build a searchable archive of formatted meeting notes.
229|
230|**Content repurposing skill.** Save a skill that takes a piece of content and produces versions for different platforms. Input: a blog post. Output: LinkedIn summary, Twitter thread, newsletter excerpt, and internal memo. Run it once, get all four formats. The skill defines the tone and length for each platform so you do not need to repeat instructions.
231|
232|**Weekly review.** Set up a scheduled Hermes task that runs every Friday at 4 PM. It reviews your week's activity, summarizes what you accomplished, and drafts a status report. You review and send. The cron based scheduling means the task runs automatically without you remembering to start it.
233|
234|**The key insight is that Hermes remembers.** Unlike ChatGPT or Claude, which start fresh each conversation, Hermes saves skills and memories. Every hour you invest in setting up skills pays back in future sessions as tasks that used to take ten minutes now take one.
235|
236|---
237|
238|## Privacy First: The Local AI Stack
239|
240|The most interesting development in 2026 is the local AI stack: a fully private, offline setup that replaces cloud dependent tools. The standard combination is:
241|
242|**LM Studio** or **Ollama** to run models locally.
243|**OpenCode** for coding tasks, pointing at the local model.
244|**Hermes Agent** for general purpose tasks and orchestration, also pointing at the local model.
245|
246|All three tools can use the same local model through Ollama's API. You install Ollama once, download a few models, and both OpenCode and Hermes connect to it automatically.
247|
248|The result is a fully private AI setup. Your data never leaves your machine. No subscriptions. No rate limits. No privacy concerns. The tradeoff is capability: local models are not as smart as the cloud frontier models. But for many everyday tasks, they are good enough.
249|
250|The author of a popular blog post about this setup summarized it well: "Hermes has an OpenCode skill, which means it can fire up OpenCode and interact with it." The orchestrator delegates complex tasks to the specialized tool, and the whole system works together.
251|
252|---
253|
254|## Open Source Image Generation
255|
256|Local AI is not limited to text. Image generation models also run on your own hardware.
257|
258|**Stable Diffusion 4** runs locally via AUTOMATIC1111's WebUI, ComfyUI, or InvokeAI. You download the model once and generate unlimited images with no per image costs. The quality is competitive with cloud services for many use cases.
259|
260|**Flux** is available in open weights through Black Forest Labs. The smaller Flux Dev model runs on 12GB VRAM and produces high quality images. Flux Schnell is a faster variant for rapid prototyping.
261|
262|Running image generation locally requires a GPU with sufficient VRAM. 8GB handles Stable Diffusion and Flux Schnell. 16GB handles Flux Dev and higher resolution outputs.
263|
264|---
265|
266|## The Bottom Line
267|
268|The open source AI ecosystem in 2026 is mature enough for daily use. You can run a capable language model, a coding assistant, an agent framework, and an image generator all on a single consumer grade computer, all for free after the hardware purchase.
269|
270|For anyone who values privacy or needs offline access. Anyone who wants unlimited usage without subscription fees. Anyone who enjoys tinkering with technology and wants full control over their AI tools.
271|
272|The privacy argument is the strongest for most users. Consider this: every prompt you type into ChatGPT becomes part of OpenAI's training data unless you opt out. Every document you upload to Claude is processed on Anthropic's servers. For personal use, you might be comfortable with this. For work related tasks, your employer's policies may prohibit sending data to third party AI services. Local models remove this concern entirely.
273|
274|**Who should stick with cloud services?** Anyone who wants the best possible quality with zero setup effort. Cloud models are still smarter, faster, and more reliable than local alternatives. For mission critical work where quality matters most, the cloud is the better choice. If you are a writer producing polished content, a researcher synthesizing complex information, or a developer solving hard problems, the $20 per month for ChatGPT Plus or Claude Pro is money well spent.
275|
276|**Who should try local?** Anyone who is curious, values privacy, works offline sometimes, or wants to avoid ongoing subscription costs. The setup takes an afternoon. The hardware costs money upfront but pays for itself over time. And the learning process itself is valuable: running a local model gives you a deeper understanding of how AI actually works, which is the whole point of this series.
277|
278|The best approach is hybrid. Use cloud services for the hard stuff: complex reasoning, long form writing, creative brainstorming. Use local models for everyday tasks: simple questions, document summaries, quick drafts, and anything involving sensitive data. Both have their place, and the tools now make it easy to switch between them.
279|
280|### Quick Decision Guide
281|
282|| Goal | Recommendation |
283|| -------------------------------------- | ------------------------------------------------------ |
284|| Best quality, no setup | ChatGPT Plus ($20/mo) or Claude Pro ($20/mo) |
285|| Best quality, remote desktop control | Claude Max ($200/mo) for Dispatch and Cowork |
286|| Privacy, offline, zero recurring cost | Ollama + local models, free after hardware |
287|| Best balance of privacy and capability | Hybrid: cloud for hard tasks, local for sensitive work |
288|| Developer coding assistant | OpenCode or Claude Code with your choice of model |
289|| Full AI automation on your machine | Hermes Agent with skills and scheduled tasks |
290|
291|### The Takeaway
292|
293|You do not need to choose one approach exclusively. The best AI setup in 2026 uses multiple tools for different tasks. Free Google services for everyday queries. A $20 subscription for hard problems. Local models for sensitive work. Specialized tools for creative projects. The ecosystem is broad enough that there is a right tool for every task and a price point for every budget.
294|
295|---
296|
297|## Where to Go From Here
298|
299|This series covered the full spectrum of AI tools available in 2026. You started with the fundamentals in Part 1: how prediction engines, vectors, and transformers work. You moved to free tools in Part 2: Gemini, NotebookLM, and the Google AI ecosystem. Part 3 covered the paid powerhouses: ChatGPT and Claude with their desktop apps, Dispatch, and advanced features. Part 4 toured the creative side: image, video, music, and audio generation. This final part opened the door to the open source world: local models, agent frameworks, and complete privacy.
300|
301|The point of this series is not to sell you on any particular tool or approach. It is to give you a map of the landscape so you can choose what fits your needs. The best AI tool is the one you actually use. Start with the free tier. Add a paid subscription when you hit limits. Explore local models if privacy matters to you. Switch between tools depending on the task.
302|
303|AI is not magic and it is not sentient, as we covered in Part 1. It is a tool, like a search engine or a spreadsheet, but more versatile than either. The more you understand what it is and what it is not, the better you will use it.
304|
305|[Return to Part 1: What AI Is and Isnt](2026-06-01-ai-for-all-levels-1-what-ai-is-and-isnt)
306|
307|[Return to Part 2: Getting Started for Free](2026-06-01-ai-for-all-levels-2-getting-started-for-free)
308|
309|[Return to Part 3: ChatGPT and Claude Deep Dive](2026-06-01-ai-for-all-levels-3-chatgpt-and-claude-deep-dive)
310|
311|[Return to Part 4: Specialized AI Tools for Creation](2026-06-01-ai-for-all-levels-4-specialized-ai-tools)
312|
