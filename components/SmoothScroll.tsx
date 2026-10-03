"use client";

import Lenis from "lenis";
import { useEffect, useState } from "react";
import { DISPLAY_CHANGE_EVENT, readSmoothScroll } from "@/lib/display";
import { LENIS_CONFIG } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// Lenis 平滑滚动：尊重手动「减少动效」开关与系统 reduced-motion，
// 并可在显示设置中关闭（监听偏好变更事件即时生效），卸载时清理
export function SmoothScroll() {
  const reduceMotion = usePrefersReducedMotion();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // 异步后置 setState，遵守 React Compiler 对 effect 体的同步约束
    Promise.resolve().then(() => setEnabled(readSmoothScroll()));
    const onChange = () => setEnabled(readSmoothScroll());
    window.addEventListener(DISPLAY_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(DISPLAY_CHANGE_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!enabled || reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    const lenis = new Lenis(LENIS_CONFIG);
    let rafId: number;
    const loop = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [enabled, reduceMotion]);

  return null;
}
