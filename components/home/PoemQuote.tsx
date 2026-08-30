"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useRef, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { POEMS } from "@/lib/poems";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// 首页副标题：欢迎语 + 一句古诗文（同行展示），右侧小圆圈刷新按钮换下一句
// 悬停诗句超 500ms 以浮层方式展示出处（source），参考清浊（QingZuo）的设计
export function PoemQuote() {
  const reduceMotion = usePrefersReducedMotion();
  // 初始固定为 0，避免 SSR 与客户端 Math.random() 不一致导致水合警告；
  // 挂载后再随机选中一首
  const [index, setIndex] = useState(0);
  const [showSource, setShowSource] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poem = POEMS[index];

  // 首次挂载时选一句：需在客户端运行才能在 SSR 水合一致（等长两帧开销可忽略）。
  // 仅挂载后一次性随机，属「同步外部系统后的收尾」场景，故允许 effect 内 setState。
  useEffect(() => {
    setIndex(Math.floor(Math.random() * POEMS.length)); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const refresh = useCallback(() => {
    setIndex((prev) => {
      let next = Math.floor(Math.random() * POEMS.length);
      // 避免刷新后仍显示同一条
      while (next === prev) next = Math.floor(Math.random() * POEMS.length);
      return next;
    });
  }, []);

  function handleEnter() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShowSource(true), 500);
  }

  function handleLeave() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setShowSource(false);
  }

  return (
    <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">
      欢迎来到暄宝xr的个人博客网站
      <span className="ml-4 inline-flex min-w-0 items-baseline gap-1.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={index}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative inline-block min-w-0"
          >
            <span
              className="cursor-default text-accent"
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
              onFocus={handleEnter}
              onBlur={handleLeave}
            >
              <span className="mr-0.5">「</span>
              {poem.text}
              <span className="ml-0.5">」</span>
            </span>
            {/* 出处浮层：绝对定位、不占文档流，避免显示/隐藏导致布局回流把诗句挤离鼠标 */
            /* 从而触发 mouseleave 造成闪烁 */}
            <AnimatePresence>
              {showSource && (
                <motion.span
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: 4 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="pointer-events-none absolute left-0 top-full z-10 mt-1.5 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-muted/80 shadow-sm"
                >
                  —— {poem.source}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        </AnimatePresence>
        <button
          type="button"
          onClick={refresh}
          aria-label="换一句"
          title="换一句"
          className="-mb-0.5 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full align-baseline text-muted transition-colors duration-200 hover:text-accent"
        >
          <Icon icon="ph:arrows-clockwise-bold" width={13} height={13} aria-hidden />
        </button>
      </span>
    </p>
  );
}
