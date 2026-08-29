// 权限查询（服务端专用，依赖数据库）：读取角色实际权限
import { prisma } from "@/lib/prisma";
import { ROLES, type Role } from "@/lib/roles";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  type Permission,
} from "@/lib/permissions";

// 读取某角色实际权限（超级管理员全开；未配置回落默认值）
export async function getRolePermissions(role: Role): Promise<Permission[]> {
  if (role === ROLES.SUPER_ADMIN) return [...ALL_PERMISSIONS];
  const row = await prisma.rolePermission.findUnique({ where: { role } });
  if (!row) return [...DEFAULT_ROLE_PERMISSIONS[role]];
  try {
    const parsed = JSON.parse(row.permissions);
    if (!Array.isArray(parsed)) return [...DEFAULT_ROLE_PERMISSIONS[role]];
    const valid = [
      ...new Set(
        parsed.filter((p): p is Permission => (ALL_PERMISSIONS as string[]).includes(p))
      ),
    ];
    // 过滤后为空集 → 回落到默认值，避免全部非法值导致零权限
    return valid.length > 0 ? valid : [...DEFAULT_ROLE_PERMISSIONS[role]];
  } catch (e) {
    console.error(`角色 ${role} 的权限配置解析失败，回落到默认值：`, e);
    return [...DEFAULT_ROLE_PERMISSIONS[role]];
  }
}

export async function hasPermission(
  role: Role | null | undefined,
  permission: Permission
): Promise<boolean> {
  if (!role) return false;
  const perms = await getRolePermissions(role);
  return perms.includes(permission);
}
