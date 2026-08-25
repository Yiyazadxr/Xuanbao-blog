"use server";

// 权限管理 Server Actions（仅超级管理员可配置权限组）
import { revalidatePath } from "next/cache";
import { getFreshUser } from "@/lib/auth";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin, ROLES } from "@/lib/roles";
import { parseInput, permissionSchema } from "@/lib/validation";

export type PermissionActionState = { ok: boolean; error?: string; message?: string };

// 保存某角色权限（仅 ADMIN/MEMBER 可配置；超级管理员固定全开）
export async function saveRolePermissions(
  role: string,
  permissions: string[]
): Promise<PermissionActionState> {
  const admin = await getFreshUser();
  if (!admin || !isSuperAdmin(admin.role)) return { ok: false, error: "无权限" };

  const parsed = parseInput(permissionSchema, { role, permissions });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  if (parsed.data.role !== ROLES.ADMIN && parsed.data.role !== ROLES.MEMBER) {
    return { ok: false, error: "该角色不可配置" };
  }

  // 过滤掉未知权限值并去重，只保留合法项
  const valid = [...new Set(parsed.data.permissions.filter((p) => (ALL_PERMISSIONS as string[]).includes(p)))];
  await prisma.rolePermission.upsert({
    where: { role: parsed.data.role },
    update: { permissions: JSON.stringify(valid) },
    create: { role: parsed.data.role, permissions: JSON.stringify(valid) },
  });

  revalidatePath("/admin/permissions");
  return { ok: true, message: "权限已保存" };
}
