"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { LENIS_CONFIG } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// Lenis 平滑滚动：尊重手动「减少动效」开关与系统 reduced-motion，卸载时清理
export function SmoothScroll() {
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
  }, [reduceMotion]);

  return null;
}
