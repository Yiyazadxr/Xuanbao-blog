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

// SUPER_ADMIN 全开；配置缺失或损坏时回落默认值。缓存仅限单次请求。
export const getRolePermissions = cache(async (role: Role): Promise<Permission[]> => {
  if (role === ROLES.SUPER_ADMIN) return [...ALL_PERMISSIONS];
  const row = await prisma.rolePermission.findUnique({ where: { role } });
  if (!row) return [...DEFAULT_ROLE_PERMISSIONS[role]];
  try {
    const parsed = JSON.parse(row.permissions);
    const valid = normalizePermissions(parsed);
    if (!valid) return [...DEFAULT_ROLE_PERMISSIONS[role]];
    // 空数组表示主动撤销全部权限。
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
