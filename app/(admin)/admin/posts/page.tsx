import type { Metadata } from "next";
import Link from "next/link";
import { AdminPostList } from "@/components/admin/AdminPostList";
import { Pagination } from "@/components/ui/Pagination";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "文章管理" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

// 文章管理列表：全部文章（含草稿），分页 + 批量操作
export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [posts, total, categories] = await Promise.all([
    prisma.post.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        published: true,
        archived: true,
        pinned: true,
        featured: true,
        publishedAt: true,
        updatedAt: true,
        viewCount: true,
        category: { select: { name: true } },
      },
    }),
    prisma.post.count(),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">文章管理</h1>
        <Link
          href="/admin/posts/new"
          className="inline-flex h-10 cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90"
        >
          写文章
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <AdminPostList posts={posts} categories={categories} />
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/posts" />
    </>
  );
}
