// 服务端权限查询。
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { ROLES, type Role } from "@/lib/roles";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  normalizePermissions,
  type Permission,
} from "@/lib/permissions";

// SUPER_ADMIN 全开；未配置使用默认值，已有配置损坏则拒绝授权。
export const getRolePermissions = cache(async (role: Role): Promise<Permission[]> => {
  if (role === ROLES.SUPER_ADMIN) return [...ALL_PERMISSIONS];
  const row = await prisma.rolePermission.findUnique({ where: { role } });
  if (!row) return [...DEFAULT_ROLE_PERMISSIONS[role]];
  try {
    const parsed = JSON.parse(row.permissions);
    const valid = normalizePermissions(parsed);
    if (!valid) return [];
    // 空数组表示主动撤销全部权限。
    return valid;
  } catch (e) {
    console.error(`角色 ${role} 的权限配置解析失败，拒绝授权：`, e);
    return [];
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
