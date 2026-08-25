import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "管理后台" };
export const dynamic = "force-dynamic";

// 仪表盘：核心数据统计
export default async function AdminPage() {
  const [publishedCount, draftCount, pendingComments, pendingRequests, viewSum, userCount] =
    await Promise.all([
      prisma.post.count({ where: { published: true, archived: false } }),
      prisma.post.count({ where: { published: false, archived: false } }),
      prisma.comment.count({ where: { isApproved: false } }),
      prisma.accountRequest.count({ where: { status: "PENDING" } }),
      prisma.post.aggregate({ _sum: { viewCount: true } }),
      prisma.user.count(),
    ]);

  const stats = [
    { label: "已发布文章", value: publishedCount, href: "/admin/posts" },
    { label: "草稿", value: draftCount, href: "/admin/posts" },
    { label: "待审核评论", value: pendingComments, href: "/admin/comments" },
    { label: "待处理申请", value: pendingRequests, href: "/admin/invites" },
    { label: "总浏览量", value: viewSum._sum.viewCount ?? 0 },
    { label: "注册用户", value: userCount },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">仪表盘</h1>
        <Link
          href="/admin/posts/new"
          className="inline-flex h-10 cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90"
        >
          写文章
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const card = (
            <div className="rounded-2xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-accent">
              <p className="font-display text-3xl font-bold">{s.value}</p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {card}
            </Link>
          ) : (
            <div key={s.label}>{card}</div>
          );
        })}
      </div>
    </>
  );
}
