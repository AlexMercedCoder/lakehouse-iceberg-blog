import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const blog = await getCollection('blog');

  function generateSummary(content, length = 150) {
    return content.length > length ? content.slice(0, length) + '...' : content;
  }

  return rss({
    title: 'Alex\'s Apache Iceberg Blog',
    description: 'Alex Merced writes about the Data Lakehouse and Apache Iceberg',
    site: context.site,
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDatetime,
      description: generateSummary(post.body, 150),
      author: post.data.author,
      category: post.data.category,
      link: `/blog/${post.slug}/`,
      content: post.body,
    })),
  });
}