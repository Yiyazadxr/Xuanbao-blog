"use client";

import { Icon } from "@iconify/react";
import { CONTACT } from "@/lib/constants";

// 邮箱反爬：仅在客户端拼接，避免明文出现在 SSR HTML 里被爬虫抓取
const [localPart, domain] = CONTACT.email.split("@");
const mailto = () => `mailto:${localPart}@${domain}`;

// 社交页网格卡片（与社交链接卡片同款样式）
export function EmailCard() {
  return (
    <button
      type="button"
      onClick={() => (window.location.href = mailto())}
      className="group flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-surface p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-accent"
    >
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Icon icon="ph:envelope-bold" width={22} height={22} aria-hidden />
      </span>
      <span>
        <span className="block font-bold transition-colors duration-200 group-hover:text-accent">
          邮箱
        </span>
        <span className="mt-1 block text-sm text-muted">点此给我发邮件</span>
      </span>
    </button>
  );
}

// 通用邮箱按钮（自定义样式，如「联系我」胶囊按钮）
export function MailtoButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => (window.location.href = mailto())}
      className={className}
    >
      {children}
    </button>
  );
}
