"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EASE_DRAMATIC } from "@/lib/motion";

// 首页进场幕布（学自 sondaven.com）：站名 + 百分比计数，随后幕布上滑揭开 Hero
// 每个会话只播一次（sessionStorage），reduced-motion 直接跳过
export function Preloader() {
  const [phase, setPhase] = useState<"loading" | "exiting" | "done">("loading");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId: number;
    const skip =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      sessionStorage.getItem("preloader-shown");

    if (skip) {
      rafId = requestAnimationFrame(() => setPhase("done"));
      return () => cancelAnimationFrame(rafId);
    }

    sessionStorage.setItem("preloader-shown", "1");
    const DURATION = 1100;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(100, Math.round(((now - start) / DURATION) * 100));
      setProgress(p);
      if (p < 100) {
        rafId = requestAnimationFrame(tick);
      } else {
        setPhase("exiting");
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (phase === "done") return null;

  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0b] text-[#fafaf9]"
      initial={false}
      animate={phase === "exiting" ? { y: "-100%" } : { y: "0%" }}
      transition={{ duration: 0.85, ease: EASE_DRAMATIC }}
      onAnimationComplete={() => {
        if (phase === "exiting") setPhase("done");
      }}
    >
      <span className="font-display text-2xl font-bold tracking-tight">暄宝xr</span>
      <span className="font-display mt-4 text-sm tabular-nums text-[#a1a1aa]">
        {progress}%
      </span>
    </motion.div>
  );
}
