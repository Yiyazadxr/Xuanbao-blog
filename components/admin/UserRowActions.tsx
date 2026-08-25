"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteUser, updateUserRole } from "@/app/(admin)/admin/users/actions";

// 用户列表行操作：设为管理员 / 设为成员 / 删除（仅超级管理员可见此组件）
export function UserRowActions({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const btnCls =
    "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50";

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setMessage("");
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? "" : (result.error ?? "操作失败"));
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      {currentRole === "MEMBER" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => updateUserRole(userId, "ADMIN"))}
          className={`${btnCls} text-muted hover:bg-foreground/5 hover:text-foreground`}
        >
          设为管理员
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => updateUserRole(userId, "MEMBER"))}
          className={`${btnCls} text-muted hover:bg-foreground/5 hover:text-foreground`}
        >
          设为成员
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("确定删除该用户吗？其评论和点赞将一并删除，不可恢复。")) return;
          run(() => deleteUser(userId));
        }}
        className={`${btnCls} text-red-500 hover:bg-red-500/10`}
      >
        删除
      </button>
      {message && <span className="text-xs text-red-500">{message}</span>}
    </div>
  );
}
