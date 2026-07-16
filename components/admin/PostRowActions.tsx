"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deletePost, togglePublish } from "@/app/(admin)/admin/actions";

// 文章列表行操作：发布切换 / 删除（带确认）
export function PostRowActions({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const btnCls =
    "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await togglePublish(id);
            router.refresh();
          })
        }
        className={`${btnCls} text-muted hover:bg-foreground/5 hover:text-foreground`}
      >
        {published ? "转草稿" : "发布"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("确定删除这篇文章吗？该操作不可恢复。")) return;
          startTransition(async () => {
            await deletePost(id);
            router.refresh();
          });
        }}
        className={`${btnCls} text-red-500 hover:bg-red-500/10`}
      >
        删除
      </button>
    </div>
  );
}
