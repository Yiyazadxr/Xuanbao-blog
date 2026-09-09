"use client";

import Fuse from "fuse.js";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { PostCard } from "@/components/blog/PostCard";
import { PostGridSkeleton } from "@/components/blog/PostCardSkeleton";
import { PostListPaginated } from "@/components/blog/PostListPaginated";
import { PostSearch } from "@/components/blog/PostSearch";
import type { PostListItem, SearchIndexItem } from "@/lib/posts";
import { searchSnippet } from "@/lib/utils";

type CategoryEntry = { id: string; name: string; slug: string; postCount: number };

// 文章列表页主体（客户端）：搜索框输入 → 下方网格就地过滤出匹配文章，
// 标题命中高亮关键词，正文命中在摘要位置展示关键词前后片段（取首个出现位置）。
// 无搜索时回退到 PostListPaginated 的 URL 分页。
export function BlogPostsClient({
  posts,
  categories,
  searchIndex,
}: {
  posts: PostListItem[];
  categories: CategoryEntry[];
  searchIndex: SearchIndexItem[];
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const fuse = useMemo(
    () => new Fuse(searchIndex, { keys: ["title", "text"], threshold: 0.35, ignoreLocation: true }),
    [searchIndex]
  );

  // slug → PostListItem 反查表：O(1) 取回完整卡片数据，避免 matched.map 内 O(N²) find
  const postsBySlug = useMemo(() => new Map(posts.map((p) => [p.slug, p])), [posts]);

  const matched = trimmed ? fuse.search(trimmed).slice(0, 50).map((r) => r.item) : [];

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">文章</h1>
          <p className="mt-3 text-muted">
            {trimmed ? `找到 ${matched.length} 篇文章` : `共 ${posts.length} 篇文章`}
          </p>
        </div>
        <PostSearch value={query} onChange={setQuery} />
      </div>

      {/* 分类快捷入口 + 归档 */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {categories
          .filter((c) => c.postCount > 0)
          .map((c) => (
            <Link
              key={c.id}
              href={`/blog/category/${c.slug}`}
              className="rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
            >
              {c.name} · {c.postCount}
            </Link>
          ))}
        <Link
          href="/blog/archive"
          className="rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          归档
        </Link>
      </div>

      <div className="mt-10">
        {trimmed ? (
          matched.length > 0 ? (
            <div className="cover-grid-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {matched.map((m) => {
                const post = postsBySlug.get(m.slug);
                if (!post) return null;
                const snippet = searchSnippet(m.text, trimmed);
                return (
                  <PostCard key={post.id} post={post} searchQuery={trimmed} snippet={snippet} />
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center">
              <p className="text-lg font-medium">没有找到相关文章</p>
              <p className="mt-2 text-sm text-muted">换个关键词试试</p>
            </div>
          )
        ) : (
          <Suspense fallback={<PostGridSkeleton />}>
            <PostListPaginated posts={posts} basePath="/blog" />
          </Suspense>
        )}
      </div>
    </>
  );
}
