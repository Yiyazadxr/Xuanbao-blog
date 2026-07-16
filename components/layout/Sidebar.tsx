"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/markdown";

// 浮动目录（TOC）：IntersectionObserver 高亮当前阅读的小节
export function Sidebar({ toc }: { toc: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

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

  if (toc.length === 0) return null;

  return (
    <nav aria-label="文章目录" className="sticky top-24">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        目录
      </p>
      <ul className="space-y-1 border-l border-border text-sm">
        {toc.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block border-l-2 py-1 pr-2 leading-snug transition-colors duration-200 ${
                item.level === 3 ? "pl-7" : "pl-4"
              } ${
                activeId === item.id
                  ? "-ml-px border-accent font-medium text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
