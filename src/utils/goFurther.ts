// goFurther.ts: picks a few hands-on network resources for a post, by topic.
// Topics are read from the post title and tags only, so a passing mention in
// the body never triggers a link. URLs were checked live on 2026-10-13.
// Book titles and slugs come from alexmercedcom/entity/books.json.

export interface GoFurtherLink {
  href: string;
  label: string;
  why: string;
}

const has = (text: string, re: RegExp) => re.test(text);

const BOOK = (slug: string, title: string, why: string): GoFurtherLink => ({
  href: `https://books.alexmerced.com/books/${slug}/`,
  label: title,
  why,
});

function pickBook(t: string): GoFurtherLink | undefined {
  if (has(t, /\bpolaris\b/))
    return BOOK(
      "apache-polaris-the-definitive-guide",
      "Apache Polaris: The Definitive Guide",
      "the book-length treatment of Polaris"
    );
  if (has(t, /\bcodex\b/))
    return BOOK(
      "being-productive-with-openai-codex",
      "Being Productive with OpenAI Codex",
      "Alex's book on working with Codex day to day"
    );
  if (has(t, /\bclaude\b/))
    return BOOK(
      "being-productive-with-claude",
      "Being Productive with Claude",
      "Alex's book on working with Claude day to day"
    );
  if (has(t, /\bagentic analytics\b/))
    return BOOK(
      "the-book-on-agentic-analytics",
      "The Book on Agentic Analytics",
      "the full picture of agentic analytics in one book"
    );
  if (has(t, /\bsemantic layers?\b/))
    return BOOK(
      "constructing-context-and-semantics-for-ai-agents",
      "Constructing Context and Semantics for AI Agents",
      "how semantic context makes agents accurate"
    );
  if (
    has(
      t,
      /\b(context management|ai coding|coding agents?|cursor|opencode|windsurf|copilot|ai assisted development)\b/
    )
  )
    return BOOK(
      "the-2026-guide-to-ai-assisted-development",
      "The 2026 Guide to AI-Assisted Development",
      "workflows and context strategies for AI coding tools"
    );
  if (
    has(
      t,
      /\b(open models?|open source models?|open weight|hermes|deepseek|ollama|local ai)\b/
    )
  )
    return BOOK(
      "being-productive-with-open-models",
      "Being Productive with Open Models",
      "Alex's book on getting real work done with open models"
    );
  if (
    has(t, /\b(mcp|ai agents?|agentic|data agents?)\b/) &&
    has(t, /\biceberg\b/)
  )
    return BOOK(
      "apache-iceberg-for-agentic-ai-connecting-structured-enterprise",
      "Apache Iceberg for Agentic AI: Connecting Structured Enterprise",
      "connecting agents to structured Iceberg data"
    );
  if (has(t, /\b(pyiceberg|python)\b/) && has(t, /\biceberg\b/))
    return BOOK(
      "the-book-on-using-apache-iceberg-with-python",
      "The Book on Using Apache Iceberg with Python",
      "Iceberg from Python, end to end"
    );
  if (has(t, /\biceberg\b/))
    return BOOK(
      "apache-iceberg-the-definitive-guide",
      "Apache Iceberg: The Definitive Guide",
      "the O'Reilly book Alex co-authored on Iceberg internals and engines"
    );
  if (has(t, /\blakehouse\b/))
    return BOOK(
      "architecting-an-apache-iceberg-lakehouse",
      "Architecting an Apache Iceberg Lakehouse",
      "designing a lakehouse from storage to semantic layer"
    );
  return undefined;
}

function pickTools(t: string): GoFurtherLink[] {
  const out: GoFurtherLink[] = [];

  // Table maintenance: compaction, snapshot expiration, small files.
  if (
    has(t, /\b(iceberg|lakehouse|tables?|delta lake|hudi)\b/) &&
    has(
      t,
      /\b(compaction|compacting|expire snapshots?|snapshot expiration|expiring snapshots|table maintenance|maintenance|small files?|orphan files?|rewrite data files)\b/
    )
  ) {
    out.push({
      href: "https://datalakehouse.help/tools/maintenance-calculator/",
      label: "Iceberg Table Maintenance Calculator",
      why: "enter your ingest volume, commit rate, and retention to get a compaction cadence, snapshot expiration settings, and the Spark SQL CALL statements",
    });
    out.push(
      has(t, /\b(expire|expiring|expiration|snapshots?)\b/) &&
        !has(t, /\bcompact/)
        ? {
            href: "https://datalakehouse.help/guides/optimization/05-expire-snapshots/",
            label: "Expire Apache Iceberg Snapshots",
            why: "a runnable expire_snapshots procedure with checks against the metadata tables",
          }
        : {
            href: "https://datalakehouse.help/guides/optimization/03-compaction/",
            label: "Compact Apache Iceberg Data Files",
            why: "a runnable rewrite_data_files procedure covering bin-pack, sort, and filtered rewrites",
          }
    );
    return out;
  }

  // Agents, MCP, and semantic layers over lakehouse data.
  const dataContext = has(
    t,
    /\b(lakehouse|iceberg|data|analytics|semantic|sql|catalog|bi)\b/
  );
  if (
    dataContext &&
    has(
      t,
      /\b(mcp|model context protocol|ai agents?|agentic|agents|semantic layers?)\b/
    )
  ) {
    if (has(t, /\bmcp\b|model context protocol/) && has(t, /\bsemantic\b/))
      out.push({
        href: "https://agenticlakehouse.com/patterns/semantic-layer-over-mcp/",
        label: "Expose a Semantic Layer to AI Agents over MCP",
        why: "a step-by-step pattern with working code",
      });
    else if (has(t, /\bmcp\b|model context protocol/))
      out.push({
        href: "https://agenticlakehouse.com/patterns/mcp-server-over-iceberg-catalog/",
        label: "Build an MCP Server over an Apache Iceberg Catalog",
        why: "a step-by-step pattern with working PyIceberg code",
      });
    else if (
      has(
        t,
        /\b(governance|governed|security|guardrails?|policy|policies|access control|pii)\b/
      )
    )
      out.push({
        href: "https://agenticlakehouse.com/patterns/agent-safe-governed-views/",
        label: "Agent-Safe Governed Views",
        why: "a step-by-step pattern for giving agents governed access to Iceberg tables",
      });
    else
      out.push({
        href: "https://agenticlakehouse.com/patterns/",
        label: "Agentic Lakehouse Implementation Patterns",
        why: "governed views, query guardrails, and MCP servers, each with working code",
      });
    if (has(t, /\b(analytics|semantic|bi|business)\b/))
      out.push({
        href: "https://agenticanalyticsnow.com/readiness/",
        label: "Agentic Analytics Readiness Assessment",
        why: "fifteen questions that score how ready your semantic layer, governance, and data are for analytics agents",
      });
    return out;
  }

  // Engines and catalogs: who supports which Iceberg features.
  if (
    has(t, /\biceberg\b/) &&
    has(
      t,
      /\b(catalogs?|polaris|nessie|glue|unity|gravitino|trino|spark|flink|dremio|duckdb|snowflake|starrocks|doris|clickhouse|bigquery|athena|engines?|interoperability|compatibility)\b/
    )
  ) {
    out.push({
      href: "https://opendatalakehouse.com/compare/compatibility/",
      label: "Apache Iceberg Compatibility Matrix",
      why: "which engines and catalogs support reads, writes, deletes, format v3, branches, REST catalogs, and views, with every cell sourced to official docs",
    });
  }
  return out;
}

export function goFurther(title: string, tags: string[]): GoFurtherLink[] {
  const t = [title, ...tags].join(" | ").toLowerCase().replace(/[_-]+/g, " ");
  const links = pickTools(t);
  const book = pickBook(t);
  if (book) links.push(book);
  return links.slice(0, 3);
}
