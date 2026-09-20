// 站内通知数据层：创建通知（支持聚合）、通知管理员、查询与已读标记
import { runAfter } from "@/lib/deferred";
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
  /**
   * 聚合键（如 `like:${postId}`、`comment:${postId}`）。
   * 同一接收者 + 同一聚合键的「未读且在聚合窗口内」通知会合并为一条，
   * 不传则每次都新建一条（适合「禁言/解禁」这类需要逐条留档的系统通知）。
   */
  aggregateKey?: string;
};

const MAX_NOTIFICATIONS = 200;
const RETENTION_DAYS = 7;
// 聚合窗口：只有窗口内的未读通知才会被合并，避免几个月前的未读项被一直追加
const AGGREGATE_WINDOW_MS = 24 * 60 * 60 * 1000;
// 昵称快照最多保留的个数（超出丢弃最旧的）
const MAX_ACTOR_NAMES = 20;
// 清理触发概率：清理是惰性维护，无需每次写入都跑
const CLEANUP_PROBABILITY = 0.05;

// 解析昵称数组（字段为 JSON 字符串；损坏时安全降级为空数组）
function parseActorNames(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((n): n is string => typeof n === "string")
      : [];
  } catch {
    return [];
  }
}

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
      orderBy: [{ lastMergedAt: "desc" }, { id: "desc" }],
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

// 惰性清理：交给请求生命周期收尾执行，失败不影响主流程
function maybeCleanup(userId: string) {
  if (Math.random() >= CLEANUP_PROBABILITY) return;
  runAfter(() => cleanupForUser(userId));
}

// 尝试把本次事件并入已有的一条未读聚合通知；无可合并对象时返回 null
async function mergeIntoAggregate(
  userId: string,
  data: NotificationData,
  actor: string | null
) {
  const since = new Date(Date.now() - AGGREGATE_WINDOW_MS);
  const retentionCutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      aggregateKey: data.aggregateKey,
      read: false,
      createdAt: { gt: retentionCutoff },
      lastMergedAt: { gt: since },
    },
    orderBy: { lastMergedAt: "desc" },
    select: { id: true, actorNames: true },
  });
  if (!existing) return null;

  // 同一人重复触发不虚增人数，只把昵称提到最前
  const names = parseActorNames(existing.actorNames);
  const deduped = actor
    ? [actor, ...names.filter((n) => n !== actor)].slice(0, MAX_ACTOR_NAMES)
    : names;

  return prisma.notification.update({
    where: { id: existing.id },
    data: {
      count: { increment: 1 },
      actorNames: deduped.length > 0 ? JSON.stringify(deduped) : null,
      // actorName 保持为「最近一位触发者」；无昵称的系统通知不清空原值
      ...(actor ? { actorName: actor } : {}),
      title: data.title,
      ...(data.link ? { link: data.link } : {}),
      // 刷新最近合并时间，用于聚合窗口判断和列表排序。
      // createdAt 保持首次创建时刻，仅供 7 天清理使用。
      lastMergedAt: new Date(),
    },
  });
}

// 写入一条通知（可聚合）。返回创建的记录（合并时返回被更新的那条）
async function upsertNotification(userId: string, data: NotificationData) {
  const actor = data.actorName?.trim() || null;

  if (data.aggregateKey) {
    // 极端并发下可能同时判定为「无可合并对象」而各建一条；无唯一约束兜底，
    // 但后果仅是同一事件出现两条通知（不影响正确性），故不做分布式锁
    const merged = await mergeIntoAggregate(userId, data, actor);
    if (merged) return merged;
  }

  const created = await prisma.notification.create({
    data: {
      userId,
      category: data.category,
      type: data.type,
      title: data.title,
      actorName: actor,
      link: data.link ?? null,
      aggregateKey: data.aggregateKey ?? null,
      actorNames: actor ? JSON.stringify([actor]) : null,
      count: 1,
    },
  });
  maybeCleanup(userId);
  return created;
}

// 给指定用户创建一条通知
export async function createNotification(userId: string, data: NotificationData) {
  return upsertNotification(userId, data);
}

// 通知所有管理员（ADMIN / SUPER_ADMIN）
export async function notifyAdmins(data: NotificationData) {
  const admins = await prisma.user.findMany({
    where: { role: { in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] } },
    select: { id: true },
  });
  if (admins.length === 0) return;
  // 逐个写入以支持按管理员各自聚合（聚合键按 userId 隔离），管理员数量极少，开销可忽略
  await Promise.all(admins.map((a) => upsertNotification(a.id, data)));
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
  lastMergedAt: Date;
  actorNames: string | null;
  count: number;
}): NotificationItem {
  return {
    id: n.id,
    category: n.category as NotificationCategory,
    type: n.type,
    actorName: n.actorName,
    actorNames: parseActorNames(n.actorNames),
    count: n.count,
    title: n.title,
    link: n.link,
    read: n.read,
    lastMergedAt: n.lastMergedAt.toISOString(),
  };
}

// 获取用户某分类的通知（按最近活动时间倒序），支持游标分页（cursor 为上次最后一条的 id）
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
    orderBy: [{ lastMergedAt: "desc" }, { id: "desc" }],
    take: pageSize + 1,
    select: {
      id: true,
      category: true,
      type: true,
      actorName: true,
      title: true,
      link: true,
      read: true,
      lastMergedAt: true,
      actorNames: true,
      count: true,
    },
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
