"use client";

import { deletePost, togglePublish } from "@/app/(admin)/admin/actions";
import { AdminActionButton } from "@/components/admin/AdminActionButton";

// 文章列表行操作：发布切换 / 删除（带确认）
export function PostRowActions({ id, published }: { id: string; published: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <AdminActionButton variant="muted" action={() => togglePublish(id)}>
        {published ? "转草稿" : "发布"}
      </AdminActionButton>
      <AdminActionButton
        variant="danger"
        confirmText="确定删除这篇文章吗？该操作不可恢复。"
        action={() => deletePost(id)}
      >
        删除
      </AdminActionButton>
    </div>
  );
}
