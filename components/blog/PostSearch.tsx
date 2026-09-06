"use client";

import { Icon } from "@/components/ui/Icon";
import Fuse from "fuse.js";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SearchIndexItem } from "@/lib/posts";
import { searchSnippet } from "@/lib/utils";

// 客户端全文搜索：Fuse.js 模糊匹配标题/正文纯文本，即时下拉展示，无服务端 LIKE 全表扫描
export function PostSearch({ index }: { index: SearchIndexItem[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // 惰性构建：仅在用户首次聚焦搜索框时构造索引，避免每次进入页面即付出 O(N·L) 开销
  const [fuse, setFuse] = useState<Fuse<SearchIndexItem> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const ensureFuse = () => {
    if (!fuse) {
      setFuse(new Fuse(index, { keys: ["title", "text"], threshold: 0.35, ignoreLocation: true }));
    }
  };

  const trimmed = query.trim();
  const results = fuse && trimmed
    ? fuse.search(trimmed).slice(0, 8).map((r) => r.item)
    : [];

  // 点击外部 / Escape 关闭下拉
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative w-full sm:w-72">
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="post-search" className="sr-only">
          搜索文章
        </label>
        <Icon
          icon="ph:magnifying-glass-bold"
          width={18}
          height={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          id="post-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            ensureFuse();
          }}
          onFocus={() => {
            setOpen(true);
            ensureFuse();
          }}
          placeholder="搜索文章…"
          className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm outline-none transition-colors duration-200 placeholder:text-muted focus:border-accent"
        />
      </form>

      {open && trimmed && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">没有找到相关文章</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((post) => {
                // 正文命中时展示关键词附近片段，否则回退到摘要
                const snippet = searchSnippet(post.text, trimmed) ?? post.excerpt;
                return (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 transition-colors duration-150 hover:bg-foreground/5"
                    >
                      <span className="block text-sm font-medium">{post.title}</span>
                      {snippet && (
                        <span className="mt-0.5 block truncate text-xs text-muted">{snippet}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
