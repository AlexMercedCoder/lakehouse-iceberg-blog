import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/config";
import rehypeExternalLinks from "rehype-external-links";

import fs from "node:fs";
import path from "node:path";

function getBlogDates(dir: string): Record<string, Date> {
  const dates: Record<string, Date> = {};
  function walk(d: string) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else if (f.endsWith(".md") || f.endsWith(".mdx")) {
        const txt = fs.readFileSync(full, "utf-8");
        const m = txt.match(/^---\s*\n([\s\S]*?)\n---/);
        let dVal: string | null = null;
        if (m) {
          const modMatch =
            m[1].match(/modDatetime:\s*(.*)/) ||
            m[1].match(/pubDatetime:\s*(.*)/) ||
            m[1].match(/lastUpdated:\s*(.*)/) ||
            m[1].match(/date:\s*(.*)/);
          if (modMatch) dVal = modMatch[1].trim().replace(/["']/g, "");
        }
        const dObj = dVal ? new Date(dVal) : fs.statSync(full).mtime;
        const slug = f.replace(/\.mdx?$/, "");
        dates[`/posts/${slug}/`] = dObj;
        dates[`/posts/${slug}`] = dObj;
        dates[`/iceberg/${slug}/`] = dObj;
        dates[`/iceberg/${slug}`] = dObj;
      }
    }
  }
  walk(dir);
  return dates;
}

const contentDates = getBlogDates("./src/content");

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  prefetch: true,
  integrations: [
    react(),
    sitemap({
      // Page 1 aliases redirect to the unnumbered archive. Page 2+ contains
      // distinct posts and must remain independently discoverable.
      filter: page =>
        !/\/(?:posts|tags\/[^/]+)\/1\/?$/.test(new URL(page).pathname),
      serialize(item) {
        const urlObj = new URL(item.url);
        const p = urlObj.pathname;
        const d =
          contentDates[p] ||
          contentDates[p.replace(/\/$/, "")] ||
          contentDates[`${p}/`];
        if (d && !isNaN(d.getTime())) {
          item.lastmod = d.toISOString();
        } else {
          item.lastmod = new Date().toISOString();
        }
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
