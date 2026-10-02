"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import type Fuse from "fuse.js";
import { PostCard } from "@/components/blog/PostCard";
import { PostGridSkeleton } from "@/components/blog/PostCardSkeleton";
import { PostListPaginated } from "@/components/blog/PostListPaginated";
import { PostSearch } from "@/components/blog/PostSearch";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PostListItem, SearchIndexItem } from "@/lib/posts";
import { searchSnippet } from "@/lib/utils";

type CategoryEntry = { id: string; name: string; slug: string; postCount: number };
type SearchEntry = Omit<SearchIndexItem, "createdAt"> & { createdAt: string };

// 搜索索引和 fuse.js 首次输入时并行加载，避免进入列表首包。
let fusePromise: Promise<typeof import("fuse.js")> | null = null;
let indexPromise: Promise<SearchEntry[]> | null = null;

function loadFuse() {
  fusePromise ??= import("fuse.js");
  fusePromise = fusePromise.catch((error: unknown) => {
    fusePromise = null;
    throw error;
  });
  return fusePromise;
}

function loadSearchIndex() {
  indexPromise ??= fetch("/api/search-index")
    .then(async (r) => {
      if (!r.ok) throw new Error("SEARCH_LOAD_FAILED");
      return (await r.json()) as SearchEntry[];
    })
    .catch((error: unknown) => {
      // 失败不留缓存，下次输入重试
      indexPromise = null;
      throw error;
    });
  return indexPromise;
}

export function BlogPostsClient({
  posts,
  total,
  categories,
}: {
  posts: PostListItem[];
  total: number;
  categories: CategoryEntry[];
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const [fuse, setFuse] = useState<Fuse<SearchEntry> | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [retry, setRetry] = useState(0);
  const requestId = useRef(0);

  // 模块级 Promise 保证资源只加载一次。
  useEffect(() => {
    if (!trimmed || fuse) return;
    let cancelled = false;
    const id = ++requestId.current;
    void Promise.all([loadFuse(), loadSearchIndex()]).then(([mod, entries]) => {
      if (cancelled || id !== requestId.current) return;
      const FuseCtor = mod.default;
      setSearchError(false);
      setFuse(
        new FuseCtor(entries, { keys: ["title", "text"], threshold: 0.35, ignoreLocation: true })
      );
    }).catch(() => {
      if (!cancelled && id === requestId.current) setSearchError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [trimmed, fuse, retry]);

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
                 : searchError ? "搜索加载失败" : "正在加载搜索…"
              : `共 ${total} 篇文章`}
          </p></div>
        <PostSearch value={query} onChange={setQuery} />
      </div>

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
          searchError ? (
            <div role="alert">
              <p>搜索加载失败，请稍后重试</p>
              <button type="button" onClick={() => { setSearchError(false); setRetry((value) => value + 1); }}>重新加载</button>
            </div>
          ) : !fuse ? (
            <PostGridSkeleton />
          ) : matched.length > 0 ? (
            <div className="cover-grid-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {matched.map((m) => {
                const snippet = searchSnippet(m.text, trimmed);
                return (
                  <PostCard
                    key={m.id}
                    post={{ ...m, createdAt: new Date(m.createdAt) }}
                    searchQuery={trimmed}
                    snippet={snippet}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState size="lg" title="没有找到相关文章" description="换个关键词试试" />
          )
        ) : (
          <Suspense fallback={<PostGridSkeleton />}>
            <PostListPaginated posts={posts} total={total} basePath="/blog" serverPaginated />
          </Suspense>
        )}
      </div>
    </>
  );
}
