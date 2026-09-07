import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RolePermissionManager } from "@/components/admin/RolePermissionManager";
import { getFreshUser } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions-server";
import { isSuperAdmin, ROLES } from "@/lib/roles";

export const metadata: Metadata = { title: "权限管理" };
export const dynamic = "force-dynamic";

// 权限管理：仅超级管理员可配置各权限组（管理员/成员）能执行的功能
export default async function AdminPermissionsPage() {
  const me = await getFreshUser();
  if (!me) redirect("/");
  if (!isSuperAdmin(me.role)) redirect("/admin");

  const [adminPermissions, memberPermissions] = await Promise.all([
    getRolePermissions(ROLES.ADMIN),
    getRolePermissions(ROLES.MEMBER),
  ]);

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">权限管理</h1>
      <p className="mt-2 text-sm text-muted">
        勾选各权限组能执行的功能。超级管理员固定拥有全部权限，游客仅可浏览。
      </p>
      <RolePermissionManager
        adminPermissions={adminPermissions}
        memberPermissions={memberPermissions}
      />
    </>
  );
}
