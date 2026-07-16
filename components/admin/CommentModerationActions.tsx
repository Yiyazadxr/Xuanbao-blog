"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { approveComment, deleteComment } from "@/app/(admin)/admin/actions";

// 评论审核操作：通过 / 删除
export function CommentModerationActions({
  id,
  isApproved,
}: {
  id: string;
  isApproved: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const btnCls =
    "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50";

  return (
    <div className="flex shrink-0 items-center gap-1">
      {!isApproved && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await approveComment(id);
              router.refresh();
            })
          }
          className={`${btnCls} bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400`}
        >
          通过
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("确定删除这条评论吗？其下回复也会一并删除。")) return;
          startTransition(async () => {
            await deleteComment(id);
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
