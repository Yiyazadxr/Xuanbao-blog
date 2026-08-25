"use server";

// 用户管理 Server Actions（仅 SUPER_ADMIN 可调用）
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

export type UserActionState = { ok: boolean; error?: string; message?: string };

// 修改用户角色：仅支持 MEMBER ↔ ADMIN 之间切换（SUPER_ADMIN 保留，不通过界面授予）
export async function updateUserRole(
  userId: string,
  role: "ADMIN" | "MEMBER"
): Promise<UserActionState> {
  const admin = await requireSuperAdmin();
  if (!admin) return { ok: false, error: "无权限" };
  if (admin.id === userId) return { ok: false, error: "不能修改自己的角色" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "用户不存在" };
  if (target.role === ROLES.SUPER_ADMIN) return { ok: false, error: "不能修改超级管理员的角色" };

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
  return { ok: true, message: role === "ADMIN" ? "已设为管理员" : "已设为成员" };
}

// 删除用户：评论/点赞级联删除，邀请码解除绑定；有文章的用户不可删
export async function deleteUser(userId: string): Promise<UserActionState> {
  const admin = await requireSuperAdmin();
  if (!admin) return { ok: false, error: "无权限" };
  if (admin.id === userId) return { ok: false, error: "不能删除自己" };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { posts: true } } },
  });
  if (!target) return { ok: false, error: "用户不存在" };
  if (target.role === ROLES.SUPER_ADMIN) return { ok: false, error: "不能删除超级管理员" };
  if (target._count.posts > 0) {
    return { ok: false, error: "该用户有文章，请先处理其文章再删除" };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
  return { ok: true, message: "已删除用户" };
}
