import type { Metadata } from "next";

export const metadata: Metadata = { title: "工具" };

// 占位页：Phase 6 填充工具推荐
export default function ToolsPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">工具</h1>
      <p className="mt-3 text-muted">常用工具与自制小工具整理中，敬请期待。</p>
    </>
  );
}
