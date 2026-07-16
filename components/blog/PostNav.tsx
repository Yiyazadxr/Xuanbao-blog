import { Icon } from "@iconify/react";
import Link from "next/link";

type AdjacentPost = { title: string; slug: string } | null;

// 文章底部：上一篇 / 下一篇导航
export function PostNav({ prev, next }: { prev: AdjacentPost; next: AdjacentPost }) {
  if (!prev && !next) return null;

  const cardCls =
    "group flex flex-col gap-1 rounded-2xl border border-border p-5 transition-colors duration-200 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  return (
    <nav aria-label="文章导航" className="mt-16 grid gap-4 sm:grid-cols-2">
      {prev ? (
        <Link href={`/blog/${prev.slug}`} rel="prev" className={cardCls}>
          <span className="flex items-center gap-1 text-xs text-muted">
            <Icon icon="ph:arrow-left-bold" width={14} height={14} aria-hidden />
            上一篇
          </span>
          <span className="font-medium leading-snug transition-colors duration-200 group-hover:text-accent">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div aria-hidden />
      )}
      {next && (
        <Link href={`/blog/${next.slug}`} rel="next" className={`${cardCls} sm:text-right`}>
          <span className="flex items-center gap-1 text-xs text-muted sm:justify-end">
            下一篇
            <Icon icon="ph:arrow-right-bold" width={14} height={14} aria-hidden />
          </span>
          <span className="font-medium leading-snug transition-colors duration-200 group-hover:text-accent">
            {next.title}
          </span>
        </Link>
      )}
    </nav>
  );
}
