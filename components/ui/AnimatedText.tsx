"use client";

import { EASE_OUT } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// 悬停时旧字上滚出、新字上滚入，纯 CSS group-hover 双副本位移，零 JS 状态。
// 磁吸作用于整体胶囊、文字滚动作用于内容，同一鼠标事件驱动，分层不抢戏。
export function AnimatedText({
  text,
  className,
  duration = 750,
}: {
  text: string;
  className?: string;
  duration?: number;
}) {
  const reduceMotion = usePrefersReducedMotion();

  if (reduceMotion) {
    return <span className={className}>{text}</span>;
  }

  // inline style 而非 duration-[${}ms]：动态插值的 Tailwind 类名扫描不到
  // 缓动复用 EASE_OUT，与入场动画同一手感
  const transition = {
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: `cubic-bezier(${EASE_OUT.join(",")})`,
    willChange: "transform",
  } as const;

  return (
    <span className="relative inline-flex overflow-hidden">
      {/* 上层：默认显示，悬停时上滚出去 */}
      <span
        className={`transition-transform group-hover:-translate-y-[120%] ${className ?? ""}`}
        style={transition}
      >
        {text}
      </span>
      {/* 下层：默认在下方 120% 处，悬停时滚进来 */}
      <span
        aria-hidden
        className={`absolute inset-0 flex translate-y-[120%] items-center justify-center transition-transform group-hover:translate-y-0 ${className ?? ""}`}
        style={transition}
      >
        {text}
      </span>
    </span>
  );
}
