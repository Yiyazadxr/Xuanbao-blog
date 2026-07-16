"use client";

import { Icon } from "@iconify/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// 文章搜索框：提交后以 ?q= 刷新列表页
export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/blog?q=${encodeURIComponent(q)}` : "/blog");
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="relative w-full sm:w-72">
      <label htmlFor="post-search" className="sr-only">
        搜索文章
      </label>
      <Icon
        icon="ph:magnifying-glass-bold"
        width={18}
        height={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        id="post-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜索文章…"
        className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm outline-none transition-colors duration-200 placeholder:text-muted focus:border-accent"
      />
    </form>
  );
}
