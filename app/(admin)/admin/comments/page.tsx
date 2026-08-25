import type { Metadata } from "next";
import Link from "next/link";
import { CommentModerationActions } from "@/components/admin/CommentModerationActions";
import { Pagination } from "@/components/ui/Pagination";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "评论审核" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

// 评论审核：待审在前，已通过在后，分页
export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [comments, total, pendingCount] = await Promise.all([
    prisma.comment.findMany({
      orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { name: true, email: true } },
        post: { select: { title: true, slug: true } },
        parent: { select: { content: true, author: { select: { name: true } } } },
      },
    }),
    prisma.comment.count(),
    prisma.comment.count({ where: { isApproved: false } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">评论审核</h1>
      <p className="mt-2 text-sm text-muted">
        {pendingCount > 0 ? `${pendingCount} 条评论待审核` : "没有待审核的评论"}
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        {comments.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">还没有任何评论</p>
        ) : (
          <ul className="divide-y divide-border">
            {comments.map((comment) => (
              <li key={comment.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{comment.author.name}</span>
                    <span className="text-xs text-muted">{comment.author.email}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        comment.isApproved
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {comment.isApproved ? "已通过" : "待审核"}
                    </span>
                  </div>
                  {comment.parent && (
                    <p className="mt-2 truncate rounded-lg bg-foreground/5 px-3 py-1.5 text-xs text-muted">
                      回复 {comment.parent.author.name}：{comment.parent.content}
                    </p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {comment.content}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {formatDate(comment.createdAt)} · 评论于《
                    <Link
                      href={`/blog/${comment.post.slug}`}
                      className="transition-colors duration-200 hover:text-accent"
                    >
                      {comment.post.title}
                    </Link>
                    》
                  </p>
                </div>
                <CommentModerationActions id={comment.id} isApproved={comment.isApproved} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/comments" />
    </>
  );
}
