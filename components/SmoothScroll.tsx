"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { LENIS_CONFIG } from "@/lib/motion";

// Lenis 平滑滚动：尊重 reduced-motion，卸载时清理
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
  }, []);

  return null;
}
