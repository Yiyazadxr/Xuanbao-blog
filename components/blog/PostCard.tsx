import Link from "next/link";
import type { PostListItem } from "@/lib/posts";
import { formatDate } from "@/lib/utils";

// 文章卡片：列表页/首页复用
export function PostCard({ post }: { post: PostListItem }) {
  return (
    <article className="group relative flex flex-col rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-foreground/5">
      <div className="flex items-center gap-3 text-xs text-muted">
        {post.category && (
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="relative z-10 rounded-full bg-accent/10 px-2.5 py-1 font-medium text-accent transition-colors duration-200 hover:bg-accent/20"
          >
            {post.category.name}
          </Link>
        )}
        <time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt)}</time>
        <span>约 {post.readingTime} 分钟</span>
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug tracking-tight">
        {/* 整卡可点：伪元素铺满卡片 */}
        <Link
          href={`/blog/${post.slug}`}
          className="after:absolute after:inset-0 after:rounded-2xl group-hover:text-accent transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {post.title}
        </Link>
      </h3>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
        {post.excerpt}
      </p>

      {post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map(({ tag }) => (
            <Link
              key={tag.id}
              href={`/blog/tag/${tag.slug}`}
              className="relative z-10 text-xs text-muted transition-colors duration-200 hover:text-accent"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
