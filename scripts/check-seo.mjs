import fs from "node:fs";
import path from "node:path";

const root = path.resolve("dist");
const failures = [];

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing generated file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function assertSelfCanonical(relativePath, expectedUrl) {
  const html = read(relativePath);
  if (!html.includes(`<link rel="canonical" href="${expectedUrl}"`)) {
    failures.push(`${relativePath} does not self-canonicalize to ${expectedUrl}`);
  }
  if (/<meta name="robots" content="noindex/i.test(html)) {
    failures.push(`${relativePath} is unexpectedly noindex`);
  }
}

for (const pageOne of [
  "posts/1/index.html",
  "tags/data-engineering/1/index.html",
]) {
  if (fs.existsSync(path.join(root, pageOne))) {
    failures.push(`Duplicate page-one archive was generated: ${pageOne}`);
  }
}

assertSelfCanonical(
  "posts/2/index.html",
  "https://iceberglakehouse.com/posts/2/"
);
assertSelfCanonical(
  "tags/data-engineering/2/index.html",
  "https://iceberglakehouse.com/tags/data-engineering/2/"
);

const sitemapFiles = fs
  .readdirSync(root)
  .filter(name => /^sitemap-.*\.xml$/.test(name));
const sitemap = sitemapFiles.map(read).join("\n");

if (!sitemap.includes("https://iceberglakehouse.com/posts/2/")) {
  failures.push("Posts page 2 is missing from the sitemap");
}
if (!sitemap.includes("https://iceberglakehouse.com/tags/data-engineering/2/")) {
  failures.push("Tag page 2 is missing from the sitemap");
}
if (/https:\/\/iceberglakehouse\.com\/(?:posts|tags\/[^/]+)\/1\//.test(sitemap)) {
  failures.push("A duplicate page-one archive is present in the sitemap");
}

const redirects = read("_redirects");
for (const rule of [
  "/posts/1/ /posts/ 301!",
  "/tags/:tag/1/ /tags/:tag/ 301!",
]) {
  if (!redirects.includes(rule)) failures.push(`Missing redirect rule: ${rule}`);
}

if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("SEO archive checks passed.");
