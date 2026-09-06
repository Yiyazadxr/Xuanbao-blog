"use client";

import { Icon } from "@/components/ui/Icon";
import { useCopyFeedback } from "@/lib/use-copy-feedback";

// 文章分享按钮：优先 Web Share API（移动端调起系统分享面板），
// 不支持时回退为复制链接；复制/分享成功后短暂变对勾反馈，失败则提示。
export function ShareButton({ title, slug }: { title: string; slug: string }) {
  const { status, show } = useCopyFeedback();

  async function handleShare() {
    const url = `${window.location.origin}/blog/${slug}`;
    // 移动端 / 支持 Web Share 的环境：调起系统分享面板
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        // 分享完成后给一致的对勾反馈（与复制路径统一）
        show("copied");
      } catch {
        // 用户取消分享或失败：静默，不改动反馈状态
      }
      return;
    }
    // 桌面回退：复制链接
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // 剪贴板不可用（如非安全上下文）：退化为临时 textarea + execCommand 复制
      const input = document.createElement("textarea");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      ok = document.execCommand("copy");
      document.body.removeChild(input);
    }
    show(ok ? "copied" : "failed");
  }

  const copied = status === "copied";
  const failed = status === "failed";

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? "链接已复制" : failed ? "复制失败" : "分享文章"}
      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent border-border text-muted hover:border-accent hover:text-accent"
    >
      <Icon
        icon={copied ? "ph:check-bold" : failed ? "ph:x-bold" : "ph:share-network-bold"}
        width={18}
        height={18}
        aria-hidden
      />
      {copied ? "已复制" : failed ? "复制失败" : "分享"}
    </button>
  );
}
