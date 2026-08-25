import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { getFreshUser } from "@/lib/auth";

export const metadata: Metadata = { title: "个人资料" };
export const dynamic = "force-dynamic";

// 个人资料设置：改昵称 + 改密码（需登录）
export default async function SettingsPage() {
  const user = await getFreshUser();
  if (!user) redirect("/");

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-28 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">个人资料</h1>
      <p className="mt-2 text-sm text-muted">管理你的昵称与账号密码</p>
      <ProfileForm name={user.name} email={user.email} />
    </div>
  );
}
