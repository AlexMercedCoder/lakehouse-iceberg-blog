---
title: "AI-Assisted Contributions in Apache Data Projects: How Polaris and Arrow Are Setting the Rules"
description: "Apache Polaris and Apache Arrow are writing rules for AI-assisted pull requests. Here is what they, CPython, and the ASF now ask of contributors."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "AI & Agents"
tags:
  - Apache Polaris
  - Apache Arrow
  - open source
  - AI coding agents
  - contribution policy
slug: "ai-assisted-contributions-apache-data-projects"
draft: false
canonicalURL: https://datalakehousehub.com/blog/ai-assisted-contributions-apache-data-projects/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/ai-assisted-contributions-apache-data-projects/).

Apache data projects are writing rules for AI-assisted pull requests. On October 30, 2026, an Apache Polaris thread asked contributors who use AI to review its output first and keep pull requests small, and the Arrow list discussed CPython's AI usage guidelines the same week. This piece compares the rules forming and what they ask of contributors.

Picture a committer on a catalog project opening GitHub on a Monday. A dozen new pull requests (PRs) arrived over the weekend. Two add an interface nobody asked for. One has a 900-line diff, and when the reviewer asks why a test was deleted, the reply arrives in thirty seconds with confident paragraphs that do not answer the question.

None of that code is necessarily wrong. The problem is that the committer now has to find out, line by line, with no help from the person who submitted it. Several Apache data projects described this situation on their mailing lists in late October 2026, and their responses are converging on a small set of rules.

This article walks through what Apache Polaris asked for, what Apache Arrow is debating, the CPython process Arrow is looking at, and the Apache Software Foundation (ASF) legal guidance above all of them. It ends with a checklist and a PR template section you can adapt. For advice on using AI coding tools as an individual developer, see [A Practical Guide to AI-Assisted Coding Tools](https://datalakehousehub.com/blog/2026-01-a-practical-guide-to-ai-assisted-coding-tools/). This piece covers the other side of the PR: what the projects expect from you once you have used one.

## Why Review Load Is the Bottleneck

Open source projects have always had more people willing to write code than people able to review it. Merging a patch safely takes someone who knows the surrounding design and the compatibility promises. In an Apache project, that someone is usually a committer, and committers are a small group.

AI coding assistants changed one side of that ratio. Producing a plausible 500-line change now takes minutes. Reviewing it still takes an hour or more. Human mistakes tend to cluster in predictable places. Generated code spreads small mistakes across the diff, wrapped in clean formatting, so the reviewer cannot skim.

Nic Crane put numbers and categories to this on the Arrow dev list on October 27, 2026. Crane looked at reviewer capacity metrics, PR discussions, and past mailing list threads (with AI help, as the post openly said), then summarized the main problems:

- Maintainer time spent reviewing PRs that are later abandoned, or that are mostly AI-generated and need more rounds of feedback before they merge.
- Maintainer time spent enforcing AI rules, while non-committer reviewers have little ability to flag a PR as a problem.
- The raw volume of AI-generated PRs, with roughly a third of recent PRs skipping the AI disclosure that Arrow's contributor guide asks for.

That last point matters. Arrow already had written guidance, and people skipped it. A rule with no enforcement path behaves like a suggestion, and maintainers end up enforcing it by hand, one awkward comment at a time.

Polaris described the same pressure. Yufei Gu opened the October 30 thread by noting that review load was high enough that some PRs were waiting longer. Yong Zheng replied that the project's informal review window was not always being honored.

Inflow went up. Review capacity did not. The new rules either cut low-value inflow or move review work back to the author before a committer sees the PR. The best of them also grow the reviewer pool.

## What the Polaris Thread Asks For

Apache Polaris is the Apache-governed implementation of the Iceberg REST catalog. Its 2025 progress is part of the [2025 Year in Review: Iceberg, Polaris, Parquet, and Arrow](https://datalakehousehub.com/blog/2025-12-2025-year-in-review-iceberg-arrow-polaris-parquet/), and it graduated to a Top-Level Project on February 18, 2026. Graduation brought attention, and attention brought PRs.

Yufei Gu's October 30, 2026 post, "Improving PR quality and sharing the review load," made two asks of authors who use AI.

**The author is the first reviewer.** Gu wrote that authors using AI should be the first reviewers of the code and docs it generates: read and understand what you submit, and challenge the tool's decisions. The post offered two questions. Do we really need this extra doc or new interface? Can the problem be solved within the existing design? Gu also suggested a few rounds of AI review combined with your own judgment, since several passes with human insight beat one.

**Keep PRs small and well scoped.** Small PRs get reviewed more thoroughly and turn around faster. Even when AI makes a large change easy to produce, splitting it into focused PRs helps everyone. The post also invited more people to review, including partial reviews of just the parts you know.

### The replies sharpened it

Dmitri Bourlatchkov agreed that contributors using large language models (LLMs) should review their PRs end to end "as if it were written by another person" before submitting. That phrasing is the useful part. It asks you to drop your natural trust in your own work and read the diff as a skeptic. He suggested adjusting the wording in Polaris's `AGENTS.md` and contribution guidelines to emphasize it.

Jean-Baptiste Onofré pushed back on writing new rules, because Polaris already has them. `CONTRIBUTING.md` contains a "Guidelines for AI-assisted Contributions" section, and `AGENTS.md` goes further for coding agents. He argued for pointing contributors to those files instead of adding stricter rules that read as pedantic. He added that AI review tools are a good first pass but do not replace committer review, and that contributors should address or answer bot comments before asking for a human. A large draft PR is fine to illustrate a concept, as long as it gets split afterward.

Youngrae Kim shared two contributor habits. The first was writing the reproduction test first and quoting the failing behavior in the PR description, so reviewers checked the claim in a minute. The second was reviewing PRs in areas Kim had just touched, which surfaced missing spec fields and outdated docs. Yong Zheng mentioned that the project's `orca-review-bot` seemed to help.

On November 9, Gu followed up to say that more new contributors and committers were now reviewing, and called that probably the way to scale the community while keeping quality high.

### What Polaris already has in writing

The `CONTRIBUTING.md` section is short. The person submitting the PR is the author and is fully responsible for it, no matter how the change was produced. The author must understand the implementation end to end and be able to justify the design and code in review. AI systems are not contributors. Disclosure of significant AI assistance is encouraged, and contributors must make sure generated code can be contributed under the ASF Generative Tooling Guidance.

`AGENTS.md` is the more unusual document. It is written primarily for coding agents and splits its rules into mechanically checkable "hard gates" and behavioral "discipline" rules. The hard gates include running `./gradlew format compileAll` and `./gradlew :<module>:check` for each touched module, plus adding the ASF license header to new files. The discipline rules include reading the relevant code before editing, stating assumptions in the PR description, and checking `git diff --stat` so only expected files change.

Polaris's position is clear. The rules exist, and the ask is to actually follow them. Bourlatchkov's wording suggestion was still open when the thread went quiet.

## Arrow's Version: From Written Guidance to Enforcement

Apache Arrow is further along, and its problem is different. Arrow wrote its AI guidance early. The question on its list now is what happens when people ignore it.

The "AI-generated code" section of Arrow's developer overview says PRs that appear fully AI-generated, with little or no engagement from the author, can be closed without further review. The rationale is blunt and correct. When a PR shows little author engagement, a reviewer with AI tools is faster generating the code directly, and the author is not learning from the review anyway.

Its recommendations: submit only changes you can debug and own, after reviewing all generated code. Match the codebase's conventions. Be upfront about AI usage and summarize what was generated. Comment on your own PR to explain how you verified any part you do not fully understand. Watch for verbose comments, unnecessary tests, and incorrect fixes. Break large PRs up. And AI agents should never tag or ping maintainers.

### The thread behind it

The October messages sit at the end of a "[DISCUSS] AI-generated contributions" thread that began in January 2026. Early on, Gang Wu proposed points that closely match the guide today. R. Tyler Croy, a delta-rs maintainer, suggested an `ai-assisted` label and asked the project not to rely on everybody following the rules, but to agree on a way to handle those who do not. Andrew Lamb pointed to Apache DataFusion's contributor guide, which explains why fully AI-generated PRs without understanding are not helpful.

In September 2026, Pedro Matias revived the thread. Arrow had guidelines for contributors but none for reviewers, especially non-committers who cannot close a PR. Matias proposed a reviewer section on handling violations, modeled partly on the LLVM project's AI tool policy, with a standard reply and an escalation step. Rok Mihevc suggested a neutral `needs-author-engagement` label based on the author's observable understanding and engagement rather than on AI use. On October 26, Raúl Cumplido opened apache/arrow#55260 to document that approach.

### Crane's seven recommendations

Crane's October 27 post proposed seven measures. They are proposals on a discussion thread, not adopted policy:

1. Move the project's PR cap into its `.asf.yaml` configuration.
2. Make AI use disclosure mandatory, as Crane said numpy, pandas, and matplotlib do, with a bot that converts PRs missing it to draft.
3. Adopt the rule from #55260 against AI-written review replies, and the neutral `needs-author-engagement` label.
4. Auto-draft PRs idle for 14 days with conflicts, failing continuous integration (CI), or requested changes.
5. Gate PR opening on triage state, as pandas does, so PRs target only issues a maintainer has confirmed.
6. Track two numbers monthly: new-contributor PRs with no human response, and reviewer messages on PRs that never merge.
7. Grow the merge group by giving active non-committer reviewers the collaborator role and a label-triggered autoclose, and treat that as a path to committer.

Crane called the seventh item the only measure that adds capacity instead of cutting inflow. That is the key point.

On October 28, Cumplido replied with a link to CPython's newly announced AI policy process. Crane answered that giving authors a chance and then closing the PR, with labels for both steps, makes the messaging easier to automate and reduces maintainer burden. That is where the thread stood as of this writing.

## The CPython Guidelines Arrow Is Weighing

CPython is not an Apache project, so its rules bind nobody in Arrow or Polaris. It matters because it closed the gap Matias and Crane described with a lightweight, repeatable enforcement step.

The base rules live in the Python Developer's Guide (devguide) page "Guidelines for using AI tools," updated in May 2026. The person submitting an issue or PR is responsible for its content, whether or not AI tools were used. Authors must review AI output in detail and be able to explain their changes in their own words. Disclosure of AI use is appreciated but not required.

The devguide adds quality principles that apply with or without AI, such as minimal, focused changes and tests that exercise the change. It also names one specific unacceptable use. Altering or bypassing existing tests, or removing desired functionality, to make a failing test pass is not a real fix. Anyone who has reviewed agent-generated PRs has seen this. The agent cannot make the test pass, so it changes the test.

### Two labels and a bot

On October 28, 2026, Mariatta posted on the Python discussion forum that CPython now had a process for enforcing the policy. Triagers and core team members can apply one of two labels to an issue or PR. When they do, a bot posts a comment that explains why and links to the guidelines.

- `AI-needs-explanation` keeps the PR open and asks the author to explain, in their own words, what the change does and how they checked that it is correct. If the reply resolves the concern, the label comes off and review continues.
- `AI-guidelines-not-met` closes the PR. The conversation is not locked, and the author can reply if they think the project misunderstood the work.

Triagers start with `AI-needs-explanation` and use the closing label only for clear cases, such as a low-effort submission whose author is unlikely to engage. They keep one label at a time and prefer labels over closing by hand, so authors get the same explanation every time and the project can measure usage later.

Two design choices stand out. The post states that using AI tools is not, on its own, a reason for either label, and that disclosing AI use will not get a contribution labeled. That protects the honest discloser. It also says a label is a request about one contribution, not a judgment about the person, which lowers the social cost for the reviewer applying it.

This is the piece Cumplido flagged for Arrow. The explanation label maps onto Mihevc's `needs-author-engagement` idea, and the closing label supplies the escalation step Matias asked for. Crane welcomed the approach in a reply. What Arrow adopts is still an open discussion.

## The ASF Generative Tooling Guidance as the Umbrella

Project rules about review effort sit on top of a legal layer every Apache project shares: the ASF Generative Tooling Guidance. For background on how the ASF's single-foundation model and shared legal policy differ from other foundations, see [ASF vs Linux Foundation vs CNCF](https://iceberglakehouse.com/posts/open-source-foundations-explained/). Contributors license their work to the foundation, so this guidance applies to Polaris, Arrow, Iceberg, and Parquet alike.

The guidance does not ban AI tools. Its FAQ says the ASF will not publish a list of approved tools, and developers can use whatever tools they wish as long as they follow the guidance. What it does is spell out what your Individual Contributor License Agreement (ICLA) already commits you to when a tool wrote part of the code.

### What the ICLA asks

You must disclose third-party copyrighted material in a contribution, and under section 5 of the ICLA you represent that the rest is your original creation. Both obligations hold when AI produced part of the work. Section 7 covers submitting work that is not your own, but it asks for complete details of the source, which are generally not knowable for AI output. The guidance concludes that section 7 is not a practical route.

AI-generated code can be contributed if two conditions hold. First, the tool's terms must not restrict use of the output in a way that conflicts with the Open Source Definition, and must grant you enough rights to license the output to the ASF. The guidance tells you to find the clause in the provider's terms covering ownership or use of output. Second, at least one of these must be true: the output is not copyrightable subject matter, it contains no third-party material, or any third-party material is used with permission under compatible terms.

The guidance admits that many tools give no information about similarity to training data, and that the copyrightability of AI output is unsettled and varies by jurisdiction.

### Provenance in the commit message

The most practical item is a recommendation to name the tooling as a token in the commit message, such as `Generated-by: <Name of Tool> <Version>` or `Co-authored-by: <Name of Tool> <Version>`. The stated purpose is to let future release tooling collect this into a machine-parsable Tooling-Provenance file.

Section 8 of the ICLA also applies. If you later learn that your representations were inaccurate, for example that a tool reproduced code under an incompatible license, you agree to notify the foundation at `legal-private@apache.org`.

In the Polaris thread, Gu agreed the project should align its approach with "the new ASF rules." Polaris's `CONTRIBUTING.md` links to this guidance directly, and Arrow's guide points to it for licensing questions.

## Where the Rules Agree and Where They Differ

Put the four sources side by side and the overlap is large. Every one of them puts responsibility on the human who opens the PR. Every one of them expects that person to understand and explain the change. None of them bans AI tools. The differences are in disclosure and enforcement.

| Question                | Apache Polaris                                   | Apache Arrow (current guide)                                      | CPython devguide                                         | ASF Generative Tooling Guidance                  |
| ----------------------- | ------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| Who is responsible?     | The human submitting the PR is the author        | The author must be able to debug and own the change               | The person submitting is responsible regardless of tools | The contributor, under the ICLA                  |
| Must you understand it? | End to end, and justify design and code          | Review all generated code to understand every detail              | Explain the change in your own words                     | Not addressed (legal scope)                      |
| AI disclosure           | Encouraged for significant assistance            | Asked for, with a summary of what was generated                   | Appreciated, not required                                | Recommended as a commit message token            |
| PR size                 | Small and well scoped (thread and guide)         | Break large PRs into smaller ones                                 | Minimal, focused changes                                 | Not addressed                                    |
| Enforcement path        | Reviewers link `CONTRIBUTING.md` and `AGENTS.md` | PRs with little engagement can be closed. Labels under discussion | Two labels with a bot comment                            | Notify legal if a representation turns out wrong |
| Rules for agents        | `AGENTS.md` with hard gates                      | Agents should never tag or ping maintainers                       | Not separately addressed                                 | Not addressed                                    |

The two real differences are disclosure and enforcement. Polaris encourages disclosure, CPython appreciates it, Arrow asks for it, and Crane proposed making it mandatory with a bot. The ASF recommends a machine-readable form in the commit itself. Disclosing in both the commit trailer and the PR description satisfies all of them, so default to the strictest form.

On enforcement, CPython has the most structured process, and Polaris, per Onofré, prefers pointing people to existing documents. A project with a handful of active committers does not need CPython's machinery.

## A Contributor Checklist That Satisfies All of Them

If you contribute to more than one Apache data project, you want one routine that passes every policy. Here is mine, built from the strictest version of each rule above.

**Before you open the PR**

1. Confirm the problem. Check that an issue exists. For a public interface change in Polaris, `CONTRIBUTING.md` asks for dev list discussion before a ready-for-review PR.
2. Write the reproduction test before the fix, as Kim did. A failing test quoted in the description lets a reviewer verify your claim in a minute.
3. Read the generated diff as if a stranger wrote it. Ask Gu's two questions about every new file and interface.
4. Check every changed test. If a test was modified or deleted to make the build pass, treat it as a bug until you can explain why the old assertion was wrong.
5. Cut scope with `git diff --stat`. Drive-by refactors and extra helper classes go in a separate PR.
6. Run the project's own gates locally, such as the commands in Polaris's `AGENTS.md`.
7. Check your tool's terms for the output ownership clause, once per tool.

**When you open it and during review**

8. Disclose in a commit trailer and in the PR description, saying which parts were generated and how you verified them.
9. Comment on your own PR where you are least certain, as Arrow asks.
10. Address the AI review bot's comments before asking for a human.
11. Answer reviewers in your own words. Arrow's discussion included a proposed rule against AI-written review replies, and CPython's `AI-needs-explanation` label exists for this moment.
12. Never let an agent ping maintainers.
13. Review someone else's PR in the same area. It is the only item here that adds capacity instead of saving it.

### A PR template section you can propose

Most projects collect this through the PR template. Below is an example section I am proposing for a `.github/pull_request_template.md` file. It is not copied from Polaris, Arrow, or CPython, and no project has adopted it. GitHub hides the HTML comments in the rendered PR, and the `- [ ]` lines become checkboxes the author ticks.

```markdown
### AI assistance

Tools used (name and version):
Parts that were generated or heavily edited by a tool:
How I verified those parts (tests run, reproduction, manual checks):

- [ ] I reviewed the full diff as if another person wrote it, and I can
      explain every change in my own words.
- [ ] No existing test was weakened, skipped, or deleted to make CI pass,
      or the PR description explains why the old assertion was wrong.
- [ ] The diff contains only changes needed for this issue
      (checked with `git diff --stat`).
- [ ] My commit messages include a `Generated-by: <tool> <version>` trailer
      for tool-generated changes, per the ASF Generative Tooling Guidance.
- [ ] I checked that my tool's terms let me license the output to the ASF
      under Apache-2.0.
```

The three free-text lines come first on purpose. A checkbox is easy to tick without thinking. A sentence about how you verified the generated parts is harder to fake and gives the reviewer something concrete to check. The fourth checkbox uses the `Generated-by:` token the ASF guidance gives as an example, and the fifth mirrors its condition about tool terms.

Git treats `Key: value` lines in the final paragraph of a commit message as trailers, so an illustrative commit like this carries the provenance with the code:

```text
Fix NPE when catalog properties map is empty

Adds a reproduction test and a null check in the properties loader.

Generated-by: <Name of Tool> <Version>
```

Use the real name and version of whatever tool you ran.

The template enforces nothing. It makes the expectation visible and gives reviewers a place to point. CPython-style enforcement needs labels and a bot, and that is a decision for each Project Management Committee (PMC), made on the dev list.

## What Vendors With Paid Contributors Should Change

Many contributors to Polaris and Arrow are paid by companies that build on them. I work at Dremio, which builds on Iceberg, Polaris, and Arrow, so I have seen how internal incentives produce the PRs these threads complain about.

Onofré stated the ASF baseline in the Arrow thread in September. People contribute as individuals, and discussions about quality belong in public on the PR or the dev list, even between colleagues at the same company. That rules out coaching a colleague privately and treating the public PR as a formality.

**Stop counting PRs opened.** If an engineering goal rewards PR count or lines sent upstream, AI tools turn that goal into reviewer load on someone else's project. Count merged PRs and reviews done instead. Ten small PRs that merge in a week cost the project less than one 3,000-line PR that sits for two months.

**Budget review time.** Crane's seventh recommendation and Gu's November follow-up say the same thing from two projects: reviewing is how a community scales. A company with engineers writing Polaris code and none reviewing other people's PRs is drawing down a shared resource. Put upstream review into sprint plans, in the areas your team already knows.

**Check the tool terms once, centrally.** The ASF guidance puts the burden of checking AI tool terms on each contributor. A company that approves AI tools already has legal staff reading those terms. Publish an internal note listing which approved tools grant output rights compatible with Apache-2.0 contribution, and put the commit trailer format in your internal contribution guide.

None of this slows a company down. It stops it exporting review cost to volunteers.

## Conclusion

The rules forming across Apache data projects are less dramatic than the volume of discussion suggests. Nobody is banning AI tools. Polaris, Arrow, and CPython all say the human who opens the PR owns it and must be able to explain it without the tool's help. The ASF adds the legal layer under your ICLA, including a check of your tool's terms and a provenance token in the commit.

The projects differ on enforcement. Polaris points to its existing `CONTRIBUTING.md` and `AGENTS.md`. Arrow has a close-without-review clause and an open discussion about labels, mandatory disclosure, and reviewer escalation. CPython shipped a two-label process with a bot in October 2026. What Arrow and Polaris adopt next is still under discussion on their dev lists.

For contributors, the practical answer is the same everywhere. Review your own diff as a skeptic and keep it small. Disclose the tooling, answer reviewers yourself, and spend some of the time AI saved you reviewing other people's PRs.

## Keep Going

If this piece was useful, I have written a lot more on Apache Polaris and the open lakehouse ecosystem. _Apache Polaris: The Definitive Guide_ covers the Polaris catalog in depth, from its architecture to running it in production. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [dev@polaris: Improving PR quality and sharing the review load (October 30, 2026)](https://lists.apache.org/thread/zmj9qck863ck6v21l8k0587rp5zh87tq)
- [dev@arrow: [DISCUSS] AI-generated contributions (October 28, 2026 reply)](https://lists.apache.org/thread/fl0bn2p85ox6pjyyokl6hm9k4x1t227p)
- [ASF Generative Tooling Guidance](https://www.apache.org/legal/generative-tooling.html)
- [Python discussion: Updated triage guidelines and process for our AI policy (October 28, 2026)](https://discuss.python.org/t/updated-triage-guidelines-and-process-for-our-ai-policy/109717)
- [Python Developer's Guide: Guidelines for using AI tools](https://devguide.python.org/getting-started/ai-tools/)
- [Apache Polaris CONTRIBUTING.md](https://github.com/apache/polaris/blob/main/CONTRIBUTING.md)
- [Apache Polaris AGENTS.md](https://github.com/apache/polaris/blob/main/AGENTS.md)
- [Apache Arrow developer overview: AI-generated code](https://arrow.apache.org/docs/developers/overview.html#ai-generated-code)
