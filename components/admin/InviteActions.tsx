"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveRequest,
  createFreeInvite,
  deleteInvite,
  rejectRequest,
} from "@/app/(admin)/admin/actions";
import { successCls } from "@/components/ui/form-styles";

// 申请审批 + 邀请码操作按钮（客户端交互）
export function RequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const btnCls =
    "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await approveRequest(requestId);
              setMessage(result.message ?? result.error ?? "");
              router.refresh();
            })
          }
          className={`${btnCls} bg-accent/10 text-accent hover:bg-accent/20`}
        >
          生成邀请码
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await rejectRequest(requestId);
              router.refresh();
            })
          }
          className={`${btnCls} text-red-500 hover:bg-red-500/10`}
        >
          拒绝
        </button>
      </div>
      {message && <p className="max-w-60 text-right text-xs text-muted">{message}</p>}
    </div>
  );
}

// 生成通用邀请码按钮
export function CreateInviteButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await createFreeInvite();
            setMessage(result.message ?? result.error ?? "");
            router.refresh();
          })
        }
        className="inline-flex h-10 cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "生成中…" : "生成通用邀请码"}
      </button>
      {message && <p className={successCls}>{message}</p>}
    </div>
  );
}

// 删除未使用邀请码按钮
export function DeleteInviteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("确定删除这个邀请码吗？")) return;
        startTransition(async () => {
          await deleteInvite(id);
          router.refresh();
        });
      }}
      className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition-colors duration-200 hover:bg-red-500/10 disabled:opacity-50"
    >
      删除
    </button>
  );
}
