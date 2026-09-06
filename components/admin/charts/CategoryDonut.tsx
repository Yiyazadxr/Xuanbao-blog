"use client";

import { useState } from "react";

import { DONUT_PALETTE } from "@/lib/chart";
import type { CategoryStat } from "@/lib/stats";
import { formatCount } from "@/lib/utils";

// 分类分布环形图（纯 SVG stroke-dasharray 实现，方形容器等比缩放不失真）
const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 74;
const STROKE = 24;
const CIRC = 2 * Math.PI * RADIUS;

type Metric = "posts" | "views";

export function CategoryDonut({ data }: { data: CategoryStat[] }) {
  const [metric, setMetric] = useState<Metric>("posts");
  const [hover, setHover] = useState<number | null>(null);

  const valueOf = (d: CategoryStat) => (metric === "posts" ? d.posts : d.views);
  const values = data.map((d) => valueOf(d));
  const total = values.reduce((s, v) => s + v, 0);

  // 每段弧长按占比换算；起始偏移 = 前面所有弧长之和（dashoffset 定位起笔角）
  const lengths = values.map((v) => (total === 0 ? 0 : (v / total) * CIRC));
  const arcs = data.map((d, i) => ({
    ...d,
    value: values[i],
    length: lengths[i],
    offset: lengths.slice(0, i).reduce((s, v) => s + v, 0),
    color: DONUT_PALETTE[i % DONUT_PALETTE.length],
  }));

  const focused = hover === null ? null : arcs[hover];
  const unit = metric === "posts" ? "篇文章" : "次浏览";

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">还没有已发布的文章</p>;
  }

  return (
    <div>
      <div className="flex justify-end gap-1">
        {(["posts", "views"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            aria-pressed={metric === m}
            className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
              metric === m ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {m === "posts" ? "按文章数" : "按浏览量"}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative size-44 shrink-0">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" role="img" aria-label="分类分布">
            {/* 12 点方向起笔 */}
            <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="var(--border)"
                strokeWidth={STROKE}
              />
              {arcs.map((a, i) => (
                <circle
                  key={a.id}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={hover === i ? STROKE + 6 : STROKE}
                  strokeDasharray={`${a.length} ${Math.max(0, CIRC - a.length)}`}
                  strokeDashoffset={-a.offset}
                  opacity={hover === null || hover === i ? 1 : 0.35}
                  className="cursor-pointer transition-[stroke-width,opacity] duration-200"
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                />
              ))}
            </g>
          </svg>
          {/* 圆心读数：未悬停显示合计，悬停显示该分类 */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold tabular-nums">
              {formatCount(focused ? focused.value : total)}
            </span>
            <span className="mt-0.5 max-w-[6.5rem] truncate text-xs text-muted">
              {focused ? focused.name : unit}
            </span>
          </div>
        </div>

        <ul className="w-full space-y-1">
          {arcs.map((a, i) => (
            <li key={a.id}>
              <button
                type="button"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition-colors duration-200 hover:bg-foreground/5"
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {formatCount(a.value)}
                  <span className="ml-1 opacity-70">
                    {total === 0 ? "0%" : `${Math.round((a.value / total) * 100)}%`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
