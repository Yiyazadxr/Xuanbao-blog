"use client";

import { Icon } from "@iconify/react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { SITE } from "@/lib/constants";

// 首页 Hero（第一版）：深色沉浸、超大字排版、渐变光斑 + 噪点背景、鼠标跟随微交互
// Phase 7 会在此组件内部升级为 R3F 粒子/shader 背景，外部接口不变
export function Hero() {
  const reduceMotion = useReducedMotion();
  const glowRef = useRef<HTMLDivElement>(null);

  // 鼠标跟随光晕：直接写 transform，不触发 React 重渲染；首次移动前保持透明
  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (reduceMotion || !glowRef.current) return;
    const { left, top } = e.currentTarget.getBoundingClientRect();
    glowRef.current.style.opacity = "1";
    glowRef.current.style.transform = `translate(${e.clientX - left - 200}px, ${
      e.clientY - top - 200
    }px)`;
  }

  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 28 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay: 0.12 * i, ease: [0.22, 1, 0.36, 1] as const },
    }),
  };

  return (
    <section
      onMouseMove={handleMouseMove}
      className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-[#0a0a0b] text-[#fafaf9]"
    >
      {/* 渐变光斑背景层 */}
      <div aria-hidden className="absolute inset-0">
        <div className="animate-blob-a absolute -top-1/4 left-[12%] size-[45vmax] rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_65%)]" />
        <div className="animate-blob-b absolute right-[-15%] bottom-0 size-[40vmax] rounded-full bg-[radial-gradient(circle,var(--glow-2),transparent_65%)]" />
        {/* 鼠标跟随光晕 */}
        <div
          ref={glowRef}
          className="absolute size-[400px] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.14),transparent_70%)] opacity-0 transition-[transform,opacity] duration-300 ease-out will-change-transform"
        />
        {/* 噪点纹理 */}
        <div className="bg-noise absolute inset-0 opacity-[0.035]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
        <motion.p
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="font-display mb-6 text-sm font-medium uppercase tracking-[0.35em] text-[#a1a1aa]"
        >
          Blog · Life · Code
        </motion.p>

        {/* 超大字标题：中英混排，clamp 自适应 */}
        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="font-display text-[clamp(3rem,9vw,7.5rem)] leading-[1.05] font-bold tracking-tight"
        >
          你好，我是
          <br />
          <span className="bg-gradient-to-r from-[#a78bfa] via-[#818cf8] to-[#22d3ee] bg-clip-text text-transparent">
            暄宝xr
          </span>
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-8 max-w-xl text-base leading-relaxed text-[#a1a1aa] sm:text-lg"
        >
          {SITE.description}
        </motion.p>

        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <Link
            href="/blog"
            className="group inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-[#fafaf9] px-6 text-sm font-semibold text-[#0a0a0b] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa]"
          >
            开始阅读
            <Icon
              icon="ph:arrow-right-bold"
              width={16}
              height={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="/about"
            className="inline-flex h-12 cursor-pointer items-center rounded-full border border-white/15 px-6 text-sm font-semibold text-[#fafaf9] transition-colors duration-200 hover:border-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78bfa]"
          >
            关于我
          </Link>
        </motion.div>
      </div>

      {/* 底部滚动提示 */}
      {!reduceMotion && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="text-[#a1a1aa]"
          >
            <Icon icon="ph:arrow-down-bold" width={18} height={18} />
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
