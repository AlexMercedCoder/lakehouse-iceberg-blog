import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const glob = require('glob');
const globSync = glob.sync || glob.globSync;

const SITE_URL = 'https://iceberglakehouse.com';

function generate() {
  let content = `# Alex Merced's Lakehouse Blog
> The authoritative resource on Apache Iceberg, the Agentic Lakehouse, and open table formats.

## Pillar Pages
`;

  // Read Pillar Pages
  const pillarPages = globSync('src/pages/*.astro').filter(file => {
    return !['index.astro', '404.astro', 'about.md', 'search.astro'].includes(path.basename(file));
  });

  pillarPages.forEach(file => {
    const slug = path.basename(file, '.astro');
    const fullPath = path.resolve(file);
    const text = fs.readFileSync(fullPath, 'utf8');
    const titleMatch = text.match(/title="([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : slug;
    content += `- [${title}](${SITE_URL}/${slug}/)\n`;
  });

  content += `\n## Knowledge Base Terms\n`;
  content += `- [Knowledge Base Index](${SITE_URL}/iceberg/)\n`;

  // Read Iceberg terms
  const terms = globSync('src/content/iceberg/*.md');
  terms.forEach(file => {
    const slug = path.basename(file, '.md');
    const fullPath = path.resolve(file);
    const text = fs.readFileSync(fullPath, 'utf8');
    const titleMatch = text.match(/title:\s*"?([^"\n]+)"?/);
    const title = titleMatch ? titleMatch[1] : slug;
    content += `- [${title}](${SITE_URL}/iceberg/${slug}/)\n`;
  });

  fs.writeFileSync('public/llms.txt', content);
  console.log('Successfully generated public/llms.txt');
}

generate();
