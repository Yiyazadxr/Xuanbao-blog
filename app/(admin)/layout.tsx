import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getFreshUser } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions-server";
import { canAccessAdmin, type Role } from "@/lib/roles";

// 布局校验后台访问权；Server Action 仍须校验具体权限。
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getFreshUser();
  if (!user) redirect("/");
  if (!canAccessAdmin(user.role)) redirect("/");

  const permissions = await getRolePermissions(user.role as Role);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-[var(--content-pt)] pb-[var(--content-pb)] sm:px-6">
      <div className="rounded-2xl border border-border bg-background p-6 sm:p-8">
        <div className="flex flex-col gap-8 md:flex-row">
          <AdminSidebar role={user.role} permissions={permissions} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
