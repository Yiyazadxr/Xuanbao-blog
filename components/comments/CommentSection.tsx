"use client";

import { useEffect, useState } from "react";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentList } from "@/components/comments/CommentList";
import type { CommentsPayload } from "@/lib/comment-types";

// 评论区：文章页 ISR 化后由客户端挂载时拉取首屏数据，后续分页在 CommentList 中加载。
// 日期字段经 JSON 序列化为字符串，展示层 formatDate 兼容 Date 与 string。
export function CommentSection({ postId, slug }: { postId: string; slug: string }) {
  return <Comments key={slug} postId={postId} slug={slug} />;
}

function Comments({ postId, slug }: { postId: string; slug: string }) {
  const [data, setData] = useState<CommentsPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/posts/${encodeURIComponent(slug)}/comments`, { signal: controller.signal, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("comments_fetch_failed");
        return r.json() as Promise<CommentsPayload>;
      })
      .then((d) => {
        if (!controller.signal.aborted) {
          setData(d);
          setVersion((value) => value + 1);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
    };
  }, [slug, attempt]);

  return (
    <section aria-label="评论区" className="mt-16 border-t border-border pt-10">
      <h2 className="text-xl font-bold tracking-tight">
        评论 {data && data.total > 0 ? `· ${data.total}` : ""}
      </h2>
      {failed ? (
        <div role="alert">
          <p>评论加载失败，请重试。</p>
          <button type="button" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>重新加载评论</button>
        </div>
      ) : data ? (
        <>
          <div className="mt-6">
            <CommentForm postId={postId} slug={slug} muteInfo={data.muteInfo} onDone={() => setAttempt((value) => value + 1)} />
          </div>
          {data.comments.length > 0 && (
            <CommentList
              key={version}
              initialComments={data.comments}
              topLevel={data.topLevel}
              postId={postId}
              slug={slug}
              canModerate={data.canModerate}
              currentUserId={data.currentUserId}
              onChanged={() => setAttempt((value) => value + 1)}
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
