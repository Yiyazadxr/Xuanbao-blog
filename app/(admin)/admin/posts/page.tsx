import type { Metadata } from "next";
import Link from "next/link";
import { PostRowActions } from "@/components/admin/PostRowActions";
import { Pagination } from "@/components/ui/Pagination";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "文章管理" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

// 文章管理列表：全部文章（含草稿），分页
export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: true },
    }),
    prisma.post.count(),
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
        {posts.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">还没有文章，点右上角「写文章」开始。</p>
        ) : (
          <ul className="divide-y divide-border">
            {posts.map((post) => (
              <li
                key={post.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="truncate font-medium transition-colors duration-200 hover:text-accent"
                    >
                      {post.title}
                    </Link>
                    {post.archived ? (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                        已归档
                      </span>
                    ) : post.published ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        已发布
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        草稿
                      </span>
                    )}
                    {post.pinned && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        置顶
                      </span>
                    )}
                    {post.featured && (
                      <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-600 dark:text-sky-400">
                        精选
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {post.category?.name ?? "无分类"} ·{" "}
                    {post.publishedAt ? `发布于 ${formatDate(post.publishedAt)}` : `更新于 ${formatDate(post.updatedAt)}`}{" "}
                    · {post.viewCount} 次浏览
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/posts/${post.id}/preview`}
                    className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
                  >
                    预览
                  </Link>
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
                  >
                    编辑
                  </Link>
                  <PostRowActions
                    id={post.id}
                    published={post.published}
                    pinned={post.pinned}
                    archived={post.archived}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/posts" />
    </>
  );
}
