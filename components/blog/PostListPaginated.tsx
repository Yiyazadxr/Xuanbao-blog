"use client";

import { useSearchParams } from "next/navigation";
import { PostCard } from "@/components/blog/PostCard";
import { Pagination } from "@/components/ui/Pagination";
import type { PostListItem } from "@/lib/posts";

const PAGE_SIZE = 9;

// 客户端分页的文章列表：数据由服务端一次性给出（ISR 缓存），分页只在客户端切片，
// 页面 URL 的 ?page= 仅用于分享/回退定位，不触发服务端重新渲染
export function PostListPaginated({
  posts,
  basePath,
}: {
  posts: PostListItem[];
  basePath: string;
}) {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const current = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-20 text-center">
        <p className="text-lg font-medium">这里空空如也</p>
        <p className="mt-2 text-sm text-muted">没有找到符合条件的文章</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {current.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} basePath={basePath} />
    </>
  );
}
