"use client";

import { approveComment, deleteComment } from "@/app/(admin)/admin/comments/actions";
import { AdminActionButton } from "@/components/admin/AdminActionButton";

// 评论审核操作：通过 / 删除
export function CommentModerationActions({
  id,
  isApproved,
}: {
  id: string;
  isApproved: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {!isApproved && (
        <AdminActionButton variant="success" action={() => approveComment(id)}>
          通过
        </AdminActionButton>
      )}
      <AdminActionButton
        variant="danger"
        confirmText="确定删除这条评论吗？其下回复也会一并删除。"
        action={() => deleteComment(id)}
      >
        删除
      </AdminActionButton>
    </div>
  );
}
