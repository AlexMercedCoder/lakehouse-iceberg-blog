import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import getSortedPosts from "@utils/getSortedPosts";
import { SITE } from "@config";

export async function GET() {
  const posts = await getCollection("blog");
  const sortedPosts = getSortedPosts(posts);
  
  function generateSummary(content:any, length = 150) {
    return content.length > length ? content.slice(0, length) + '...' : content;
  }

  return rss({
    title: SITE.title,
    description: SITE.desc,
    site: SITE.website,
    items: sortedPosts.map(({ data, slug, body }) => ({
      link: `posts/${slug}/`,
      title: data.title,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
      description: generateSummary(body, 150),
      author: data.author,
      content:body,
    })),
  });
}
