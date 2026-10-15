import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/config";
import rehypeExternalLinks from "rehype-external-links";
import demoteH1 from "./src/utils/rehype/demoteH1.mjs";

import fs from "node:fs";
import path from "node:path";

import { execFileSync } from "node:child_process";
import yaml from "js-yaml";
import { slug as slugger } from "github-slugger";

// Sitemap <lastmod> must change only when a page's content does. Posts are
// keyed by their URL id: the frontmatter slug for blog posts (that is what
// content.config.ts builds the id from), the filename for /iceberg/ entries.
// Keying blog posts by filename missed every post whose slug differs from it,
// and those fell back to the build time, so each deploy re-dated ~400 posts.
function fm(txt: string): string {
  return txt.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? "";
}
function fmDate(front: string, keys: string[]): Date | null {
  for (const k of keys) {
    const m = front.match(new RegExp(`^${k}:\\s*(.+)$`, "m"));
    const d = m && new Date(m[1].trim().replace(/["']/g, ""));
    if (d && !isNaN(d.getTime())) return d;
  }
  return null;
}
function getContentDates(): Record<string, Date> {
  const dates: Record<string, Date> = {};
  const walk = (dir: string, prefix: string, useSlug: boolean) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        walk(full, prefix, useSlug);
        continue;
      }
      if (!/\.mdx?$/.test(f)) continue;
      const front = fm(fs.readFileSync(full, "utf-8"));
      if (/^draft:\s*true/m.test(front)) continue;
      const d = fmDate(front, [
        "modDatetime",
        "lastUpdated",
        "pubDatetime",
        "date",
      ]);
      if (!d) continue;
      const slug = useSlug
        ? front.match(/^slug:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1]
        : null;
      const id = (slug || f.replace(/\.mdx?$/, "")).toLowerCase();
      dates[`${prefix}${id}/`] = d;
    }
  };
  walk("./src/content/blog", "/posts/", true);
  walk("./src/content/iceberg", "/iceberg/", false);
  return dates;
}

// Standalone pages take the last commit that touched their source file. A
// shallow clone would date them all to the one fetched commit, so skip git.
const shallow = (() => {
  try {
    return (
      execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
        encoding: "utf-8",
      }).trim() !== "false"
    );
  } catch {
    return true;
  }
})();
function gitDate(file: string): Date | null {
  if (shallow) return null;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], {
      encoding: "utf-8",
    }).trim();
    return out ? new Date(out) : null;
  } catch {
    return null;
  }
}
function pageSourceDate(pathname: string): Date | null {
  const base = pathname.replace(/^\/|\/$/g, "") || "index";
  for (const ext of [".astro", ".md", ".mdx"]) {
    for (const f of [
      `src/pages/${base}${ext}`,
      `src/pages/${base}/index${ext}`,
    ]) {
      if (fs.existsSync(f)) return gitDate(f);
    }
  }
  return null;
}

const contentDates = getContentDates();
const newestContent = new Date(
  Math.max(...Object.values(contentDates).map(d => d.getTime()))
);

// Syndicated copies whose canonicalURL points at another site stay out of the
// sitemap: it should list only URLs this site is canonical for.
function getNonCanonicalPosts(dir: string): Set<string> {
  const out = new Set<string>();
  function walk(d: string) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (f.endsWith(".md")) {
        const m = fs
          .readFileSync(full, "utf-8")
          .match(/^---\s*\n([\s\S]*?)\n---/);
        if (!m) continue;
        if (
          !/^canonicalURL:\s*["']?https:\/\/(?!iceberglakehouse\.com)/m.test(
            m[1]
          )
        )
          continue;
        const slug = m[1].match(/^slug:\s*["']?([^"'\n]+?)["']?\s*$/m);
        const id = slug
          ? slug[1]
          : path.relative(dir, full).replace(/\.md$/, "");
        out.add(`/posts/${id}/`.toLowerCase());
      }
    }
  }
  walk(dir);
  return out;
}
const nonCanonicalPosts = getNonCanonicalPosts("./src/content/blog");

// Tags with fewer than 3 posts are thin pages: they render with
// "noindex, follow" (TagPosts.astro) and stay out of the sitemap. Counted the
// way the tag pages count them: slugified tags of non-draft posts.
function getThinTags(dir: string): Set<string> {
  const counts = new Map<string, number>();
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (/\.mdx?$/.test(f)) {
        const front = fm(fs.readFileSync(full, "utf-8"));
        if (/^draft:\s*true/m.test(front)) continue;
        let data: { tags?: unknown } = {};
        try {
          data = (yaml.load(front) as { tags?: unknown }) ?? {};
        } catch {
          continue;
        }
        const tags = Array.isArray(data.tags) ? data.tags : ["others"];
        for (const t of new Set(tags.map(t => slugger(String(t))))) {
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }
    }
  };
  walk(dir);
  return new Set([...counts].filter(([, n]) => n < 3).map(([t]) => t));
}
const thinTags = getThinTags("./src/content/blog");

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  prefetch: true,
  integrations: [
    react(),
    sitemap({
      // Archive pagination (/posts/N/, /tags/x/N/) and thin tags render
      // "noindex, follow", so they are left out here too.
      filter: page => {
        const p = new URL(page).pathname.toLowerCase();
        if (/^\/(?:posts|tags\/[^/]+)\/\d+\/?$/.test(p)) return false;
        const tag = p.match(/^\/tags\/([^/]+)\/?$/)?.[1];
        if (tag && thinTags.has(decodeURIComponent(tag))) return false;
        return !nonCanonicalPosts.has(p);
      },
      serialize(item) {
        // Netlify serves lowercase paths; list the URL that answers 200.
        item.url = item.url.replace(
          /^(https?:\/\/[^/]+)(.*)$/,
          (_, o, p) => o + p.toLowerCase()
        );
        const p = new URL(item.url).pathname;
        const key = p.endsWith("/") ? p : `${p}/`;
        // Post and entry pages carry their own date; the home page and the
        // post archive change when the newest post does. Tag archives and
        // pages with no known source get no lastmod rather than a made-up one.
        const d =
          contentDates[key] ??
          (/^\/(posts\/(\d+\/)?|iceberg\/)?$/.test(key)
            ? newestContent
            : null) ??
          (/^\/tags\//.test(key) ? null : pageSourceDate(key));
        if (d) item.lastmod = d.toISOString();
        else delete item.lastmod;
        return item;
      },
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      [
        remarkCollapse,
        {
          test: "Table of contents",
        },
      ],
    ],
    rehypePlugins: [
      demoteH1,
      [
        rehypeExternalLinks,
        {
          target: "_blank",
          rel: ["noopener", "noreferrer"],
        },
      ],
    ],
    shikiConfig: {
      theme: "one-dark-pro",
      wrap: true,
    },
  },
  vite: {
    // Tailwind 4 is a Vite plugin rather than an Astro integration.
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  scopedStyleStrategy: "where",
  image: {
    domains: ["i.imgur.com"],
  },
});
