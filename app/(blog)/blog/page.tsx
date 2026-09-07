import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PostListPaginated } from "@/components/blog/PostListPaginated";
import { PostSearch } from "@/components/blog/PostSearch";
import { websiteOpenGraph } from "@/lib/metadata";
import { getCategoriesWithCount, getPosts, getSearchIndex } from "@/lib/posts";

const blogDescription = "浏览全部文章，支持全文模糊搜索与分类筛选";

export const metadata: Metadata = {
  title: "文章",
  description: blogDescription,
  openGraph: websiteOpenGraph("文章", blogDescription, "/blog"),
};
export const revalidate = 60;

// 文章列表页：服务端一次性取全部文章（ISR），分页在客户端完成 + 客户端模糊搜索
export default async function BlogPage() {
  const [{ posts, total }, categories, searchIndex] = await Promise.all([
    getPosts(),
    getCategoriesWithCount(),
    getSearchIndex(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">文章</h1>
          <p className="mt-3 text-muted">共 {total} 篇文章</p>
        </div>
        <PostSearch index={searchIndex} />
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
        <Suspense>
          <PostListPaginated posts={posts} basePath="/blog" />
        </Suspense>
      </div>
    </>
  );
}
