"use client";

import { EASE_OUT } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

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
  // 缓动与入场动画一致。
  const transition = {
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: `cubic-bezier(${EASE_OUT.join(",")})`,
    willChange: "transform",
  } as const;

  return (
    <span className="relative inline-flex overflow-hidden">
      <span
        className={`transition-transform group-hover:-translate-y-[120%] ${className ?? ""}`}
        style={transition}
      >
        {text}
      </span>
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
