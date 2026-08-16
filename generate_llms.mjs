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

  content += `
## Events
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

  fs.writeFileSync('public/llms.txt', content);
  console.log('Successfully generated public/llms.txt');
}

generate();
