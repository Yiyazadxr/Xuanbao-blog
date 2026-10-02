"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/markdown";

// 高亮当前阅读小节：IntersectionObserver 监听各标题，取视口上部第一个相交者。
// 桌面 Sidebar 与移动端 MobileToc 共用，避免两份监听逻辑漂移。
export function useActiveHeading(toc: TocItem[]) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (toc.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      // 顶部导航占位 + 提前高亮
      { rootMargin: "-80px 0px -70% 0px" }
    );
    for (const item of toc) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [toc]);

  return activeId;
}
