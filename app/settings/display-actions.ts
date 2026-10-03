"use server";

// 显示偏好可跨设备同步到账号。
import { getFreshUser } from "@/lib/auth";
import {
  type Density,
  type DisplayPreferenceValues,
  isDensity,
  SPACING_SCALE_DEFAULT,
} from "@/lib/display";
import { prisma } from "@/lib/prisma";
import { displayPreferencesSchema, parseInput } from "@/lib/validation";

function toDensity(value: string | null | undefined): Density {
  // 分类白名单来自 lib/display。
  return isDensity(value) ? value : "normal";
}

export async function getDisplayPreferences(): Promise<DisplayPreferenceValues | null> {
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
      proseLeading: true,
      smoothScroll: true,
      readingProgress: true,
    },
  });
  if (!dbUser || dbUser.fontScale == null) return null;
  return {
    fontScale: dbUser.fontScale,
    spacingScale: dbUser.spacingScale ?? SPACING_SCALE_DEFAULT,
    density: toDensity(dbUser.density),
    headerH: dbUser.headerH,
    footerPy: dbUser.footerPy,
    waveIntensity: dbUser.waveIntensity,
    inkEnabled: dbUser.inkEnabled,
    reduceMotion: dbUser.reduceMotion,
    proseLeading: dbUser.proseLeading,
    smoothScroll: dbUser.smoothScroll,
    readingProgress: dbUser.readingProgress,
  };
}

export async function saveDisplayPreferences(
  input: DisplayPreferenceValues
): Promise<{ ok: boolean; error?: string }> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  const parsed = parseInput(displayPreferencesSchema, input);
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
      proseLeading: d.proseLeading,
      smoothScroll: d.smoothScroll,
      readingProgress: d.readingProgress,
    },
  });
  return { ok: true };
}

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
      proseLeading: null,
      smoothScroll: null,
      readingProgress: null,
    },
  });
  return { ok: true };
}
