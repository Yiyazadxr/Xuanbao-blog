"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteAvatar, type SettingsState } from "@/app/settings/actions";

const initialState: SettingsState = { ok: false };

// 头像入口卡片：修改头像(跳转独立页) + 删除头像(无图禁用)
export function AvatarEntryCard({ image }: { image?: string | null }) {
  const router = useRouter();
  const [state, deleteAction, pending] = useActionState(deleteAvatar, initialState);
  const deleted = state.ok;

  useEffect(() => {
    if (deleted) router.refresh();
  }, [deleted, router]);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-accent">
      <span className="min-w-0">
        <span className="block font-medium">头像</span>
        <span className="mt-0.5 block text-xs text-muted">
          {image ? "已设置头像，支持更换" : "未设置头像，显示昵称首字"}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <Link
          href="/settings/avatar"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          修改
        </Link>
        {image ? (
          <button
            type="button"
            onClick={() => deleteAction()}
            disabled={pending}
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors duration-200 hover:border-red-400 hover:text-red-500 disabled:opacity-50"
          >
            {pending ? "删除中…" : "删除"}
          </button>
        ) : (
          <span className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted/40">
            删除
          </span>
        )}
      </span>
    </div>
  );
}
