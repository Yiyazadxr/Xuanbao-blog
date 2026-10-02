import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NameForm } from "@/components/settings/NameForm";
import { getFreshUser } from "@/lib/auth";

export const metadata: Metadata = { title: "修改昵称" };
export const dynamic = "force-dynamic";

// 修改昵称（独立页，需登录）
export default async function ChangeNamePage() {
  const user = await getFreshUser();
  if (!user) redirect("/");

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24 pt-[var(--content-pt)] sm:px-6">
      <Link
        href="/settings"
        className="text-sm text-muted transition-colors duration-200 hover:text-accent"
      >
        ← 返回设置
      </Link>
      <h1 className="font-display mt-4 text-3xl font-bold tracking-tight">修改昵称</h1>
      <p className="mt-2 text-sm text-muted">修改你的显示昵称</p>
      <div className="mt-8">
        <NameForm name={user.name} />
      </div>
    </div>
  );
}
