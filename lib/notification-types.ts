// 通知分类与类型（纯常量，客户端/服务端共用同一来源，禁止各写一份造成割裂）
// category 决定通知中心的 Tab 分组；type 为细分事件（用于图标与文案）

export const NOTIFICATION_CATEGORIES = {
  SYSTEM: "system",
  LIKE: "like",
  COMMENT: "comment",
} as const;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

// 分类 Tab 元信息：标签 + Phosphor 图标（铃铛与通知中心共用）
export const NOTIFICATION_CATEGORY_META: Record<
  NotificationCategory,
  { label: string; icon: string; color: string }
> = {
  [NOTIFICATION_CATEGORIES.SYSTEM]: {
    label: "系统通知",
    icon: "ph:megaphone-bold",
    color: "text-accent",
  },
  [NOTIFICATION_CATEGORIES.LIKE]: {
    label: "赞",
    icon: "ph:heart-bold",
    color: "text-rose-500",
  },
  [NOTIFICATION_CATEGORIES.COMMENT]: {
    label: "评论与回复",
    icon: "ph:chat-circle-dots-bold",
    color: "text-sky-500",
  },
};

export const NOTIFICATION_CATEGORY_ORDER: NotificationCategory[] = [
  NOTIFICATION_CATEGORIES.SYSTEM,
  NOTIFICATION_CATEGORIES.LIKE,
  NOTIFICATION_CATEGORIES.COMMENT,
];

// 服务端查询返回的可序列化通知条目（铃铛与通知中心共用同一结构）
export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  type: string;
  actorName: string | null;
  title: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

// 各分类未读计数汇总
export type NotificationUnreadSummary = {
  total: number;
  byCategory: Record<NotificationCategory, number>;
};
