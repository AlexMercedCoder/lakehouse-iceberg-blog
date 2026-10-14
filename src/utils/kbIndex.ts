// kbIndex.ts: build-time index linking Iceberg KB terms and blog posts.
// Computed once per build and shared by every page that asks for it.
import { getCollection } from "astro:content";
import { matchKb, type KbMatchResult } from "./kbMatch";

export interface KbLink {
  href: string;
  title: string;
}

let cached: ReturnType<typeof build> | undefined;

async function build() {
  const [posts, terms] = await Promise.all([
    getCollection("blog", ({ data }) => !data.draft),
    getCollection("iceberg"),
  ]);
  const result: KbMatchResult = matchKb(
    terms.map(t => ({
      slug: t.id,
      term: t.data.term,
      keywords: t.data.keywords,
    })),
    posts.map(p => ({
      id: p.id,
      title: p.data.title,
      tags: p.data.tags,
      body: p.body ?? "",
      kbEligible:
        /\b(iceberg|lakehouse|parquet|polaris|nessie)\b/i.test(
          [p.data.title, ...p.data.tags].join(" ")
        ) || ((p.body ?? "").match(/\biceberg\b/gi) ?? []).length >= 3,
      ownCanonical:
        !p.data.canonicalURL ||
        p.data.canonicalURL.startsWith("https://iceberglakehouse.com/"),
    }))
  );
  const postById = new Map(posts.map(p => [p.id, p]));
  const termById = new Map(terms.map(t => [t.id, t]));
  return {
    postsForTerm: (slug: string): KbLink[] =>
      (result.termPosts[slug] ?? []).flatMap(id => {
        const p = postById.get(id);
        return p
          ? [{ href: `/posts/${id.toLowerCase()}/`, title: p.data.title }]
          : [];
      }),
    termsForPost: (id: string, limit = 3): KbLink[] =>
      (result.postTerms[id] ?? []).slice(0, limit).flatMap(slug => {
        const t = termById.get(slug);
        return t ? [{ href: `/iceberg/${slug}/`, title: t.data.term }] : [];
      }),
  };
}

export const getKbIndex = () => (cached ??= build());
