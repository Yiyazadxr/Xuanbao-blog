import Link from "next/link";

import type { TopPostStat } from "@/lib/stats";
import { formatCount } from "@/lib/utils";

// 热门文章排行：横向条形图，条长按浏览量占比（入场用 CSS scaleX 动画，无需 JS）
export function TopPostsRank({ posts }: { posts: TopPostStat[] }) {
  if (posts.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">还没有已发布的文章</p>;
  }

  const max = Math.max(...posts.map((p) => p.viewCount), 1);

  return (
    <ol className="space-y-3.5">
      {posts.map((p, i) => (
        <li key={p.id}>
          <div className="flex items-baseline gap-3">
            <span className="w-4 shrink-0 text-xs text-muted tabular-nums">{i + 1}</span>
            <Link
              href={`/blog/${p.slug}`}
              className="min-w-0 flex-1 truncate text-sm font-medium transition-colors duration-200 hover:text-accent"
            >
              {p.title}
            </Link>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatCount(p.viewCount)}
            </span>
          </div>
          <div className="mt-1.5 ml-7 h-1.5 overflow-hidden rounded-full bg-foreground/5">
            <div
              className="animate-grow-x h-full rounded-full bg-accent"
              style={{ width: `${Math.max(2, (p.viewCount / max) * 100)}%` }}
            />
          </div>
          <p className="mt-1 ml-7 text-xs text-muted tabular-nums">
            评论 {formatCount(p.comments)} · 点赞 {formatCount(p.likes)}
          </p>
        </li>
      ))}
    </ol>
  );
}
