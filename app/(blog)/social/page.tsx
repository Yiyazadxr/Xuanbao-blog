import type { Metadata } from "next";

export const metadata: Metadata = { title: "社交" };

// 占位页：Phase 6 填充社交链接与友链
export default function SocialPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">社交</h1>
      <p className="mt-3 text-muted">社交链接与友链整理中，敬请期待。</p>
    </>
  );
}
