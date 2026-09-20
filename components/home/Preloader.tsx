"use client";

import { m } from "framer-motion";
import { useEffect, useState } from "react";
import { EASE_DRAMATIC } from "@/lib/motion";

// 进站加载动画：简洁克制（大厂风），站名 + 细读条，随后上滑揭幕
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
    const DURATION = 900;
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
    <m.div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
      initial={false}
      animate={phase === "exiting" ? { y: "-100%" } : { y: "0%" }}
      transition={{ duration: 0.7, ease: EASE_DRAMATIC }}
      onAnimationComplete={() => {
        if (phase === "exiting") setPhase("done");
      }}
    >
      <span className="text-base font-semibold tracking-tight text-foreground">
        Xuanbao<span className="text-accent">.</span>dev
      </span>
      {/* 细读条 */}
      <span className="mt-4 block h-px w-32 overflow-hidden bg-foreground/10">
        <span
          className="block h-full bg-accent transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </span>
    </m.div>
  );
}
