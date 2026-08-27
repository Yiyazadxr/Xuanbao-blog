// 站内通知数据层：创建通知、通知管理员、查询与已读标记
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationItem,
  type NotificationUnreadSummary,
} from "@/lib/notification-types";

export type NotificationData = {
  category: NotificationCategory;
  type: string;
  title: string;
  actorName?: string;
  link?: string;
};

const MAX_NOTIFICATIONS = 200;
const RETENTION_DAYS = 7;

// 清理指定用户的通知：删除超过 7 天的，超过 200 条则删除最旧的
async function cleanupForUser(userId: string) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.notification.deleteMany({
    where: { userId, createdAt: { lt: cutoff } },
  });
  const count = await prisma.notification.count({ where: { userId } });
  if (count > MAX_NOTIFICATIONS) {
    const oldest = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: MAX_NOTIFICATIONS,
      select: { id: true },
    });
    if (oldest.length > 0) {
      await prisma.notification.deleteMany({
        where: { id: { in: oldest.map((n) => n.id) } },
      });
    }
  }
}

// 给指定用户创建一条通知
export async function createNotification(userId: string, data: NotificationData) {
  const created = await prisma.notification.create({
    data: {
      userId,
      category: data.category,
      type: data.type,
      title: data.title,
      actorName: data.actorName ?? null,
      link: data.link ?? null,
    },
  });
  await cleanupForUser(userId);
  return created;
}

// 通知所有管理员（ADMIN / SUPER_ADMIN）
export async function notifyAdmins(data: NotificationData) {
  const admins = await prisma.user.findMany({
    where: { role: { in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] } },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      category: data.category,
      type: data.type,
      title: data.title,
      actorName: data.actorName ?? null,
      link: data.link ?? null,
    })),
  });
  await Promise.all(admins.map((a) => cleanupForUser(a.id)));
}

// 序列化通知条目（与 lib/notification-types.ts 的 NotificationItem 契约一致）
function serialize(n: {
  id: string;
  category: string;
  type: string;
  actorName: string | null;
  title: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
}): NotificationItem {
  return {
    id: n.id,
    category: n.category as NotificationCategory,
    type: n.type,
    actorName: n.actorName,
    title: n.title,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

// 获取用户某分类的通知（按时间倒序），支持游标分页（cursor 为上次最后一条的 id）
export async function getUserNotifications(
  userId: string,
  category: NotificationCategory | "all",
  cursor?: string,
  pageSize = 20
): Promise<{ items: NotificationItem[]; nextCursor: string | null }> {
  const where = {
    userId,
    ...(category !== "all" ? { category } : {}),
  };
  const rows = await prisma.notification.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  return {
    items: page.map(serialize),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}

// 各分类未读计数
export async function getUnreadSummary(userId: string): Promise<NotificationUnreadSummary> {
  const grouped = await prisma.notification.groupBy({
    by: ["category"],
    where: { userId, read: false },
    _count: { _all: true },
  });
  const byCategory = {
    [NOTIFICATION_CATEGORIES.SYSTEM]: 0,
    [NOTIFICATION_CATEGORIES.LIKE]: 0,
    [NOTIFICATION_CATEGORIES.COMMENT]: 0,
  } as Record<NotificationCategory, number>;
  let total = 0;
  for (const g of grouped) {
    const c = g.category as NotificationCategory;
    byCategory[c] = g._count._all;
    total += g._count._all;
  }
  return { total, byCategory };
}
