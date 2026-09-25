// 每日浏览量为累计 viewCount 补充时间维度。
import { prisma } from "@/lib/prisma";

// 日键统一按 Asia/Shanghai 切分，避免 UTC 日期晚 8 小时翻页。
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

export function dayKeyOf(date: Date = new Date()): string {
  return new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

export function dayKeyToStart(key: string): Date {
  return new Date(`${key}T00:00:00+08:00`);
}

export function shiftDayKey(key: string, days: number): string {
  const start = dayKeyToStart(key).getTime();
  return dayKeyOf(new Date(start + days * 86_400_000));
}

// 埋点失败不阻塞页面渲染。
export async function recordDailyView(): Promise<void> {
  try {
    const date = dayKeyOf();
    await prisma.dailyViewStat.upsert({
      where: { date },
      create: { date, views: 1 },
      update: { views: { increment: 1 } },
    });
  } catch (e) {
    console.error("每日浏览量统计失败：", e);
  }
}
