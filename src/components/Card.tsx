import { slugifyStr } from "@utils/slugify";
import type { CollectionEntry } from "astro:content";

export interface Props {
  href?: string;
  frontmatter: Pick<
    CollectionEntry<"blog">["data"],
    "title" | "pubDatetime" | "modDatetime" | "description"
  >;
  secHeading?: boolean;
  readingTime?: string;
  tags?: string[];
}

export default function Card({
  href,
  frontmatter,
  secHeading = true,
  readingTime,
  tags,
}: Props) {
  const { title, pubDatetime, modDatetime, description } = frontmatter;

  const formattedDate = new Date(pubDatetime).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const headerProps = {
    style: { viewTransitionName: slugifyStr(title) },
    className:
      "text-lg font-bold text-skin-base hover:text-skin-accent transition-colors duration-200 line-clamp-2 leading-snug",
  };

  return (
    <li className="flex flex-col bg-white dark:bg-skin-card border border-skin-line rounded-xl p-6 transition-all duration-200 hover:-translate-y-[2px] hover:border-skin-accent hover:shadow-md h-full list-none">
      <div className="text-xs font-semibold text-skin-accent tracking-wider uppercase mb-3 flex items-center gap-1.5 opacity-90">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="inline"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>{readingTime || "5 MIN READ"}</span>
        {formattedDate && (
          <>
            <span className="mx-1.5 opacity-40">•</span>
            <span className="text-skin-base opacity-75 font-medium">
              {formattedDate}
            </span>
          </>
        )}
      </div>

      <a href={href} className="inline-block mb-3">
        {secHeading ? (
          <h2 {...headerProps}>{title}</h2>
        ) : (
          <h3 {...headerProps}>{title}</h3>
        )}
      </a>

      <p className="text-sm text-skin-base opacity-85 leading-relaxed flex-1 mb-5 line-clamp-3">
        {description}
      </p>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-skin-line/40">
          {tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-skin-card-muted/65 dark:bg-skin-card-muted/30 text-skin-base border border-skin-line/60"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}
