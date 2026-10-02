"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { TocList } from "@/components/blog/TocList";
import type { TocItem } from "@/lib/markdown";
import { useActiveHeading } from "@/lib/use-active-heading";
import { useFocusTrap } from "@/lib/use-focus-trap";

// 移动端目录：右下角悬浮按钮 + 底部抽屉（xl 及以上用桌面 Sidebar，故此处 xl:hidden）
export function MobileToc({ toc }: { toc: TocItem[] }) {
  const [open, setOpen] = useState(false);
  // 当前小节高亮与桌面 Sidebar 共用逻辑
  const activeId = useActiveHeading(toc);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 打开时锁定页面滚动，关闭后还原
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  useFocusTrap(panelRef, open);

  // Escape 关闭抽屉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (toc.length === 0) return null;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen(true)}
        aria-label="打开目录"
        className="fixed bottom-6 right-4 z-[60] flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium shadow-lg transition-colors duration-200 hover:border-accent xl:hidden"
      >
        <Icon icon="ph:list-bullets-bold" width={16} height={16} aria-hidden />
        目录
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="文章目录"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div ref={panelRef} className="absolute inset-x-0 bottom-0 max-h-[72vh] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-5 pb-8">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">目录</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭目录"
                className="rounded-full p-1 text-muted transition-colors duration-200 hover:text-foreground"
              >
                <Icon icon="ph:x-bold" width={18} height={18} aria-hidden />
              </button>
            </div>
            <TocList
              toc={toc}
              activeId={activeId}
              variant="drawer"
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
