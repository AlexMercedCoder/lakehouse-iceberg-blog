import type { CollectionEntry } from "astro:content";
import postFilter from "./postFilter";

/**
 * Newest first, with a deterministic tiebreak.
 *
 * Sorting on the timestamp alone leaves posts published at the same moment in
 * whatever order the collection happened to return, which is not something to
 * rely on: two posts dated 2026-07-13T09:00:00Z swapped places, and pages, when
 * Astro changed how it orders collection entries.
 *
 * The tiebreak is the file path, because the filenames carry an order the
 * author meant: the March connector series runs from connector-01 to
 * connector-20 and should read in that sequence. The id used to be that path,
 * but under the Content Layer it is the frontmatter slug, which drops the
 * numbering and would scramble the series, so filePath is read directly.
 *
 * The comparison is byte-wise rather than localeCompare, which reproduces the
 * order these posts have always been published in. localeCompare ignores case,
 * and would have moved a post whose filename starts with a capital.
 */
const getSortedPosts = (posts: CollectionEntry<"blog">[]) => {
  return posts.filter(postFilter).sort((a, b) => {
    const at = Math.floor(
      new Date(a.data.modDatetime ?? a.data.pubDatetime).getTime() / 1000
    );
    const bt = Math.floor(
      new Date(b.data.modDatetime ?? b.data.pubDatetime).getTime() / 1000
    );
    if (bt !== at) return bt - at;
    const ap = a.filePath ?? a.id;
    const bp = b.filePath ?? b.id;
    return ap < bp ? -1 : ap > bp ? 1 : 0;
  });
};

export default getSortedPosts;
