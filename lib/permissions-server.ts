// 权限查询（服务端专用，依赖数据库）：读取角色实际权限
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { ROLES, type Role } from "@/lib/roles";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  normalizePermissions,
  type Permission,
} from "@/lib/permissions";

// 读取某角色实际权限（超级管理员全开；未配置或配置损坏时回落默认值）。
// React cache 仅在同一次服务端渲染内去重，跨请求仍实时读取数据库。
export const getRolePermissions = cache(async (role: Role): Promise<Permission[]> => {
  if (role === ROLES.SUPER_ADMIN) return [...ALL_PERMISSIONS];
  const row = await prisma.rolePermission.findUnique({ where: { role } });
  if (!row) return [...DEFAULT_ROLE_PERMISSIONS[role]];
  try {
    const parsed = JSON.parse(row.permissions);
    const valid = normalizePermissions(parsed);
    if (!valid) return [...DEFAULT_ROLE_PERMISSIONS[role]];
    // 空数组是后台可保存的合法配置，表示主动撤销该角色全部权限。
    return valid;
  } catch (e) {
    console.error(`角色 ${role} 的权限配置解析失败，回落到默认值：`, e);
    return [...DEFAULT_ROLE_PERMISSIONS[role]];
  }
});

export async function hasPermission(
  role: Role | null | undefined,
  permission: Permission
): Promise<boolean> {
  if (!role) return false;
  const perms = await getRolePermissions(role);
  return perms.includes(permission);
}
