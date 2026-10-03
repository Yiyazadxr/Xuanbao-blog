"use client";

import { useEffect, useState } from "react";
import { DISPLAY_CHANGE_EVENT, readReadingProgress } from "@/lib/display";

// 阅读进度条：固定在页面顶部，随滚动填充；可在显示设置中关闭
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const [enabled, setEnabled] = useState(true);

  // 初次渲染始终输出进度条（与 SSR 一致），水合后按本地偏好卸载；
  // 水合前的隐藏由预水合脚本写入的 html[data-reading-progress="off"] 完成
  useEffect(() => {
    Promise.resolve().then(() => setEnabled(readReadingProgress()));
    const onChange = () => setEnabled(readReadingProgress());
    window.addEventListener(DISPLAY_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(DISPLAY_CHANGE_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let ticking = false;
    let frame = 0;
    let disposed = false;
    const update = () => {
      if (disposed) return;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        frame = requestAnimationFrame(update);
      }
    };
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="reading-progress fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent">
      <div
        className="h-full bg-accent transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
