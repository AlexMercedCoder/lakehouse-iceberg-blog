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
 * The tiebreak is the entry id, which is the file path, because the filenames
 * carry an order the author meant: the March connector series runs from
 * connector-01 to connector-20 and should read in that sequence. Sorting on the
 * slug instead would put those in alphabetical order and scramble the series.
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
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
};

export default getSortedPosts;
