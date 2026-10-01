// 每日浏览量为累计 viewCount 补充时间维度。
import { prisma } from "@/lib/prisma";

import { dayKeyOf } from "@/lib/day-key";
export { dayKeyOf, dayKeyToStart, shiftDayKey } from "@/lib/day-key";

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
