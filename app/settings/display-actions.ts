"use server";

// 显示偏好 Server Actions：跨设备同步到账号（字体缩放 + 页面间距 + 界面密度 + 自定义导航栏/页脚 + 视觉动效）
import { getFreshUser } from "@/lib/auth";
import { type Density } from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { displayPreferencesSchema, parseInput } from "@/lib/validation";

function toDensity(value: string | null | undefined): Density {
  return value === "compact" || value === "comfortable" || value === "custom" ? value : "normal";
}

// 读取账号已同步的显示偏好（未设置返回 null）
export async function getDisplayPreferences(): Promise<{
  fontScale: number;
  spacingScale: number;
  density: Density;
  headerH: number | null;
  footerPy: number | null;
  waveIntensity: number | null;
  inkEnabled: boolean | null;
  reduceMotion: boolean | null;
} | null> {
  const user = await getFreshUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      fontScale: true,
      spacingScale: true,
      density: true,
      headerH: true,
      footerPy: true,
      waveIntensity: true,
      inkEnabled: true,
      reduceMotion: true,
    },
  });
  if (!dbUser || dbUser.fontScale == null) return null;
  return {
    fontScale: dbUser.fontScale,
    spacingScale: dbUser.spacingScale ?? 1,
    density: toDensity(dbUser.density),
    headerH: dbUser.headerH,
    footerPy: dbUser.footerPy,
    waveIntensity: dbUser.waveIntensity,
    inkEnabled: dbUser.inkEnabled,
    reduceMotion: dbUser.reduceMotion,
  };
}

// 保存显示偏好到账号（同步开关开启时调用）
export async function saveDisplayPreferences(
  fontScale: number,
  spacingScale: number,
  density: string,
  headerH?: number | null,
  footerPy?: number | null,
  waveIntensity?: number | null,
  inkEnabled?: boolean | null,
  reduceMotion?: boolean | null
): Promise<{ ok: boolean; error?: string }> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  const parsed = parseInput(displayPreferencesSchema, {
    fontScale,
    spacingScale,
    density,
    headerH: headerH ?? null,
    footerPy: footerPy ?? null,
    waveIntensity: waveIntensity ?? null,
    inkEnabled: inkEnabled ?? null,
    reduceMotion: reduceMotion ?? null,
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const d = parsed.data;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      fontScale: d.fontScale,
      spacingScale: d.spacingScale,
      density: d.density,
      headerH: d.headerH,
      footerPy: d.footerPy,
      waveIntensity: d.waveIntensity,
      inkEnabled: d.inkEnabled,
      reduceMotion: d.reduceMotion,
    },
  });
  return { ok: true };
}

// 清除账号显示偏好（关闭同步时调用，回到纯本地）
export async function clearDisplayPreferences(): Promise<{ ok: boolean; error?: string }> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };
  await prisma.user.update({
    where: { id: user.id },
    data: {
      fontScale: null,
      spacingScale: null,
      density: null,
      headerH: null,
      footerPy: null,
      waveIntensity: null,
      inkEnabled: null,
      reduceMotion: null,
    },
  });
  return { ok: true };
}
