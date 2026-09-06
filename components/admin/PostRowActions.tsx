"use client";

import {
  deletePost,
  toggleArchive,
  togglePin,
  togglePublish,
} from "@/app/(admin)/admin/posts/actions";
import { AdminActionButton } from "@/components/admin/AdminActionButton";

// 文章列表行操作：置顶 / 发布切换 / 归档 / 删除（带确认）
export function PostRowActions({
  id,
  published,
  pinned,
  archived,
}: {
  id: string;
  published: boolean;
  pinned: boolean;
  archived: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <AdminActionButton variant="muted" action={() => togglePin(id)}>
        {pinned ? "取消置顶" : "置顶"}
      </AdminActionButton>
      <AdminActionButton variant="muted" action={() => togglePublish(id)}>
        {published ? "转草稿" : "发布"}
      </AdminActionButton>
      <AdminActionButton variant="muted" action={() => toggleArchive(id)}>
        {archived ? "取消归档" : "归档"}
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
