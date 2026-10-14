// kbMatch.ts: pure matching between Iceberg KB terms and blog posts.
// Runs once per build (see kbIndex.ts). Term pages use it for "Read more"
// and posts use it for "Terms in this article". No markdown is edited.

export interface KbTermInput {
  slug: string;
  term: string;
  keywords: string[];
}

export interface KbPostInput {
  id: string;
  title: string;
  tags: string[];
  body: string;
  ownCanonical: boolean;
  // false for posts outside the lakehouse topic (AI tool guides, for
  // example): they get no "Terms in this article" list.
  kbEligible?: boolean;
}

export interface KbMatchResult {
  termPosts: Record<string, string[]>; // term slug -> post ids (best first)
  postTerms: Record<string, string[]>; // post id -> term slugs (best first)
}

const tokenize = (text: string): string[] =>
  text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

const norm = (text: string) => tokenize(text).join(" ");

// Tokens that say "this is about Iceberg" but not which part of it.
const NOISE = new Set(["apache", "iceberg"]);
const EDGE_STOP = new Set(["and", "in", "for", "with", "on", "the", "of", "a"]);

// Phrases too common on this site to mark a post as being about a term
// when they only appear in the body. They still count in titles and tags.
const GENERIC = new Set([
  "table",
  "tables",
  "data",
  "catalog",
  "lakehouse",
  "data lakehouse",
  "metadata",
  "snapshot",
  "snapshots",
  "query",
  "sql",
  "python",
  "dremio",
  "spark",
  "flink",
  "trino",
  "kafka",
  "hive",
  "views",
  "statistics",
  "streaming",
  "encryption",
  "rollback",
  "parquet",
  "avro",
  "orc",
  "manifest",
  "data files",
  "time travel",
  "sort order",
  "mcp",
]);

// Natural phrasings that the SEO keywords on some terms do not cover.
const EXTRA: Record<string, string[]> = {
  "iceberg-wap-pattern": ["write audit publish", "wap pattern"],
  "iceberg-zorder": ["z order", "zorder"],
  "iceberg-z-order-compaction": ["z order compaction", "zorder compaction"],
  "iceberg-spark-procedure-expire-snapshots": ["expire snapshots"],
  "iceberg-expire-snapshots": ["expire snapshots", "snapshot expiration"],
  "iceberg-spark-procedure-rewrite-data-files": ["rewrite data files"],
  "iceberg-spark-procedure-rewrite-manifests": ["rewrite manifests"],
  "iceberg-spark-procedure-remove-orphan-files": ["remove orphan files"],
  "iceberg-spark-procedure-register-table": ["register table"],
  "iceberg-spark-procedure-add-files": ["add files procedure"],
  "iceberg-views": ["iceberg views", "iceberg view"],
  "iceberg-rollback": ["rollback to snapshot", "roll back"],
  "iceberg-branching-tagging": ["branching and tagging", "iceberg branches"],
  "iceberg-orphan-files": ["orphan files"],
  "iceberg-hive-metastore": ["hive metastore"],
  "iceberg-migration-hive": ["hive migration", "migrate from hive"],
  "iceberg-vs-delta-lake": ["iceberg vs delta", "delta lake"],
  "iceberg-vs-apache-hudi": ["apache hudi", "hudi"],
  "iceberg-parquet": ["parquet files"],
  "data-lineage-tracking": ["data lineage", "column lineage"],
};

interface Phrases {
  body: string[]; // count anywhere
  weak: string[]; // count anywhere only if rare on the site
  title: string[]; // count only in titles and tags
}

function phrasesFor(t: KbTermInput): Phrases {
  const body = new Set<string>();
  const weak = new Set<string>();
  const title = new Set<string>();
  const add = (raw: string, isKeyword: boolean) => {
    const full = norm(raw.replace(/\s*\([^)]*\)/g, ""));
    const words = full.split(" ").filter(w => !NOISE.has(w));
    while (words.length && EDGE_STOP.has(words[0])) words.shift();
    while (words.length && EDGE_STOP.has(words[words.length - 1])) words.pop();
    const stripped = words.join(" ");
    for (const p of [full, stripped]) {
      if (p.length < 3 || NOISE.has(p) || p === "apache iceberg") continue;
      if (GENERIC.has(p) || p.length < 5) title.add(p);
      // A keyword stripped of "iceberg" ("iceberg configuration" ->
      // "configuration") is often a common word; keep it only if rare.
      else if (isKeyword && p === stripped && p !== full) weak.add(p);
      else body.add(p);
    }
  };
  add(t.term, false);
  for (const k of t.keywords) add(k, true);
  for (const k of EXTRA[t.slug] ?? []) body.add(norm(k));
  for (const p of body) {
    title.delete(p);
    weak.delete(p);
  }
  for (const p of weak) title.delete(p);
  return { body: [...body], weak: [...weak], title: [...title] };
}

function countPhrases(
  text: string,
  phraseSet: Set<string>,
  maxN: number
): Map<string, number> {
  const words = tokenize(text);
  const counts = new Map<string, number>();
  for (let i = 0; i < words.length; i++) {
    let gram = "";
    for (let n = 0; n < maxN && i + n < words.length; n++) {
      gram = n === 0 ? words[i] : gram + " " + words[i + n];
      if (phraseSet.has(gram)) counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }
  }
  return counts;
}

export function matchKb(
  terms: KbTermInput[],
  posts: KbPostInput[],
  opts = { postsPerTerm: 3, termsPerPost: 3 }
): KbMatchResult {
  const termPhrases = new Map(terms.map(t => [t.slug, phrasesFor(t)]));
  const phraseSet = new Set(
    [...termPhrases.values()].flatMap(p => [...p.body, ...p.weak, ...p.title])
  );
  const maxN = Math.max(1, ...[...phraseSet].map(p => p.split(" ").length));

  const stripCode = (md: string) => md.replace(/```[\s\S]*?```/g, " ");

  const postStats = posts.map(p => ({
    post: p,
    body: countPhrases(stripCode(p.body), phraseSet, maxN),
    title: countPhrases(p.title, phraseSet, maxN),
    tags: new Set(p.tags.map(norm)),
  }));

  // Document frequency: a phrase found in a large share of posts says little
  // about any one of them, so it weighs less.
  const df = new Map<string, number>();
  for (const s of postStats)
    for (const ph of new Set([...s.body.keys(), ...s.title.keys()]))
      df.set(ph, (df.get(ph) ?? 0) + 1);
  const N = posts.length;
  const idf = (ph: string) => Math.log((N + 1) / ((df.get(ph) ?? 0) + 1)) + 0.1;
  // Weak phrases count in bodies only when they appear in under 4% of posts.
  for (const ph of termPhrases.values()) {
    for (const w of ph.weak) {
      if ((df.get(w) ?? 0) <= 0.04 * N) ph.body.push(w);
      else ph.title.push(w);
    }
    ph.weak = [];
  }

  const score = (slug: string, s: (typeof postStats)[number]) => {
    const ph = termPhrases.get(slug)!;
    let total = 0;
    let strong = false; // title or tag hit
    let bodyHits = 0;
    for (const p of [...ph.body, ...ph.title]) {
      const inTitle = (s.title.get(p) ?? 0) > 0;
      const inTags = s.tags.has(p);
      if (inTitle || inTags) strong = true;
      total += idf(p) * ((inTitle ? 8 : 0) + (inTags ? 4 : 0));
    }
    for (const p of ph.body) {
      const c = s.body.get(p) ?? 0;
      bodyHits += c;
      total += idf(p) * Math.min(c, 6);
    }
    return { total, strong, bodyHits };
  };

  const termPosts: Record<string, string[]> = {};
  const postTerms: Record<string, Array<[string, number]>> = {};

  for (const t of terms) {
    const ranked: Array<[string, number]> = [];
    for (const s of postStats) {
      const { total, strong, bodyHits } = score(t.slug, s);
      // "About the term": named in the title or tags, or discussed repeatedly.
      if (total <= 0 || (!strong && bodyHits < 3)) continue;
      // Prefer posts whose canonical home is this site.
      ranked.push([s.post.id, s.post.ownCanonical ? total : total * 0.5]);
      if (s.post.kbEligible !== false)
        (postTerms[s.post.id] ??= []).push([t.slug, total]);
    }
    ranked.sort((a, b) => b[1] - a[1]);
    termPosts[t.slug] = ranked.slice(0, opts.postsPerTerm).map(r => r[0]);
  }

  const postTermsOut: Record<string, string[]> = {};
  for (const [id, list] of Object.entries(postTerms)) {
    list.sort((a, b) => b[1] - a[1]);
    postTermsOut[id] = list.slice(0, opts.termsPerPost).map(r => r[0]);
  }
  return { termPosts, postTerms: postTermsOut };
}
