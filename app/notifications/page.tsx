import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { getFreshUser } from "@/lib/auth";
import { getUnreadSummary, getUserNotifications } from "@/lib/notifications";
import type { NotificationUnreadSummary } from "@/lib/notification-types";

export const metadata: Metadata = { title: "通知" };
export const dynamic = "force-dynamic";

const EMPTY_SUMMARY: NotificationUnreadSummary = {
  total: 0,
  byCategory: { system: 0, like: 0, comment: 0 },
};

// 通知中心：分类 Tab + 列表 + 分页（需登录）
export default async function NotificationsPage() {
  const user = await getFreshUser();
  if (!user) redirect("/");

  const [{ items, nextCursor }, unread] = await Promise.all([
    getUserNotifications(user.id, "all"),
    getUnreadSummary(user.id),
  ]);

  return (
    <NotificationCenter
      initialItems={items}
      initialCursor={nextCursor}
      initialUnread={unread ?? EMPTY_SUMMARY}
    />
  );
}
