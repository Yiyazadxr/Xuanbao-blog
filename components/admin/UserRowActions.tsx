"use client";

import { useState } from "react";
import { deleteUser, updateUserRole } from "@/app/(admin)/admin/users/actions";
import { AdminActionButton } from "@/components/admin/AdminActionButton";

// 用户列表行操作：设为管理员 / 设为成员 / 删除（仅超级管理员可见此组件）
export function UserRowActions({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const [message, setMessage] = useState("");

  function handle(result: { ok: boolean; error?: string; message?: string }) {
    setMessage(result.ok ? "" : (result.error ?? "操作失败"));
  }

  return (
    <div className="flex items-center gap-1">
      {currentRole === "MEMBER" ? (
        <AdminActionButton
          variant="muted"
          action={() => updateUserRole(userId, "ADMIN")}
          onDone={handle}
        >
          设为管理员
        </AdminActionButton>
      ) : (
        <AdminActionButton
          variant="muted"
          action={() => updateUserRole(userId, "MEMBER")}
          onDone={handle}
        >
          设为成员
        </AdminActionButton>
      )}
      <AdminActionButton
        variant="danger"
        confirmText="确定删除该用户吗？其评论和点赞将一并删除，不可恢复。"
        action={() => deleteUser(userId)}
        onDone={handle}
      >
        删除
      </AdminActionButton>
      {message && <span className="text-xs text-red-500">{message}</span>}
    </div>
  );
}
