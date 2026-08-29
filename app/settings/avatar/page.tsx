import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AvatarEditor } from "@/components/settings/AvatarEditor";
import { getFreshUser } from "@/lib/auth";

export const metadata: Metadata = { title: "修改头像" };
export const dynamic = "force-dynamic";

// 修改头像（独立页，需登录；前端裁剪编辑器支持上传/缩放/旋转/裁切）
export default async function ChangeAvatarPage() {
  const user = await getFreshUser();
  if (!user) redirect("/");

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24 pt-28 sm:px-6">
      <Link
        href="/settings"
        className="text-sm text-muted transition-colors duration-200 hover:text-accent"
      >
        ← 返回设置
      </Link>
      <h1 className="font-display mt-4 text-3xl font-bold tracking-tight">修改头像</h1>
      <p className="mt-2 text-sm text-muted">上传并裁剪你的头像，支持缩放 / 旋转</p>
      <div className="mt-8">
        <AvatarEditor initialImage={user.image} name={user.name} />
      </div>
    </div>
  );
}
