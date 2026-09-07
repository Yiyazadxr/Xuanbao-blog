"use client";

import { Icon } from "@/components/ui/Icon";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toggleBookmark } from "@/app/(blog)/blog/actions";

// 收藏按钮：乐观更新，未登录时提示去登录
export function BookmarkButton({
  postId,
  initialBookmarked,
  isLoggedIn,
}: {
  postId: string;
  initialBookmarked: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialBookmarked);
  const [optimistic, applyOptimistic] = useOptimistic(state, (_current, next: boolean) => next);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    startTransition(async () => {
      applyOptimistic(!optimistic);
      const result = await toggleBookmark(postId);
      if (result.ok && typeof result.bookmarked === "boolean") {
        setState(result.bookmarked);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={optimistic}
      aria-label={optimistic ? "取消收藏" : "收藏"}
      className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        optimistic
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-muted hover:border-accent hover:text-accent"
      }`}
    >
      <Icon
        icon={optimistic ? "ph:bookmark-simple-fill" : "ph:bookmark-simple-bold"}
        width={18}
        height={18}
        aria-hidden
      />
      {optimistic ? "已收藏" : "收藏"}
    </button>
  );
}
