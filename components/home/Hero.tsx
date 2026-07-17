"use client";

import { Icon } from "@iconify/react";
import { motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { SITE } from "@/lib/constants";
import { EASE_OUT } from "@/lib/motion";
import { MaskedLine, MaskedText } from "@/components/ui/MaskedText";

// R3F 粒子层体积大且依赖 WebGL，动态引入并关闭 SSR
const HeroParticles = dynamic(
  () => import("@/components/home/HeroParticles").then((m) => m.HeroParticles),
  { ssr: false }
);

// 是否桌面端（≥768px）：移动端不加载 1MB 的 three.js 粒子层，省流量与 GPU
const DESKTOP_QUERY = "(min-width: 768px)";
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false // SSR 时不渲染
  );
}

// 首页 Hero（第一版）：深色沉浸、超大字排版、渐变光斑 + 噪点背景、鼠标跟随微交互
// Phase 7 会在此组件内部升级为 R3F 粒子/shader 背景，外部接口不变
export function Hero() {
  const reduceMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const glowRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // 章节变色：Hero 在视口内时给 <html> 挂 home-in-hero，全站临时切深色配色
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        document.documentElement.classList.toggle("home-in-hero", entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("home-in-hero");
    };
  }, []);

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
      transition: { duration: 0.7, delay: 0.12 * i, ease: EASE_OUT },
    }),
  };

  return (
    <section
      ref={sectionRef}
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
        {/* WebGL 粒子场：仅桌面端 + 非 reduced-motion 时加载，CSS 光斑始终兜底 */}
        {!reduceMotion && isDesktop && (
          <div className="absolute inset-0">
            <HeroParticles />
          </div>
        )}
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

        {/* 超大字标题：第一行逐字揭开，渐变行整行揭开 */}
        <h1 className="font-display text-[clamp(3rem,9vw,7.5rem)] leading-[1.05] font-bold tracking-tight">
          <MaskedText text="你好，我是" delay={0.15} />
          <MaskedLine
            delay={0.55}
            className="bg-gradient-to-r from-[#a78bfa] via-[#818cf8] to-[#22d3ee] bg-clip-text pb-2 text-transparent"
          >
            暄宝xr
          </MaskedLine>
        </h1>

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

      {/* 底部跑马灯：无限滚动关键词条（学自 sondaven.com） */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute inset-x-0 bottom-0 overflow-hidden border-t border-white/10 py-4"
      >
        <div className="animate-marquee flex w-max whitespace-nowrap">
          {[0, 1].map((dup) => (
            <span key={dup} className="flex shrink-0">
              {["博客", "Blog", "代码", "Code", "生活", "Life", "记录", "Design"].map(
                (word) => (
                  <span
                    key={word}
                    className="font-display mx-8 text-sm uppercase tracking-[0.3em] text-white/25"
                  >
                    {word} ✦
                  </span>
                )
              )}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
