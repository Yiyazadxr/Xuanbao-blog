import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getFreshUser } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions-server";
import { canAccessAdmin, type Role } from "@/lib/roles";

// 管理后台布局：服务端鉴权（未登录或非管理员 → 首页）
// 注意：每个后台 Server Action 内部还会按具体权限再校验一次，双重保险
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getFreshUser();
  if (!user) redirect("/");
  if (!canAccessAdmin(user.role)) redirect("/");

  const permissions = await getRolePermissions(user.role as Role);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 pt-28 sm:px-6 md:flex-row">
      <AdminSidebar role={user.role} permissions={permissions} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
