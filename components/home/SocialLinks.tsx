"use client";

import { Icon } from "@/components/ui/Icon";
import { CONTACT } from "@/lib/constants";
import { useState } from "react";

// 社交图标行（客户端）：RSS 点击跳转 + 复制链接；复制后短暂提示
export function SocialLinks() {
  const [copied, setCopied] = useState(false);

  async function handleRssClick() {
    const rssUrl = `${window.location.origin}/feed.xml`;
    try {
      await navigator.clipboard.writeText(rssUrl);
    } catch {
      // 剪贴板不可用时静默，仍跳转
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-1">
      <a
        href="https://github.com/Yiyazadxr"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub"
        className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
      >
        <Icon icon="ph:github-logo-bold" width={18} height={18} aria-hidden />
      </a>
      <a
        href={`mailto:${CONTACT.email}`}
        aria-label="Email"
        className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
      >
        <Icon icon="ph:envelope-bold" width={18} height={18} aria-hidden />
      </a>
      <a
        href="/feed.xml"
        onClick={handleRssClick}
        aria-label={copied ? "RSS 已复制" : "RSS"}
        className="relative inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
      >
        <Icon icon="ph:rss-simple-bold" width={18} height={18} aria-hidden />
        {/* 复制提示 */}
        <span
          className={`absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground transition-opacity duration-200 ${
            copied ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          已复制
        </span>
      </a>
    </div>
  );
}
