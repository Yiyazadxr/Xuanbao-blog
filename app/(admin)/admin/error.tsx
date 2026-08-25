"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("后台页面错误：", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <h2 className="text-xl font-bold tracking-tight">后台出错了</h2>
      <p className="mt-2 text-sm text-muted">{error.message || "未知错误"}</p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-accent px-6 text-sm font-semibold text-accent-foreground transition-colors duration-200 hover:opacity-90"
        >
          重试
        </button>
        <Link
          href="/admin"
          className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-border px-6 text-sm font-semibold transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          返回后台
        </Link>
      </div>
    </div>
  );
}
