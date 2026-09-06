"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { restorePostRevision } from "@/app/(admin)/admin/posts/actions";
import { formatDate, formatRelativeTime, plainExcerpt } from "@/lib/utils";

type Revision = {
  id: string;
  title: string;
  content: string;
  published: boolean;
  archived: boolean;
  createdAt: Date;
};

// 版本历史列表：展示历史版本（标题 + 内容摘要 + 状态 + 时间）并支持回滚
export function RevisionList({ revisions }: { revisions: Revision[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function restore(id: string) {
    if (!window.confirm("确定回滚到该版本吗？当前内容会先保存为一个新版本。")) return;
    startTransition(async () => {
      await restorePostRevision(id);
      router.refresh();
    });
  }

  if (revisions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">
        暂无历史版本，保存文章后会自动记录
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
      {revisions.map((r) => {
        const status = r.archived ? "已归档" : r.published ? "已发布" : "草稿";
        return (
          <li
            key={r.id}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{r.title}</p>
                <span className="shrink-0 rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-muted">
                  {status}
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-muted">
                {plainExcerpt(r.content, 60)}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {formatDate(r.createdAt)} · {formatRelativeTime(r.createdAt)}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => restore(r.id)}
              className="shrink-0 cursor-pointer rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors duration-200 hover:bg-accent/20 disabled:opacity-50"
            >
              回滚到此版本
            </button>
          </li>
        );
      })}
    </ul>
  );
}
