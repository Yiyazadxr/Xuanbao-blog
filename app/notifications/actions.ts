"use server";

// 站内通知 Server Actions（供前端通知铃铛调用）
import { getFreshUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

// 获取当前用户的通知列表与未读数（返回可序列化结构）
export async function getMyNotifications() {
  const user = await getFreshUser();
  if (!user) return { notifications: [], unreadCount: 0 };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return {
    unreadCount,
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  };
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

// 删除单条通知（仅限本人）
export async function deleteNotification(id: string) {
  const user = await getFreshUser();
  if (!user) return;
  await prisma.notification.deleteMany({ where: { id, userId: user.id } });
}
