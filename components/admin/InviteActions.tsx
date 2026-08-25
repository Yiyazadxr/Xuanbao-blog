"use client";

import { useState } from "react";
import {
  approveRequest,
  createFreeInvite,
  deleteInvite,
  rejectRequest,
} from "@/app/(admin)/admin/actions";
import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { successCls } from "@/components/ui/form-styles";

// 申请审批 + 邀请码操作按钮（客户端交互）
export function RequestActions({ requestId }: { requestId: string }) {
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-1">
        <AdminActionButton
          variant="accent"
          action={() => approveRequest(requestId)}
          onDone={(r) => setMessage(r.message ?? r.error ?? "")}
        >
          生成邀请码
        </AdminActionButton>
        <AdminActionButton variant="danger" action={() => rejectRequest(requestId)}>
          拒绝
        </AdminActionButton>
      </div>
      {message && <p className="max-w-60 text-right text-xs text-muted">{message}</p>}
    </div>
  );
}

// 生成通用邀请码按钮（独立胶囊样式，保留自定义外观）
export function CreateInviteButton() {
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col items-end gap-2">
      <AdminActionButton
        variant="muted"
        action={() => createFreeInvite()}
        onDone={(r) => setMessage(r.message ?? r.error ?? "")}
        className="inline-flex h-10 cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
      >
        生成通用邀请码
      </AdminActionButton>
      {message && <p className={successCls}>{message}</p>}
    </div>
  );
}

// 删除未使用邀请码按钮
export function DeleteInviteButton({ id }: { id: string }) {
  return (
    <AdminActionButton
      variant="danger"
      confirmText="确定删除这个邀请码吗？"
      action={() => deleteInvite(id)}
    >
      删除
    </AdminActionButton>
  );
}
