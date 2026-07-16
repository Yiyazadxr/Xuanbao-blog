import { Icon } from "@iconify/react";
import type { Metadata } from "next";
import { FRIEND_LINKS, SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = { title: "社交" };

// 社交链接 + 友链
export default function SocialPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">社交</h1>
      <p className="mt-3 text-muted">在这些地方可以找到我（链接在 lib/constants.ts 中配置）</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-accent"
          >
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Icon icon={link.icon} width={22} height={22} aria-hidden />
            </span>
            <span>
              <span className="block font-bold transition-colors duration-200 group-hover:text-accent">
                {link.name}
              </span>
              <span className="mt-1 block text-sm text-muted">{link.description}</span>
            </span>
          </a>
        ))}
      </div>

      <h2 className="mt-16 text-2xl font-bold tracking-tight">友情链接</h2>
      {FRIEND_LINKS.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          暂无友链。想交换友链？去文章下留言或发邮件给我。
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FRIEND_LINKS.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-1 hover:border-accent"
            >
              <span className="block font-bold transition-colors duration-200 group-hover:text-accent">
                {link.name}
              </span>
              <span className="mt-1 block text-sm text-muted">{link.description}</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
