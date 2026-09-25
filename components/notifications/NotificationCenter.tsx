"use client";

import { Icon } from "@/components/ui/Icon";
import { useState } from "react";
import {
  clearReadNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markCategoryRead,
  markNotificationRead,
} from "@/app/notifications/actions";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import {
  NOTIFICATION_CATEGORY_META,
  NOTIFICATION_CATEGORY_ORDER,
  type NotificationCategory,
  type NotificationItem,
  type NotificationUnreadSummary,
} from "@/lib/notification-types";

type Tab = NotificationCategory | "all";

const EMPTY_SUMMARY: NotificationUnreadSummary = {
  total: 0,
  byCategory: { system: 0, like: 0, comment: 0 },
};

// 通知中心
// Tab 加载放在点击事件处理器里（允许同步 setState），避免 effect 内同步 setState
export function NotificationCenter({
  initialItems,
  initialCursor,
  initialUnread,
}: {
  initialItems: NotificationItem[];
  initialCursor: string | null;
  initialUnread: NotificationUnreadSummary;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<Record<Tab, NotificationItem[]>>({
    all: initialItems,
    system: [],
    like: [],
    comment: [],
  });
  const [nextCursor, setNextCursor] = useState<Record<Tab, string | null>>({
    all: initialCursor,
    system: null,
    like: null,
    comment: null,
  });
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  // 记录已加载过的分类（含空结果），避免每次切换 Tab 都重复请求
  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(() => new Set(["all"]));

  function selectTab(t: Tab) {
    setTab(t);
    if (t !== "all" && !loadedTabs.has(t) && !loading) {
      setLoadedTabs((prev) => new Set(prev).add(t));
      setLoading(true);
      getNotifications(t)
        .then((res) => {
          setItems((prev) => ({ ...prev, [t]: res.items }));
          setNextCursor((prev) => ({ ...prev, [t]: res.nextCursor }));
          setUnread(res.unread);
        })
        .finally(() => setLoading(false));
    }
  }

  function handleLoadMore() {
    const t = tab;
    const cursor = nextCursor[t];
    if (!cursor || loading) return;
    setLoading(true);
    getNotifications(t, cursor)
      .then((res) => {
        setItems((prev) => ({ ...prev, [t]: [...prev[t], ...res.items] }));
        setNextCursor((prev) => ({ ...prev, [t]: res.nextCursor }));
        setUnread(res.unread);
      })
      .finally(() => setLoading(false));
  }

  function handleItemClick(item: NotificationItem) {
    if (!item.read) {
      markNotificationRead(item.id);
      markLocalRead(item.id, item.category);
    }
  }

  function markLocalRead(id: string, category: NotificationCategory) {
    setItems((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as Tab[]) {
        next[key] = next[key].map((n) => (n.id === id ? { ...n, read: true } : n));
      }
      return next;
    });
    setUnread((prev) => ({
      total: Math.max(0, prev.total - 1),
      byCategory: {
        ...prev.byCategory,
        [category]: Math.max(0, prev.byCategory[category] - 1),
      },
    }));
  }

  async function handleMarkAll() {
    setPending(true);
    await markAllNotificationsRead();
    setItems((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as Tab[]) {
        next[key] = next[key].map((n) => ({ ...n, read: true }));
      }
      return next;
    });
    setUnread(EMPTY_SUMMARY);
    setPending(false);
  }

  async function handleMarkCategory(t: Tab) {
    if (t === "all") return handleMarkAll();
    setPending(true);
    await markCategoryRead(t);
    setItems((prev) => ({
      ...prev,
      [t]: prev[t].map((n) => ({ ...n, read: true })),
    }));
    setUnread((prev) => ({
      total: Math.max(0, prev.total - prev.byCategory[t]),
      byCategory: { ...prev.byCategory, [t]: 0 },
    }));
    setPending(false);
  }

  async function handleClearRead() {
    setPending(true);
    await clearReadNotifications();
    setItems((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as Tab[]) {
        next[key] = next[key].filter((n) => !n.read);
      }
      return next;
    });
    setPending(false);
  }

  function handleDelete(id: string) {
    deleteNotification(id);
    setItems((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as Tab[]) {
        next[key] = next[key].filter((n) => n.id !== id);
      }
      return next;
    });
  }

  const currentItems = items[tab];
  const categoryUnread = (t: Tab) => (t === "all" ? unread.total : unread.byCategory[t]);

  return (
    // 不透明底，遮挡水墨背景
    <div className="mx-auto mt-28 w-full max-w-3xl rounded-2xl border border-border bg-background px-4 pt-8 pb-24 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">通知</h1>
          <p className="mt-2 text-sm text-muted">你的赞、评论回复与系统消息都在这里</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleClearRead}
            disabled={pending}
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm text-muted transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
          >
            清空已读
          </button>
        </div>
      </div>

      {/* 分类 Tab */}
      <div role="tablist" className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {(["all", ...NOTIFICATION_CATEGORY_ORDER] as Tab[]).map((t) => {
          const active = tab === t;
          const count = categoryUnread(t);
          const label = t === "all" ? "全部" : NOTIFICATION_CATEGORY_META[t].label;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(t)}
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {label}
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-b border-border pb-3">
        <span className="text-sm text-muted">{categoryUnread(tab)} 条未读</span>
        {unread.total > 0 && (
          <button
            type="button"
            onClick={() => handleMarkCategory(tab)}
            disabled={pending}
            className="cursor-pointer text-sm text-accent hover:underline disabled:opacity-50"
          >
            全部已读
          </button>
        )}
      </div>

      <div className="mt-2 divide-y divide-border">
        {currentItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Icon
              icon={
                tab === "all"
                  ? "ph:bell-light"
                  : NOTIFICATION_CATEGORY_META[tab as NotificationCategory].icon
              }
              width={40}
              height={40}
              className="text-muted/40"
              aria-hidden
            />
            <p className="text-sm text-muted">暂无通知</p>
          </div>
        ) : (
          currentItems.map((item) => (
            <div key={item.id} onClick={() => handleItemClick(item)}>
              <NotificationRow item={item} onDelete={handleDelete} />
            </div>
          ))
        )}
      </div>

      {nextCursor[tab] && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="cursor-pointer rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {loading ? "加载中…" : "加载更多"}
          </button>
        </div>
      )}
    </div>
  );
}
