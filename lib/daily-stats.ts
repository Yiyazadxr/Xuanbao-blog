// 每日浏览量埋点 + 日键工具：
// 文章的 viewCount 是累计值（只有「总共多少」、没有「哪天多少」），
// 这里按天记一笔增量，给后台统计看板补上时间维度。
import { prisma } from "@/lib/prisma";

// 统计口径时区 Asia/Shanghai（UTC+8）：
// 服务端（Vercel）跑在 UTC，若按 UTC 切日，「今天」要到北京时间 08:00 才翻页，
// 故统一按东八区切日，与博主所在时区一致。
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

// 时刻 → 日键（YYYY-MM-DD，东八区）
export function dayKeyOf(date: Date = new Date()): string {
  return new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

// 日键 → 该日东八区 00:00 的绝对时刻（用于按 createdAt 做范围过滤）
export function dayKeyToStart(key: string): Date {
  return new Date(`${key}T00:00:00+08:00`);
}

// 日键偏移 n 天（n 可为负），用于生成连续日期序列
export function shiftDayKey(key: string, days: number): string {
  const start = dayKeyToStart(key).getTime();
  return dayKeyOf(new Date(start + days * 86_400_000));
}

// 记录一次浏览量（异步调用；失败静默，绝不阻塞页面渲染）
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
