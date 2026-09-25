"use client";

import { useState, useTransition } from "react";
import { getMoreComments } from "@/app/(blog)/blog/actions";
import { CommentItem } from "@/components/comments/CommentItem";
import type { CommentCursor, CommentWithReplies } from "@/lib/comment-types";

// 首批评论由 CommentSection 在客户端获取，后续分页按需追加。
export function CommentList({
  initialComments,
  initialCursor,
  postId,
  slug,
  canModerate,
  currentUserId,
  onChanged,
}: {
  initialComments: CommentWithReplies[];
  initialCursor: CommentCursor | null;
  postId: string;
  slug: string;
  canModerate: boolean;
  currentUserId: string | null;
  onChanged: () => void;
}) {
  const [comments, setComments] = useState<CommentWithReplies[]>(initialComments);
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [cursor, setCursor] = useState(initialCursor);
  const hasMore = cursor !== null;

  function loadMore() {
    if (loading || !cursor) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await getMoreComments(postId, cursor);
        if (res.ok) {
          setComments((prev) => [...prev, ...res.comments.filter((item) => !prev.some((old) => old.id === item.id))]);
          setCursor(res.nextCursor ?? null);
        }
        else setError(res.error ?? "评论加载失败，请重试");
      } catch {
        setError("评论加载失败，请重试");
      }
    });
  }

  return (
    <div>
      {error && <p role="alert">{error}</p>}
      <ul className="mt-8 divide-y divide-border">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={postId}
            slug={slug}
            canModerate={canModerate}
             currentUserId={currentUserId}
             onChanged={onChanged}
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
