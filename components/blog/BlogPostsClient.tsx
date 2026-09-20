"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type Fuse from "fuse.js";
import { PostCard } from "@/components/blog/PostCard";
import { PostGridSkeleton } from "@/components/blog/PostCardSkeleton";
import { PostListPaginated } from "@/components/blog/PostListPaginated";
import { PostSearch } from "@/components/blog/PostSearch";
import type { PostListItem, SearchIndexItem } from "@/lib/posts";
import { searchSnippet } from "@/lib/utils";

type CategoryEntry = { id: string; name: string; slug: string; postCount: number };
type SearchEntry = Pick<SearchIndexItem, "slug" | "title" | "excerpt" | "text">;

// 搜索资源按需加载：索引走 /api/search-index（ISR 缓存），fuse.js 动态 import，
// 避免把全站正文与搜索库打进 /blog 的首包；用户首次输入时才触发加载。
let fusePromise: Promise<typeof import("fuse.js")> | null = null;
let indexPromise: Promise<SearchEntry[]> | null = null;

function loadFuse() {
  fusePromise ??= import("fuse.js");
  return fusePromise;
}

function loadSearchIndex() {
  indexPromise ??= fetch("/api/search-index")
    .then((r) => (r.ok ? (r.json() as Promise<SearchEntry[]>) : []))
    .catch(() => {
      // 失败不留缓存，下次输入重试
      indexPromise = null;
      return [];
    });
  return indexPromise;
}

// 文章列表页主体（客户端）：搜索框输入 → 下方网格就地过滤出匹配文章，
// 标题命中高亮关键词，正文命中在摘要位置展示关键词前后片段（取首个出现位置）。
// 无搜索时回退到 PostListPaginated 的 URL 分页。
export function BlogPostsClient({
  posts,
  categories,
}: {
  posts: PostListItem[];
  categories: CategoryEntry[];
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const [fuse, setFuse] = useState<Fuse<SearchEntry> | null>(null);
  const requestId = useRef(0);

  // 首次输入时并行拉取索引与 fuse.js（模块级缓存，只加载一次）
  useEffect(() => {
    if (!trimmed || fuse) return;
    let cancelled = false;
    const id = ++requestId.current;
    void Promise.all([loadFuse(), loadSearchIndex()]).then(([mod, entries]) => {
      if (cancelled || id !== requestId.current) return;
      const FuseCtor = mod.default;
      setFuse(
        new FuseCtor(entries, { keys: ["title", "text"], threshold: 0.35, ignoreLocation: true })
      );
    });
    return () => {
      cancelled = true;
    };
  }, [trimmed, fuse]);

  // slug → PostListItem 反查表：O(1) 取回完整卡片数据，避免 matched.map 内 O(N²) find
  const postsBySlug = useMemo(() => new Map(posts.map((p) => [p.slug, p])), [posts]);

  const matched = trimmed && fuse ? fuse.search(trimmed).slice(0, 50).map((r) => r.item) : [];

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">文章</h1>
          <p className="mt-3 text-muted">
            {trimmed
              ? fuse
                ? `找到 ${matched.length} 篇文章`
                : "正在加载搜索…"
              : `共 ${posts.length} 篇文章`}
          </p></div>
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
          !fuse ? (
            <PostGridSkeleton />
          ) : matched.length > 0 ? (
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
