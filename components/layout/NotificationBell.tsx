"use client";

import { Icon } from "@iconify/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteNotification,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notifications/actions";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { formatRelativeTime } from "@/lib/utils";

type Item = {
  id: string;
  type: string;
  title: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

// 站内通知铃铛：未读角标 + 下拉列表 + 已读标记
export function NotificationBell() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const data = await getMyNotifications();
    setItems(data.notifications);
    setUnread(data.unreadCount);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    getMyNotifications().then((data) => {
      if (cancelled) return;
      setItems(data.notifications);
      setUnread(data.unreadCount);
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

  function handleItemClick(item: Item) {
    markNotificationRead(item.id);
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    if (!item.read) setUnread((u) => Math.max(0, u - 1));
    setOpen(false);
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  function handleDelete(item: Item) {
    deleteNotification(item.id);
    setItems((prev) => prev.filter((n) => n.id !== item.id));
    if (!item.read) setUnread((u) => Math.max(0, u - 1));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `通知，${unread} 条未读` : "通知"}
        aria-expanded={open}
        className="relative inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Icon icon="ph:bell-bold" width={22} height={22} />
        {unread > 0 && (
          <span className="absolute right-0 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="通知列表"
          className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">通知</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="cursor-pointer text-xs text-accent hover:underline"
              >
                全部已读
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">暂无通知</p>
            ) : (
              items.map((item) => {
                const inner = (
                  <span className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-1.5 block size-2 shrink-0 rounded-full">
                      {!item.read && <span className="block size-2 rounded-full bg-accent" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm leading-snug ${
                          item.read ? "text-muted" : "text-foreground"
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(item);
                      }}
                      aria-label="删除通知"
                      className="mt-0.5 shrink-0 cursor-pointer rounded p-1 text-muted/60 transition-colors duration-150 hover:bg-foreground/10 hover:text-red-500"
                    >
                      <Icon icon="ph:x-bold" width={14} height={14} aria-hidden />
                    </button>
                  </span>
                );
                return item.link ? (
                  <Link
                    key={item.id}
                    href={item.link}
                    onClick={() => handleItemClick(item)}
                    className="block border-b border-border transition-colors duration-150 last:border-b-0 hover:bg-foreground/5"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="block cursor-pointer border-b border-border transition-colors duration-150 last:border-b-0 hover:bg-foreground/5"
                  >
                    {inner}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
