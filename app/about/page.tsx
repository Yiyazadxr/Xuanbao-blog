import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { SKILLS, TIMELINE } from "@/lib/constants";

export const metadata: Metadata = { title: "关于作者" };

// 关于作者：简介 + 技能 + 时间线（内容在 lib/constants.ts 中配置）
export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28 sm:px-6">
      {/* 简介 */}
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Image
          src="/images/main_logo.webp"
          alt="暄宝xr 的头像"
          width={88}
          height={88}
          className="rounded-2xl"
          priority
        />
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">你好，我是暄宝xr</h1>
          <p className="mt-2 leading-relaxed text-muted">
            一名正在学习全栈开发的爱好者。这个博客是我亲手从零搭建的——从最初的纯手写
            HTML，到现在的 Next.js 全栈应用。我在这里记录技术、生活，和一切让我着迷的东西。
          </p>
        </div>
      </div>

      {/* 技能 */}
      <h2 className="mt-16 text-2xl font-bold tracking-tight">持续学习</h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {SKILLS.map((skill) => (
          <span
            key={skill}
            className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* 时间线 */}
      <h2 className="mt-16 text-2xl font-bold tracking-tight">时间线</h2>
      <ol className="mt-6 space-y-8 border-l-2 border-border pl-6">
        {TIMELINE.map((item) => (
          <li key={item.time} className="relative">
            <span className="absolute -left-[calc(1.5rem+5px)] top-1.5 block size-2.5 rounded-full bg-accent" />
            <p className="font-display text-sm font-bold text-accent">{item.time}</p>
            <p className="mt-1 font-bold">{item.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
          </li>
        ))}
      </ol>

      {/* 联系 */}
      <p className="mt-16 rounded-2xl border border-border bg-surface p-6 text-sm leading-relaxed text-muted">
        想和我交流？去{" "}
        <Link href="/social" className="text-accent hover:underline">
          社交页
        </Link>{" "}
        找到我，或者直接在文章下留言（
        <Link href="/register" className="text-accent hover:underline">
          申请账号
        </Link>
        后即可评论）。
      </p>
    </div>
  );
}
