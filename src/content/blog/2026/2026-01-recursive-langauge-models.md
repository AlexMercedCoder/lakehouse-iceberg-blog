---
title: "Recursive Language Models (RLMs): How They Work"
pubDatetime: 2026-01-10T09:00:00Z
modDatetime: 2026-10-15T12:00:00Z
date: "2026-01-10"
description: "Recursive Language Models keep a long prompt in a Python REPL and let the model call itself on pieces of it, handling inputs 100x beyond its context window."
author: "Alex Merced"
category: "AI"
bannerImage: "https://i.imgur.com/cpoMZQ8.png"
tags:
  - artificial intelligence
  - language models
  - machine learning
  - recursion
slug: 2026-01-recursive-langauge-models
draft: false
image: "/images/blog.png"
faqs:
  - question: "What are Recursive Language Models (RLMs)?"
    answer: "Recursive Language Models are an inference strategy from Alex L. Zhang, Tim Kraska, and Omar Khattab. The long prompt is stored as a variable in a Python REPL, and the model writes code to inspect it and calls language models on smaller pieces, then combines the results."
  - question: "How do RLMs handle inputs longer than the context window?"
    answer: "The model never reads the full input at once. It sees only metadata such as the input's size, uses code to peek, filter, and split the data, and sends focused questions about each chunk to sub-calls. The paper reports inputs up to two orders of magnitude beyond the model's context window."
  - question: "How are RLMs different from reasoning models?"
    answer: "Reasoning models think longer about a prompt that must fit inside their context window. RLMs move the prompt into an external environment and work through it with code and sub-calls, so they can handle inputs the model could never see in one pass."
  - question: "Do RLMs perform better than standard LLMs?"
    answer: "In the paper, RLMs built on GPT-5 posted median gains of 26% over context compaction, 130% over CodeAct with sub-calls, and 13% over Claude Code at comparable cost. On the OOLONG benchmark, an RLM using GPT-5-mini beat plain GPT-5 by more than 34 points."
  - question: "Is there code for Recursive Language Models?"
    answer: "Yes. The authors publish a reference implementation at github.com/alexzhang13/rlm, and they also post-trained RLM-Qwen3-8B, which beat the base Qwen3-8B by 28.3% on average."
---

**Get Data Lakehouse Books:**

- [Apache Iceberg: The Definitive Guide](https://drmevn.fyi/tableformatblog)
- [Apache Polaris: The Defintive Guide](https://drmevn.fyi/tableformatblog-62P6t)
- [Architecting an Apache Iceberg Lakehouse](https://hubs.la/Q03GfY4f0)
- [The Apache Iceberg Digest: Vol. 1](https://www.puppygraph.com/ebooks/apache-iceberg-digest-vol-1)

**Lakehouse Community:**

- [Join the Data Lakehouse Community](https://datalakehousehub.com/)
- [Data Lakehouse Blog Roll](https://lakehouseblogs.com)
- [OSS Community Listings](https://osscommunity.com)
- [Dremio Lakehouse Developer Hub](https://developer.dremio.com)

---

Recursive Language Models (RLMs) are language models that call themselves.

More precisely, an RLM is an inference strategy, not a new network architecture. Instead of pasting a huge prompt straight into a model's context window, an RLM stores that prompt as a variable inside a programming environment. The model writes code to look at the data, split it up, and hand pieces of it to fresh calls of a language model. It then combines what those calls return into a final answer.

The idea comes from the paper [Recursive Language Models](https://arxiv.org/abs/2512.24601) by Alex L. Zhang, Tim Kraska, and Omar Khattab, first posted to arXiv on December 31, 2025 and revised in May 2026. Alex Zhang's [blog post on RLMs](https://alexzhang13.github.io/blog/2025/rlm/) walks through the same ideas with examples, and the reference implementation is open source on [GitHub](https://github.com/alexzhang13/rlm).

Reviewed October 15, 2026 against the arXiv paper (v3), the authors' blog post, and the project repository. An earlier version of this article described RLMs as models that emit inline `CALL()` statements while generating text. That was wrong, and the explanation below follows the paper.

## What Problem Do RLMs Solve?

The problem is long context.

Every language model has a context window: the maximum number of tokens it can read at once. Even inside that window, quality degrades as the input grows. Models miss details buried in the middle, lose count when asked to aggregate across thousands of records, and get worse at tasks that require connecting facts spread across a long document. This decline is often called context rot.

The usual workarounds each give something up:

- **Bigger context windows** raise the ceiling, but quality still drops as you approach it, and cost grows with every token you send.
- **Retrieval (RAG)** fetches only the chunks that look relevant, which fails when the answer depends on reading everything, such as counting or classifying every entry in a log.
- **Summarization or compaction** shrinks the input, but it throws away details that later turn out to matter.

RLMs take a different route. The model never reads the whole input in one pass. It treats the input as data it can inspect and process with code, and it delegates focused questions about small pieces of that data to sub-calls that each see a manageable amount of text.

## How Do RLMs Actually Work?

From the outside, an RLM looks like an ordinary model call. In the authors' framing, you can swap a call such as `gpt5.completion(messages)` for `rlm.completion(messages)`. What changes is what happens inside.

1. **The context becomes a variable.** The full prompt is loaded into a Python REPL, similar to a Jupyter notebook. The root model receives the user's question plus a note that the context exists in a variable. At first it sees only basic facts such as the context's size, not the text itself.
2. **The root model writes code.** It can peek at the first few thousand characters, search with regular expressions, split the data into chunks, or compute statistics. It reads back a truncated view of each cell's output, so its own context stays small.
3. **The code can call a language model.** Inside the REPL, the root model can invoke a language model like a function, passing it a chunk of the context and a focused question. A typical pattern is to map a question over every chunk, collect the answers in a list, and then aggregate them.
4. **The answer comes back from the environment.** When it is done, the root model returns either a direct answer or the contents of a REPL variable, which lets it produce outputs longer than a single model response.

The recursion is the model calling a language model, possibly itself, on a slice of its own input. In the published experiments the recursion depth is one: the root model calls ordinary language models, not other RLMs. The authors describe deeper recursion as a straightforward extension.

The strategies the models chose on their own are familiar to any data engineer: peek at the data, filter it with regex, partition it, map a sub-query over each partition, and reduce the results. In effect, the model turns a reading problem into a small data processing job.

## How Are RLMs Different From Reasoning Models and Agents?

Reasoning models think longer before they answer, but they still read the entire prompt inside one context window. If the input is ten times larger than that window, extra reasoning does not help, because the model never sees most of the data.

RLMs change where the data lives. The input sits outside the model in an environment the model controls with code, so the model can work with inputs far larger than its own window.

RLMs also differ from typical coding agents. An agent such as Claude Code or a CodeAct style loop can call tools, but the long input usually still flows into the agent's own context. In an RLM, the input stays in the REPL, and sub-calls return only the condensed results the root model needs.

A useful way to hold the distinction:

- **Reasoning models** spend more tokens thinking about a prompt they can fully see.
- **RLMs** use code and sub-calls to work through a prompt they never fully see.

Because every step is code in a REPL, an RLM run is also easy to inspect. You can read exactly how the model split the data, which questions it sent to sub-calls, and how it combined the answers.

## What the Results Show

The arXiv paper reports that RLMs process inputs up to two orders of magnitude beyond the underlying model's context window. Even on shorter prompts, RLMs outperformed vanilla frontier models and common long-context scaffolds. With GPT-5 as the base model, the median gains across the paper's benchmarks were 26% over context compaction, 130% over CodeAct with sub-calls, and 13% over Claude Code, at comparable cost.

The authors' blog post adds concrete examples:

- **OOLONG**, a long-context aggregation benchmark: at about 132K tokens, an RLM built on GPT-5-mini beat plain GPT-5 by more than 34 points, roughly a 114% improvement, at about the same total cost per query. At about 263K tokens, the RLM still led by more than 15 points and was cheaper per query.
- **BrowseComp-Plus**, a research benchmark over a document corpus: with up to 1,000 documents in context, the RLM built on GPT-5 was the only method tested that kept a perfect score on the sampled queries.

The team also post-trained a small model for this pattern. RLM-Qwen3-8B outperformed the base Qwen3-8B by 28.3% on average and approached plain GPT-5 on three long-context tasks.

There are real limits. Sub-calls run one after another and are not optimized for speed, and the authors do not guarantee control over total cost or runtime. A few queries in their experiments were far more expensive than the median.

## Why This Matters Now

Data teams are pointing language models at inputs that do not fit in any context window: entire codebases, months of logs, thousands of documents, or full tables of records. The common answers, retrieval and summarization, both drop information before the model gets to reason about it.

RLMs suggest a cleaner pattern. Keep the data in an environment, give the model code and the ability to call models, and let it decide how to slice the work. That should feel familiar to anyone who has built a lakehouse: you do not pull a petabyte table into memory to answer a question. You push down filters, partition the work, and aggregate the results. RLMs apply the same discipline to language model inference.

This matters for a few reasons:

- **Scale beyond the window**: The useful input size is set by the environment and your budget, not by the model's context limit.
- **Better accuracy on dense tasks**: Questions that require reading every record, such as counts and classifications, benefit most, because nothing is skipped by a retriever.
- **Transparency**: The REPL history is a readable trace of how the answer was produced.

## Conclusion: A New Way to Run Language Models

Recursive Language Models do not change the weights of a model. They change how you run it. The prompt becomes data in a REPL, the model writes code to explore that data, and it calls language models on small pieces to build up an answer.

That simple shift lets a model handle inputs far beyond its context window, and in the paper's experiments it improved accuracy on long-context tasks at comparable cost. The approach is still young, with open questions about speed, cost control, and deeper recursion. But the core idea is easy to apply: treat long context as something to compute over, not something to cram into a prompt.

## Frequently Asked Questions

### What are Recursive Language Models (RLMs)?

Recursive Language Models are an inference strategy from Alex L. Zhang, Tim Kraska, and Omar Khattab. The long prompt is stored as a variable in a Python REPL, and the model writes code to inspect it and calls language models on smaller pieces, then combines the results.

### How do RLMs handle inputs longer than the context window?

The model never reads the full input at once. It sees only metadata such as the input's size, uses code to peek, filter, and split the data, and sends focused questions about each chunk to sub-calls. The paper reports inputs up to two orders of magnitude beyond the model's context window.

### How are RLMs different from reasoning models?

Reasoning models think longer about a prompt that must fit inside their context window. RLMs move the prompt into an external environment and work through it with code and sub-calls, so they can handle inputs the model could never see in one pass.

### Do RLMs perform better than standard LLMs?

In the paper, RLMs built on GPT-5 posted median gains of 26% over context compaction, 130% over CodeAct with sub-calls, and 13% over Claude Code at comparable cost. On the OOLONG benchmark, an RLM using GPT-5-mini beat plain GPT-5 by more than 34 points.

### Is there code for Recursive Language Models?

Yes. The authors publish a reference implementation at github.com/alexzhang13/rlm, and they also post-trained RLM-Qwen3-8B, which beat the base Qwen3-8B by 28.3% on average.
