"use client";

import { Icon } from "@/components/ui/Icon";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toggleLike } from "@/app/(blog)/blog/actions";

// 点赞按钮：乐观更新，未登录时提示去登录
export function LikeButton({
  postId,
  slug,
  initialCount,
  initialLiked,
  isLoggedIn,
}: {
  postId: string;
  slug: string;
  initialCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState({ count: initialCount, liked: initialLiked });
  const [optimistic, applyOptimistic] = useOptimistic(
    state,
    (current, next: { count: number; liked: boolean }) => next
  );
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    startTransition(async () => {
      // 先乐观更新
      applyOptimistic({
        liked: !optimistic.liked,
        count: optimistic.count + (optimistic.liked ? -1 : 1),
      });
      const result = await toggleLike(postId, slug);
      if (result.ok && typeof result.count === "number") {
        setState({ count: result.count, liked: Boolean(result.liked) });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={optimistic.liked}
      aria-label={optimistic.liked ? "取消点赞" : "点赞"}
      className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        optimistic.liked
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-muted hover:border-accent hover:text-accent"
      }`}
    >
      <Icon
        icon={optimistic.liked ? "ph:heart-fill" : "ph:heart-bold"}
        width={18}
        height={18}
        aria-hidden
      />
      {optimistic.count > 0 ? optimistic.count : "点赞"}
    </button>
  );
}
