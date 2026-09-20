"use client";

import { useEffect, useState } from "react";
import { BookmarkButton } from "@/components/blog/BookmarkButton";
import { LikeButton } from "@/components/blog/LikeButton";
import { ShareButton } from "@/components/blog/ShareButton";

type Engagement = {
  likeCount: number;
  liked: boolean;
  bookmarked: boolean;
  isLoggedIn: boolean;
};

// 点赞/收藏/分享栏：文章页 ISR 化后，个性化状态由客户端挂载时按需拉取。
// 加载期间渲染等尺寸的占位按钮，避免布局跳动。
export function EngagementBar({
  postId,
  slug,
  title,
}: {
  postId: string;
  slug: string;
  title: string;
}) {
  const [data, setData] = useState<Engagement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/posts/${encodeURIComponent(slug)}/engagement`)
      .then((r) => (r.ok ? (r.json() as Promise<Engagement>) : null))
      .then((d) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="mt-12 flex items-center justify-center gap-3">
      {data ? (
        <>
          <LikeButton
            postId={postId}
            slug={slug}
            initialCount={data.likeCount}
            initialLiked={data.liked}
            isLoggedIn={data.isLoggedIn}
          />
          <BookmarkButton
            postId={postId}
            initialBookmarked={data.bookmarked}
            isLoggedIn={data.isLoggedIn}
          />
        </>
      ) : (
        <>
          <span className="inline-flex h-11 w-24 animate-pulse rounded-full border border-border bg-surface" />
          <span className="inline-flex h-11 w-24 animate-pulse rounded-full border border-border bg-surface" />
        </>
      )}
      <ShareButton title={title} slug={slug} />
    </div>
  );
}
