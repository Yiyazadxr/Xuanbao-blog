import type { Metadata } from "next";
import { PostContent } from "@/components/blog/PostContent";
import { LEGAL_UPDATED, LEGAL_VERSION, PRIVACY_POLICY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "Xuanbao.dev 隐私政策 - 我们如何收集、使用、存储和保护您的个人信息",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">隐私政策</h1>
      <p className="mt-3 text-sm text-muted">
        版本 v{LEGAL_VERSION} · 更新日期：{LEGAL_UPDATED}
      </p>
      <div className="mt-8">
        <PostContent content={PRIVACY_POLICY} />
      </div>
    </article>
  );
}
