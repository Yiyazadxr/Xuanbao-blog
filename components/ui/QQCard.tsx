"use client";

import { Icon } from "@iconify/react";
import { CONTACT } from "@/lib/constants";

// QQ 联系卡片：QQ 号拆分为片段，仅在客户端拼接，避免明文出现在 SSR HTML 里被爬虫抓取
const QQ_PARTS = [CONTACT.qq.slice(0, 3), CONTACT.qq.slice(3, 6), CONTACT.qq.slice(6)];

export function QQCard() {
  function openQQ() {
    const qq = QQ_PARTS.join("");
    window.open(
      `https://wpa.qq.com/msgrd?v=3&uin=${qq}&site=qq&menu=yes`,
      "_blank",
      "noopener"
    );
  }

  return (
    <button
      type="button"
      onClick={openQQ}
      className="group flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-surface p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-accent"
    >
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Icon icon="ph:chat-dots-bold" width={22} height={22} aria-hidden />
      </span>
      <span>
        <span className="block font-bold transition-colors duration-200 group-hover:text-accent">
          QQ
        </span>
        <span className="mt-1 block text-sm text-muted">点此用 QQ 联系我</span>
      </span>
    </button>
  );
}
