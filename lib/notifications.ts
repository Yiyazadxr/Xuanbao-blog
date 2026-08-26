// 站内通知数据层：创建通知、通知管理员、查询与已读标记
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

export type NotificationData = {
  type: string;
  title: string;
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
    data: { userId, type: data.type, title: data.title, link: data.link ?? null },
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
      type: data.type,
      title: data.title,
      link: data.link ?? null,
    })),
  });
  await Promise.all(admins.map((a) => cleanupForUser(a.id)));
}
