import type { Metadata } from "next";

export const metadata: Metadata = { title: "关于作者" };

// 占位页：Phase 6 填充个人简介、技能与时间线
export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">关于作者</h1>
      <p className="mt-3 text-muted">你好，我是暄宝xr。详细介绍撰写中，敬请期待。</p>
    </div>
  );
}
