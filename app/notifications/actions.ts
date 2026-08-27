"use server";

// 站内通知 Server Actions（供前端通知铃铛与通知中心调用）
import { getFreshUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserNotifications,
  getUnreadSummary,
} from "@/lib/notifications";
import {
  type NotificationCategory,
  type NotificationItem,
  type NotificationUnreadSummary,
} from "@/lib/notification-types";

export type NotificationsResult = {
  items: NotificationItem[];
  nextCursor: string | null;
  unread: NotificationUnreadSummary;
};

// 获取当前用户的通知列表（可按分类过滤，游标分页），同时返回未读汇总
export async function getNotifications(
  category: NotificationCategory | "all" = "all",
  cursor?: string
): Promise<NotificationsResult> {
  const user = await getFreshUser();
  if (!user) return { items: [], nextCursor: null, unread: { total: 0, byCategory: { system: 0, like: 0, comment: 0 } } };

  const [{ items, nextCursor }, unread] = await Promise.all([
    getUserNotifications(user.id, category, cursor, 20),
    getUnreadSummary(user.id),
  ]);
  return { items, nextCursor, unread };
}

// 单条标记已读（仅限本人）
export async function markNotificationRead(id: string) {
  const user = await getFreshUser();
  if (!user) return;
  await prisma.notification.updateMany({
    where: { id, userId: user.id, read: false },
    data: { read: true },
  });
}

// 全部标记已读
export async function markAllNotificationsRead() {
  const user = await getFreshUser();
  if (!user) return;
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
}

// 某分类全部标记已读
export async function markCategoryRead(category: NotificationCategory) {
  const user = await getFreshUser();
  if (!user) return;
  await prisma.notification.updateMany({
    where: { userId: user.id, category, read: false },
    data: { read: true },
  });
}

// 清空已读通知
export async function clearReadNotifications() {
  const user = await getFreshUser();
  if (!user) return;
  await prisma.notification.deleteMany({ where: { userId: user.id, read: true } });
}

// 删除单条通知（仅限本人）
export async function deleteNotification(id: string) {
  const user = await getFreshUser();
  if (!user) return;
  await prisma.notification.deleteMany({ where: { id, userId: user.id } });
}
