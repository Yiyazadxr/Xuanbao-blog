"use client";

import { useEffect, useState } from "react";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentList } from "@/components/comments/CommentList";
import type { CommentWithReplies } from "@/lib/comments";
import type { MuteInfo } from "@/lib/mute-types";

type CommentsPayload = {
  comments: CommentWithReplies[];
  topLevel: number;
  total: number;
  canModerate: boolean;
  currentUserId: string | null;
  muteInfo: MuteInfo | null;
};

// 评论区：文章页 ISR 化后由客户端挂载时拉取首屏数据，后续分页在 CommentList 中加载。
// 日期字段经 JSON 序列化为字符串，展示层 formatDate 兼容 Date 与 string。
export function CommentSection({ postId, slug }: { postId: string; slug: string }) {
  const [data, setData] = useState<CommentsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/posts/${encodeURIComponent(slug)}/comments`)
      .then((r) => (r.ok ? (r.json() as Promise<CommentsPayload>) : null))
      .then((d) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <section aria-label="评论区" className="mt-16 border-t border-border pt-10">
      <h2 className="text-xl font-bold tracking-tight">
        评论 {data && data.total > 0 ? `· ${data.total}` : ""}
      </h2>
      {data ? (
        <>
          <div className="mt-6">
            <CommentForm postId={postId} slug={slug} muteInfo={data.muteInfo} />
          </div>
          {data.comments.length > 0 && (
            <CommentList
              initialComments={data.comments}
              topLevel={data.topLevel}
              postId={postId}
              slug={slug}
              canModerate={data.canModerate}
              currentUserId={data.currentUserId}
            />
          )}
        </>
      ) : (
        <div className="mt-6 space-y-4" aria-hidden>
          <div className="h-24 animate-pulse rounded-xl bg-surface" />
          <div className="h-16 animate-pulse rounded-xl bg-surface" />
        </div>
      )}
    </section>
  );
}
