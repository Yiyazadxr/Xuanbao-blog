import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PostList } from "@/components/blog/PostList";
import { SearchBox } from "@/components/blog/SearchBox";
import { Pagination } from "@/components/ui/Pagination";
import { getCategoriesWithCount, getPosts } from "@/lib/posts";

export const metadata: Metadata = { title: "文章" };
export const dynamic = "force-dynamic";

// 文章列表页：分页 + ?q= 搜索 + 分类快捷入口
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const [{ posts, total, totalPages }, categories] = await Promise.all([
    getPosts({ page, q }),
    getCategoriesWithCount(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">文章</h1>
          <p className="mt-3 text-muted">
            {q ? `「${q}」的搜索结果，共 ${total} 篇` : `共 ${total} 篇文章`}
          </p>
        </div>
        <Suspense>
          <SearchBox />
        </Suspense>
      </div>

      {/* 分类快捷入口 + 归档 */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {categories
          .filter((c) => c.postCount > 0)
          .map((c) => (
            <Link
              key={c.id}
              href={`/blog/category/${c.slug}`}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
            >
              {c.name} · {c.postCount}
            </Link>
          ))}
        <Link
          href="/blog/archive"
          className="rounded-full border border-border px-4 py-1.5 text-sm text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          归档
        </Link>
      </div>

      <div className="mt-10">
        <PostList posts={posts} />
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/blog" searchParams={{ q }} />
    </>
  );
}
