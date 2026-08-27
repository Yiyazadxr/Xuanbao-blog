"use server";

// 显示偏好 Server Actions：跨设备同步到账号（字体缩放 + 界面密度 + 自定义导航栏/页脚）
import { getFreshUser } from "@/lib/auth";
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FOOTER_PY_MAX,
  FOOTER_PY_MIN,
  HEADER_H_MAX,
  HEADER_H_MIN,
  isDensity,
  type Density,
} from "@/lib/display";
import { prisma } from "@/lib/prisma";

function toDensity(value: string | null | undefined): Density {
  return value === "compact" || value === "comfortable" || value === "custom" ? value : "normal";
}

// 读取账号已同步的显示偏好（未设置返回 null）
export async function getDisplayPreferences(): Promise<{
  fontScale: number;
  density: Density;
  headerH: number | null;
  footerPy: number | null;
} | null> {
  const user = await getFreshUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fontScale: true, density: true, headerH: true, footerPy: true },
  });
  if (!dbUser || dbUser.fontScale == null) return null;
  return {
    fontScale: dbUser.fontScale,
    density: toDensity(dbUser.density),
    headerH: dbUser.headerH,
    footerPy: dbUser.footerPy,
  };
}

// 保存显示偏好到账号（同步开关开启时调用）
export async function saveDisplayPreferences(
  fontScale: number,
  density: string,
  headerH?: number | null,
  footerPy?: number | null
): Promise<{ ok: boolean; error?: string }> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };
  if (
    typeof fontScale !== "number" ||
    fontScale < FONT_SCALE_MIN ||
    fontScale > FONT_SCALE_MAX
  ) {
    return { ok: false, error: "字体缩放参数不合法" };
  }
  if (!isDensity(density)) {
    return { ok: false, error: "界面密度参数不合法" };
  }
  const d = density;
  const hh =
    headerH != null ? Math.min(HEADER_H_MAX, Math.max(HEADER_H_MIN, Math.round(headerH))) : null;
  const fp =
    footerPy != null ? Math.min(FOOTER_PY_MAX, Math.max(FOOTER_PY_MIN, Math.round(footerPy))) : null;
  await prisma.user.update({
    where: { id: user.id },
    data: { fontScale, density: d, headerH: hh, footerPy: fp },
  });
  return { ok: true };
}

// 清除账号显示偏好（关闭同步时调用，回到纯本地）
export async function clearDisplayPreferences(): Promise<{ ok: boolean; error?: string }> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };
  await prisma.user.update({
    where: { id: user.id },
    data: { fontScale: null, density: null, headerH: null, footerPy: null },
  });
  return { ok: true };
}
