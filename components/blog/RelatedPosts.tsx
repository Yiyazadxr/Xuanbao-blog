import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import type { PostListItem } from "@/lib/posts";
import { formatDate } from "@/lib/utils";

export function RelatedPosts({ posts }: { posts: PostListItem[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-display text-lg font-semibold tracking-tight">相关阅读</h2>
      <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-200 hover:bg-foreground/5"
          >
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium leading-snug transition-colors duration-200 group-hover:text-accent">
                {post.title}
              </h3>
              <p className="mt-1 text-xs text-muted">
                {post.category ? `${post.category.name} · ` : ""}
                {formatDate(post.createdAt)} · 约 {post.readingTime} 分钟阅读
              </p>
            </div>
            <Icon
              icon="ph:arrow-right-bold"
              width={16}
              height={16}
              aria-hidden
              className="shrink-0 text-muted transition-colors duration-200 group-hover:text-accent"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
