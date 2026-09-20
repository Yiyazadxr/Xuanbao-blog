"use client";

import { useEffect } from "react";

// 浏览埋点：文章页 ISR 化后，浏览量 +1 / 阅读记录改由客户端挂载时上报。
// 模块级 Set 避免 StrictMode 双挂载与同一会话内反复进出造成的重复计数。
const reported = new Set<string>();

export function ViewTracker({
  postId,
  slug,
  wordCount,
}: {
  postId: string;
  slug: string;
  wordCount: number | null;
}) {
  useEffect(() => {
    if (reported.has(postId)) return;
    reported.add(postId);
    void fetch(`/api/posts/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, wordCount }),
    }).catch(() => {
      // 上报失败允许下次重试
      reported.delete(postId);
    });
  }, [postId, slug, wordCount]);

  return null;
}
