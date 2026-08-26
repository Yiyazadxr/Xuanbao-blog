"use server";

// 个人资料设置 Server Actions（需登录；改昵称/改密码独立页，均加 hCaptcha + 限流）
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getFreshUser } from "@/lib/auth";
import { verifyHCaptcha } from "@/lib/hcaptcha";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export type SettingsState = { ok: boolean; error?: string; message?: string };

// 更新昵称（hCaptcha + 按用户限流）
export async function updateProfile(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }
  const check = await rateLimit.isBlocked("settings-name", user.id, 10);
  if (check.blocked) return { ok: false, error: "操作过于频繁，请稍后再试" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "昵称不能为空" };
  if (name.length > 50) return { ok: false, error: "昵称最多 50 字" };

  await rateLimit.hit("settings-name", user.id, 60 * 60 * 1000);
  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/settings");
  return { ok: true, message: "昵称已保存" };
}

// 修改密码（hCaptcha + 按用户限流 + 校验当前密码）
export async function changePassword(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }
  const check = await rateLimit.isBlocked("settings-password", user.id, 10);
  if (check.blocked) return { ok: false, error: "操作过于频繁，请稍后再试" };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current) return { ok: false, error: "请输入当前密码" };
  if (next.length < 8) return { ok: false, error: "新密码至少 8 位" };
  if (next.length > 72) return { ok: false, error: "新密码最长 72 位" };
  if (next !== confirm) return { ok: false, error: "两次输入的新密码不一致" };

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });
  if (!full) return { ok: false, error: "用户不存在" };
  const valid = await bcrypt.compare(current, full.password);
  if (!valid) {
    // 计入失败尝试，防暴力破解当前密码
    await rateLimit.hit("settings-password", user.id, 60 * 60 * 1000);
    return { ok: false, error: "当前密码不正确" };
  }

  await rateLimit.hit("settings-password", user.id, 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(next, 10) },
  });
  return { ok: true, message: "密码已修改" };
}
