import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { getFreshUser } from "@/lib/auth";
import { type Role } from "@/lib/roles";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "设置" };
export const dynamic = "force-dynamic";

// 设置页：个人资料 + 显示偏好（需登录）
export default async function SettingsPage() {
  const user = await getFreshUser();
  if (!user) redirect("/");

  const role = user.role as Role;
  const days = Math.max(0, Math.floor((new Date().getTime() - user.createdAt.getTime()) / 86400000));
  const initial = (user.name ?? "?").slice(0, 1).toUpperCase();
  const joinedDate = formatDate(user.createdAt);

  return (
    <SettingsPanel
      name={user.name}
      email={user.email}
      role={role}
      days={days}
      initial={initial}
      joinedDate={joinedDate}
    />
  );
}
