// 数据库限流（固定窗口计数）：多实例/Serverless 部署下共享同一计数，
// 生产环境配合 Postgres（Neon）使用，避免内存限流在重启/多实例间失效。
import { prisma } from "@/lib/prisma";

function keyName(prefix: string, value: string) {
  return `${prefix}:${value}`;
}

export const rateLimit = {
  // 当前是否已被限流（超过阈值）。窗口过期则视为未限流。
  async isBlocked(prefix: string, value: string, limit: number) {
    const key = keyName(prefix, value);
    const now = Date.now();
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    if (!row || row.resetAt.getTime() <= now) return { blocked: false, retryAfterSec: 0 };
    if (row.count >= limit) {
      return { blocked: true, retryAfterSec: Math.ceil((row.resetAt.getTime() - now) / 1000) };
    }
    return { blocked: false, retryAfterSec: 0 };
  },
  // 记录一次（失败时调用）；合并为原子 upsert，消除 TOCTOU 竞态
  async hit(prefix: string, value: string, windowMs: number) {
    const key = keyName(prefix, value);
    const now = Date.now();
    const nextReset = new Date(now + windowMs);
    const nowDate = new Date(now);
    // 用 Prisma 序列化 Date（统一 UTC）而非 ::timestamp 强转，
    // 避免 naive/aware 时区歧义导致偏移（Neon 跨时区部署也一致）
    await prisma.$executeRaw`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${nextReset})
      ON CONFLICT ("key") DO UPDATE
      SET "count" = CASE
        WHEN "RateLimit"."resetAt" <= ${nowDate} THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimit"."resetAt" <= ${nowDate} THEN ${nextReset}
        ELSE "RateLimit"."resetAt"
      END
    `;
  },
  // 清除（成功时调用）
  async reset(prefix: string, value: string) {
    await prisma.rateLimit.deleteMany({ where: { key: keyName(prefix, value) } });
  },
};
