"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// 后台行操作按钮统一封装：处理 pending、确认框、transition + router.refresh()，
// 消除各处重复的 btnCls + useTransition + router.refresh 样板代码
export type AdminActionResult = { ok: boolean; error?: string; message?: string };

const baseCls =
  "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-50";

const variantCls = {
  muted: "text-muted hover:bg-foreground/5 hover:text-foreground",
  danger: "text-red-500 hover:bg-red-500/10",
  accent: "bg-accent/10 text-accent hover:bg-accent/20",
  success:
    "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400",
} as const;

export function AdminActionButton({
  action,
  variant = "muted",
  confirmText,
  onDone,
  className,
  children,
}: {
  action: () => Promise<AdminActionResult>;
  variant?: keyof typeof variantCls;
  confirmText?: string;
  onDone?: (result: AdminActionResult) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      const result = await action();
      onDone?.(result);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={run}
      className={className ?? `${baseCls} ${variantCls[variant]}`}
    >
      {children}
    </button>
  );
}
