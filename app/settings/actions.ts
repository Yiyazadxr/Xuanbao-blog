"use server";

// 个人资料设置 Server Actions（需登录；改昵称/改密码独立页，均加 hCaptcha + 限流）
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getFreshUser } from "@/lib/auth";
import { verifyHCaptcha } from "@/lib/hcaptcha";
import { deleteImage, saveImage } from "@/lib/image-storage";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema, parseInput, updateNameSchema } from "@/lib/validation";

export type SettingsState = { ok: boolean; error?: string; message?: string };

// 头像允许的类型与上限（头像不需要 GIF，收紧到 2MB）
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

// 更新头像（需登录；上传后裁剪为方形显示，删除旧头像图）
export async function updateAvatar(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }

  const check = await rateLimit.isBlocked("settings-avatar", user.id, 10);
  if (check.blocked) return { ok: false, error: "操作过于频繁，请稍后再试" };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "请选择头像图片" };
  }
  if (!AVATAR_TYPES.has(file.type)) {
    return { ok: false, error: "仅支持 JPEG / PNG / WebP 图片" };
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return { ok: false, error: "头像图片不能超过 2MB" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let url: string;
  try {
    url = await saveImage({ type: file.type, data: buf }, "avatars");
  } catch (e) {
    console.error("上传头像失败：", e);
    return { ok: false, error: "上传失败，请稍后重试" };
  }

  // 更新数据库并删除旧头像（上传成功后才删，失败不误删）
  const old = user.image;
  await rateLimit.hit("settings-avatar", user.id, 60 * 60 * 1000);
  await prisma.user.update({ where: { id: user.id }, data: { image: url } });
  if (old && old !== url) {
    await deleteImage(old);
  }

  revalidatePath("/settings");
  return { ok: true, message: "头像已更新" };
}

// 删除头像（需登录；无头像时删除，移除 image 并清理旧图）
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function deleteAvatar(
  // 占位参数：useActionState 契约要求 (prevState, formData)；无需使用
  _prev: SettingsState,
  _formData?: FormData
): Promise<SettingsState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  if (!user.image) return { ok: false, error: "当前没有头像可删除" };

  await prisma.user.update({ where: { id: user.id }, data: { image: null } });
  await deleteImage(user.image);

  revalidatePath("/settings");
  return { ok: true, message: "头像已删除" };
}

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

  const parsed = parseInput(updateNameSchema, {
    name: String(formData.get("name") ?? ""),
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };

  await rateLimit.hit("settings-name", user.id, 60 * 60 * 1000);
  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
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

  const parsed = parseInput(changePasswordSchema, {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "两次输入的新密码不一致" };
  }

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });
  if (!full) return { ok: false, error: "用户不存在" };
  const valid = await bcrypt.compare(currentPassword, full.password);
  if (!valid) {
    // 计入失败尝试，防暴力破解当前密码
    await rateLimit.hit("settings-password", user.id, 60 * 60 * 1000);
    return { ok: false, error: "当前密码不正确" };
  }

  await rateLimit.hit("settings-password", user.id, 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 10) },
  });
  return { ok: true, message: "密码已修改" };
}
