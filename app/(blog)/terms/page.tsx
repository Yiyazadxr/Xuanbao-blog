import type { Metadata } from "next";
import { PostContent } from "@/components/blog/PostContent";
import { TERMS_OF_SERVICE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "用户协议",
  description: "Xuanbao.dev 用户协议 - 使用本站服务需遵守的条款与规则",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">用户协议</h1>
      <p className="mt-3 text-sm text-muted">更新日期：2026 年 8 月 26 日</p>
      <div className="mt-8">
        <PostContent content={TERMS_OF_SERVICE} />
      </div>
    </article>
  );
}
