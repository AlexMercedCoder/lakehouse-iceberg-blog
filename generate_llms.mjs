// Writes public/llms.txt and public/llms-full.txt.
//
// llms.txt: a short description of the site, the pillar pages, the newest
// self-canonical posts grouped by category (capped so the file stays under
// LLMS_MAX_BYTES), the knowledge base, events, and community links.
// llms-full.txt: the same, with every self-canonical post.
//
// Posts whose canonicalURL points to another site are copies of articles that
// live elsewhere, so neither file lists them. Drafts and scheduled posts are
// skipped the same way the site skips them (src/utils/postFilter.ts).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const glob = require('glob');
const yaml = require('js-yaml');
const globSync = glob.sync || glob.globSync;

const SITE_URL = 'https://iceberglakehouse.com';
const SITE_NAME = "Alex Merced's Lakehouse Blog";
const LLMS_MAX_BYTES = 58 * 1024;
const SCHEDULED_POST_MARGIN = 15 * 60 * 1000; // matches SITE.scheduledPostMargin

// Frontmatter categories are free text (46 distinct values). Each maps to one
// of these sections, listed in this order; anything unmapped lands in "Other".
const SECTIONS = [
  ['Apache Iceberg and Table Formats', ['Apache Iceberg', 'Apache Polaris', 'Apache Parquet', 'Apache Arrow']],
  ['Data Lakehouse Architecture', ['Data Lakehouse', 'Lakehouse', 'Lakehouse Architecture', 'Data Architecture', 'Data Platforms']],
  ['Agentic Analytics and Semantic Layers', ['Agentic Analytics', 'Agentic Lakehouse', 'Semantic Layer', 'MCP']],
  ['AI and Agents', ['AI & Agents', 'AI Tools', 'AI', 'Artificial Intelligence', 'Agentic AI', 'AI & Data', 'AI & Security', 'AI Tools & Software Development', 'AI & Society', 'AI & Machine Learning']],
  ['Dremio', ['Dremio']],
  ['Data Engineering', ['Data Engineering', 'Data Analytics', 'Data Modeling', 'Data Quality', 'Streaming', 'Observability', 'Cost Optimization', 'DevOps', 'Devops', 'python', 'rust', 'sql', 'Software Development', 'Open Source', 'Hardware']],
  ['Governance and Security', ['Data Governance', 'Governance', 'Data Security', 'Security', 'Security & Governance']],
  ['Other', []],
];
const SECTION_OF = new Map(SECTIONS.flatMap(([name, cats]) => cats.map(c => [c.toLowerCase(), name])));

const EXCLUDED_PAGES = new Set(['index.astro', '404.astro', 'search.astro']);

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? yaml.load(m[1]) || {} : {};
}

function oneLine(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function pillarPages() {
  const files = [
    ...globSync('src/pages/*.astro').filter(f => !EXCLUDED_PAGES.has(path.basename(f))),
    'src/pages/benchmarks/open-table-formats.astro',
  ].sort();
  return files.map(file => {
    const text = fs.readFileSync(file, 'utf8');
    const route = file.replace(/^src\/pages\//, '').replace(/\.astro$/, '');
    const title = text.match(/title="([^"]+)"/)?.[1]
      ?? text.match(/title=\{`([^`$|]+?)\s*\|/)?.[1]
      ?? route;
    const description = text.match(/description="([^"]+)"/)?.[1] ?? '';
    return { title: oneLine(title), url: `${SITE_URL}/${route}/`, description: oneLine(description) };
  });
}

function selfCanonicalPosts() {
  const now = Date.now();
  const posts = [];
  let skippedCanonical = 0;
  for (const file of globSync('src/content/blog/**/*.md')) {
    const data = frontmatter(file);
    if (data.draft === true) continue;
    const published = new Date(data.pubDatetime);
    if (isNaN(published) || published.getTime() - SCHEDULED_POST_MARGIN > now) continue;
    const id = typeof data.slug === 'string' && data.slug
      ? data.slug
      : path.relative('src/content/blog', file).replace(/\.md$/, '');
    // Same URL shape as src/layouts/PostDetails.astro.
    const url = `${SITE_URL}/posts/${id.toLowerCase()}/`;
    if (data.canonicalURL && !String(data.canonicalURL).startsWith(`${SITE_URL}/`)) {
      skippedCanonical++;
      continue;
    }
    const category = oneLine(data.category);
    posts.push({
      title: oneLine(data.title),
      description: oneLine(data.description),
      url,
      published,
      file,
      section: SECTION_OF.get(category.toLowerCase()) ?? 'Other',
    });
  }
  // Newest first; the file path breaks ties so the output is stable.
  posts.sort((a, b) => b.published - a.published || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  return { posts, skippedCanonical };
}

function knowledgeBase() {
  let out = `## Apache Iceberg Knowledge Base\n\n`;
  out += `- [Knowledge Base Index](${SITE_URL}/iceberg/)\n`;
  for (const file of globSync('src/content/iceberg/*.md').sort()) {
    const slug = path.basename(file, '.md');
    const title = oneLine(frontmatter(file).term) || slug;
    out += `- [${title}](${SITE_URL}/iceberg/${slug}/)\n`;
  }
  return out;
}

const EVENTS_AND_COMMUNITY = `## Events

- [Agentic Lakehouse Events](https://luma.com/agenticlakehouse): global meetups and webinars on agentic analytics
- [Data Lakehouse Hub Events](https://luma.com/DataLakehouseHub): global lakehouse meetups, linkups and webinars

## Community

- [Data Lakehouse Hub Slack](https://join.slack.com/t/thedatalakehousehub/shared_invite/zt-274yc8sza-mI2zhCW8LGkOh1uxuf8T5Q): practitioner community for lakehouse architecture
- [Data Events Slack](https://join.slack.com/t/data-events/shared_invite/zt-38vgrooy9-U9ral_gr3NAz_Siih1QwmQ): announcements for data conferences and meetups
- [Data & Tech Slack](https://join.slack.com/t/datatechcommunity/shared_invite/zt-12xrk4qmd-y~6jUFFd7kdaLhgLURKwoA): broader data and technology community
- [r/datalakehouseandai](https://www.reddit.com/r/datalakehouseandai/): subreddit for data lakehouse and AI discussion
- [Data Lakehouse Hub on LinkedIn](https://www.linkedin.com/company/data-lakehouse-hub/): company page for the Data Lakehouse Hub
- [Alex Merced Tech on YouTube](https://www.youtube.com/@AlexMercedCoder): software development and engineering channel
- [Alex Merced Data & AI on YouTube](https://www.youtube.com/@alexmerceddata): data lakehouse and AI channel
`;

function header(totalPosts) {
  return `# ${SITE_NAME}

> ${SITE_NAME} (iceberglakehouse.com) is Alex Merced's independent blog on the open lakehouse. It has ${totalPosts} articles on Apache Iceberg internals, lakehouse catalogs such as Apache Polaris and the Iceberg REST Catalog, table maintenance and performance, query engines, and the agentic lakehouse, where AI agents query governed data through semantic layers and open protocols such as MCP. Alex is Head of Developer Relations at Dremio and a co-author of Apache Iceberg: The Definitive Guide. The pillar pages below are the best starting points; the posts are listed newest first within each topic.

`;
}

function pillarSection(pillars) {
  let out = `## Pillar Pages\n\n`;
  for (const p of pillars) out += `- [${p.title}](${p.url})${p.description ? `: ${p.description}` : ''}\n`;
  return out;
}

function postSections(posts) {
  let out = '';
  for (const [name] of SECTIONS) {
    const inSection = posts.filter(p => p.section === name);
    if (!inSection.length) continue;
    out += `## Articles: ${name}\n\n`;
    for (const p of inSection) {
      const day = p.published.toISOString().slice(0, 10);
      out += `- [${p.title}](${p.url}) (${day})${p.description ? `: ${p.description}` : ''}\n`;
    }
    out += '\n';
  }
  return out;
}

function render(pillars, posts, totalPosts, note) {
  return [header(totalPosts), pillarSection(pillars), '\n', note, postSections(posts), knowledgeBase(), '\n', EVENTS_AND_COMMUNITY].join('');
}

function generate() {
  const pillars = pillarPages();
  const { posts, skippedCanonical } = selfCanonicalPosts();

  const full = render(pillars, posts, posts.length, '');
  fs.writeFileSync('public/llms-full.txt', full);

  // Keep the newest N posts that fit under the size cap.
  const fullNote = `The ${'%N%'} newest articles are listed below. Every article is listed in [llms-full.txt](${SITE_URL}/llms-full.txt).\n\n`;
  const build = n => render(pillars, posts.slice(0, n), posts.length, n < posts.length ? fullNote.replace('%N%', String(n)) : '');
  const fits = n => Buffer.byteLength(build(n)) <= LLMS_MAX_BYTES;
  // Largest n that fits (binary search; size grows with n).
  let lo = 0, hi = posts.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) lo = mid; else hi = mid - 1;
  }
  const n = lo;
  const short = build(n);
  fs.writeFileSync('public/llms.txt', short);

  console.log(`llms.txt: ${n} of ${posts.length} self-canonical posts, ${(Buffer.byteLength(short) / 1024).toFixed(1)} KB`);
  console.log(`llms-full.txt: ${posts.length} posts, ${(Buffer.byteLength(full) / 1024).toFixed(1)} KB (${skippedCanonical} posts canonical to other sites skipped)`);
}

generate();
