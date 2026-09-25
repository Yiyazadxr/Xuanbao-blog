"use client";

import { useState, useTransition } from "react";
import { getMoreComments } from "@/app/(blog)/blog/actions";
import { CommentItem } from "@/components/comments/CommentItem";
import type { CommentWithReplies } from "@/lib/comments";

// 首批评论由 CommentSection 在客户端获取，后续分页按需追加。
export function CommentList({
  initialComments,
  topLevel,
  postId,
  slug,
  canModerate,
  currentUserId,
}: {
  initialComments: CommentWithReplies[];
  topLevel: number;
  postId: string;
  slug: string;
  canModerate: boolean;
  currentUserId: string | null;
}) {
  const [comments, setComments] = useState<CommentWithReplies[]>(initialComments);
  const [loading, startTransition] = useTransition();

  const hasMore = comments.length < topLevel;

  function loadMore() {
    startTransition(async () => {
      const res = await getMoreComments(postId, comments.length);
      if (res.ok) setComments((prev) => [...prev, ...res.comments]);
    });
  }

  return (
    <div>
      <ul className="mt-8 divide-y divide-border">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={postId}
            slug={slug}
            canModerate={canModerate}
            currentUserId={currentUserId}
          />
        ))}
      </ul>
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="cursor-pointer rounded-full border border-border px-5 py-2 text-sm font-medium text-muted transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {loading ? "加载中…" : "加载更多评论"}
          </button>
        </div>
      )}
    </div>
  );
}
