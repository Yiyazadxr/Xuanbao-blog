import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// 管理后台布局：服务端鉴权（未登录 → 登录页；非管理员 → 首页）
// 注意：每个后台 Server Action 内部还会再校验一次角色，双重保险
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28 sm:px-6">{children}</div>
  );
}
