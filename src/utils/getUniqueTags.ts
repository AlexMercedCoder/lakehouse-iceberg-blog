import { slugifyStr } from "./slugify";
import type { CollectionEntry } from "astro:content";
import postFilter from "./postFilter";

interface Tag {
  tag: string;
  tagName: string;
}

/**
 * The tags across all posts, each with one display name.
 *
 * Posts spell the same tag inconsistently: "Agent Harnesses" in one and
 * "agent harnesses" in another. They slugify to the same tag, so one spelling
 * has to be chosen for the page title. This used to be whichever post the
 * collection happened to return first, which is not a decision so much as an
 * accident, and it changed when Astro changed how it orders entries.
 *
 * The spelling used by the most posts wins, with the alphabetically first as a
 * tiebreak. That is stable whatever order the posts arrive in, and it follows
 * the way the tag is actually written rather than one arbitrary post.
 */
const getUniqueTags = (posts: CollectionEntry<"blog">[]) => {
  const spellings = new Map<string, Map<string, number>>();

  for (const post of posts.filter(postFilter)) {
    for (const raw of post.data.tags) {
      const slug = slugifyStr(raw);
      const counts = spellings.get(slug) ?? new Map<string, number>();
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
      spellings.set(slug, counts);
    }
  }

  const tags: Tag[] = [...spellings.entries()].map(([tag, counts]) => {
    const tagName = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    )[0][0];
    return { tag, tagName };
  });

  return tags.sort((tagA, tagB) => tagA.tag.localeCompare(tagB.tag));
};

export default getUniqueTags;
