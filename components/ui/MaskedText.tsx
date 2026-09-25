"use client";

import { m } from "framer-motion";
import { EASE_DRAMATIC } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

export function MaskedText({
  text,
  delay = 0,
  stagger = 0.045,
  className,
}: {
  text: string;
  delay?: number;
  stagger?: number;
  className?: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const chars = [...text]; // 按 Unicode 码点拆分，中文/emoji 安全

  if (reduceMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {/* 屏幕阅读器读完整文本（role="text" 非标准，用 sr-only 方案）；动画字符层整体隐藏 */}
      <span className="sr-only">{text}</span>
      <span aria-hidden>
      {chars.map((char, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <m.span
            className="inline-block will-change-transform"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{
              duration: 0.9,
              delay: delay + i * stagger,
              ease: EASE_DRAMATIC,
            }}
          >
            {char === " " ? " " : char}
          </m.span>
        </span>
      ))}
      </span>
    </span>
  );
}

// 用于渐变文字（bg-clip-text 的元素内部不能再嵌套 transform 动画的子元素，否则 Chromium 下渐变不随字重绘）
export function MaskedLine({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = usePrefersReducedMotion();

  if (reduceMotion) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className="block overflow-hidden">
      <m.span
        className={`block will-change-transform ${className ?? ""}`}
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1, delay, ease: EASE_DRAMATIC }}
      >
        {children}
      </m.span>
    </span>
  );
}
