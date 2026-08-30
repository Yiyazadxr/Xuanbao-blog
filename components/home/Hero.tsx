"use client";

import { Icon } from "@/components/ui/Icon";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRef } from "react";
import { PoemQuote } from "@/components/home/PoemQuote";
import { EASE_OUT } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { MaskedLine, MaskedText } from "@/components/ui/MaskedText";

// 首页顶部欢迎区
export function Hero() {
  const reduceMotion = usePrefersReducedMotion();
  const glowRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  // 登录后显示用户昵称，未登录显示朋友
  const displayName = session?.user?.name ?? "朋友";

  // 鼠标跟随光晕：直接写 transform，不触发 React 重渲染；首次移动前保持透明
  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (reduceMotion || !glowRef.current) return;
    const { left, top } = e.currentTarget.getBoundingClientRect();
    glowRef.current.style.opacity = "0.4";
    glowRef.current.style.transform = `translate(${e.clientX - left - 200}px, ${
      e.clientY - top - 200
    }px)`;
  }

  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay: 0.1 * i, ease: EASE_OUT },
    }),
  };

  return (
    <section
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden text-foreground"
    >
      {/* 淡雅背景光斑 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-blob-a absolute -top-1/3 left-[8%] size-[40vmax] rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_65%)]" />
        <div className="animate-blob-b absolute right-[-12%] bottom-[-20%] size-[36vmax] rounded-full bg-[radial-gradient(circle,var(--glow-2),transparent_65%)]" />
        {/* 鼠标跟随光晕 */}
        <div
          ref={glowRef}
          className="absolute size-[400px] rounded-full bg-[radial-gradient(circle,var(--accent),transparent_70%)] opacity-0 transition-[transform,opacity] duration-300 ease-out will-change-transform"
        />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <motion.p
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="font-display mb-5 text-sm font-medium uppercase tracking-[0.3em] text-muted"
        >
          Xuanbao · XR · Blog
        </motion.p>

        {/* 大标题 */}
        <h1 className="font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.05] font-bold tracking-tight">
          <MaskedText text="你好，" delay={0.1} />
          <MaskedLine delay={0.45} className="pb-1 text-accent">
            {displayName}
          </MaskedLine>
        </h1>

        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <PoemQuote />
        </motion.div>

        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <Link
            href="/blog"
            className="group inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            开始阅读
            <Icon
              icon="ph:arrow-right-bold"
              width={16}
              height={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
