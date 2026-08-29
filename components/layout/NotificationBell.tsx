"use client";

import { Icon } from "@/components/ui/Icon";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notifications/actions";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import type { NotificationItem, NotificationUnreadSummary } from "@/lib/notification-types";
import { useFocusTrap } from "@/lib/use-focus-trap";

const EMPTY_SUMMARY: NotificationUnreadSummary = {
  total: 0,
  byCategory: { system: 0, like: 0, comment: 0 },
};

// 站内通知铃铛：未读角标 + 下拉列表 + 前往通知中心
export function NotificationBell() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState<NotificationUnreadSummary>(EMPTY_SUMMARY);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const data = await getNotifications("all");
    setItems(data.items);
    setUnread(data.unread);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    getNotifications("all").then((data) => {
      if (cancelled) return;
      setItems(data.items);
      setUnread(data.unread);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  // 点击外部 / Escape 关闭下拉
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useFocusTrap(panelRef, open);

  // 加载中占位，防布局跳动
  if (status === "loading") {
    return <span className="inline-block size-10" aria-hidden />;
  }
  if (status !== "authenticated") return null;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) refresh();
  }

  function handleItemClick(item: NotificationItem) {
    if (!item.read) {
      markNotificationRead(item.id);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnread((prev) => ({
        total: Math.max(0, prev.total - 1),
        byCategory: {
          ...prev.byCategory,
          [item.category]: Math.max(0, prev.byCategory[item.category] - 1),
        },
      }));
    }
    setOpen(false);
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(EMPTY_SUMMARY);
  }

  function handleDelete(id: string) {
    const target = items.find((n) => n.id === id);
    deleteNotification(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.read) {
      setUnread((prevUnread) => ({
        total: Math.max(0, prevUnread.total - 1),
        byCategory: {
          ...prevUnread.byCategory,
          [target.category]: Math.max(0, prevUnread.byCategory[target.category] - 1),
        },
      }));
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread.total > 0 ? `通知，${unread.total} 条未读` : "通知"}
        aria-expanded={open}
        className="relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Icon icon="ph:bell-bold" width={22} height={22} />
        {unread.total > 0 && (
          <span className="absolute right-0 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unread.total > 99 ? "99+" : unread.total}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="通知列表"
          className="absolute right-0 top-12 w-[22rem] overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">通知</span>
            {unread.total > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="cursor-pointer text-xs text-accent hover:underline"
              >
                全部已读
              </button>
            )}
          </div>

          <div className="max-h-[24rem] overflow-y-auto divide-y divide-border">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">暂无通知</p>
            ) : (
              items.map((item) => (
                <div key={item.id} onClick={() => handleItemClick(item)}>
                  <NotificationRow item={item} onDelete={handleDelete} compact />
                </div>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-border bg-foreground/5 px-4 py-2.5 text-xs font-medium text-muted transition-colors duration-150 hover:text-accent"
          >
            查看全部通知
            <Icon icon="ph:arrow-right-bold" width={12} height={12} aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
