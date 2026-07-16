import type { Metadata } from "next";

export const metadata: Metadata = { title: "评论审核" };
export const dynamic = "force-dynamic";

// 占位页：Phase 5 实现评论系统后填充审核列表
export default function AdminCommentsPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">评论审核</h1>
      <p className="mt-3 text-muted">评论系统尚未上线（Phase 5），上线后此处显示待审核评论。</p>
    </>
  );
}
