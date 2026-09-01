// 数据库限流（固定窗口计数）：多实例/Serverless 部署下共享同一计数，
// 生产环境配合 Postgres（Neon）使用，避免内存限流在重启/多实例间失效。
import { prisma } from "@/lib/prisma";

function keyName(prefix: string, value: string) {
  return `${prefix}:${value}`;
}

export type RateLimitVerdict = { blocked: boolean; retryAfterSec: number };

// 注意：以下原生 SQL 不经过 Prisma Client，@updatedAt 不会自动填充，
// 必须显式写入 "updatedAt" 列（列定义 NOT NULL 且无数据库默认值，漏写会抛 23502）。
export const rateLimit = {
  // 当前是否已被限流（计数超过阈值）。窗口过期则视为未限流。
  // 仅作提示性前置检查，不计数。
  // 判定口径与 checkAndHit 保持一致：count > limit 才算超限（前 limit 次放行）。
  async isBlocked(
    prefix: string,
    value: string,
    limit: number
  ): Promise<RateLimitVerdict> {
    const key = keyName(prefix, value);
    const now = Date.now();
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    if (!row || row.resetAt.getTime() <= now) return { blocked: false, retryAfterSec: 0 };
    if (row.count > limit) {
      return { blocked: true, retryAfterSec: Math.ceil((row.resetAt.getTime() - now) / 1000) };
    }
    return { blocked: false, retryAfterSec: 0 };
  },

  // 单条 SQL 完成窗口重置/自增并 RETURNING 最新计数，
  // 消除 isBlocked → hit 两步之间的 TOCTOU 竞态（并发请求不再集体绕过阈值）。
  // 语义：前 limit 次放行，第 limit + 1 次起被拒（与旧的「先 isBlocked 后 hit」一致）。
  async checkAndHit(
    prefix: string,
    value: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitVerdict> {
    const key = keyName(prefix, value);
    const nowDate = new Date();
    const nextReset = new Date(nowDate.getTime() + windowMs);
    // 用 Prisma 序列化 Date（统一 UTC）而非 ::timestamp 强转，
    // 避免 naive/aware 时区歧义导致偏移（Neon 跨时区部署也一致）
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt", "updatedAt")
      VALUES (${key}, 1, ${nextReset}, ${nowDate})
      ON CONFLICT ("key") DO UPDATE
      SET "count" = CASE
          WHEN "RateLimit"."resetAt" <= ${nowDate} THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimit"."resetAt" <= ${nowDate} THEN ${nextReset}
          ELSE "RateLimit"."resetAt"
        END,
        "updatedAt" = ${nowDate}
      RETURNING "count", "resetAt"
    `;
    const row = rows[0];
    // 理论上必有返回；极端情况下（如驱动差异）保守放行，避免限流层故障阻断业务
    if (!row) return { blocked: false, retryAfterSec: 0 };
    if (row.count > limit) {
      return {
        blocked: true,
        retryAfterSec: Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)),
      };
    }
    return { blocked: false, retryAfterSec: 0 };
  },

  // 仅记录：用于「只在失败分支计费」的场景
  // 需要同时判定是否被限流时，用下方 checkAndHitOnFailure 组合语义或直接用 checkAndHit
  async hit(prefix: string, value: string, windowMs: number): Promise<void> {
    const key = keyName(prefix, value);
    const nowDate = new Date();
    const nextReset = new Date(nowDate.getTime() + windowMs);
    await prisma.$executeRaw`
      INSERT INTO "RateLimit" ("key", "count", "resetAt", "updatedAt")
      VALUES (${key}, 1, ${nextReset}, ${nowDate})
      ON CONFLICT ("key") DO UPDATE
      SET "count" = CASE
          WHEN "RateLimit"."resetAt" <= ${nowDate} THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimit"."resetAt" <= ${nowDate} THEN ${nextReset}
          ELSE "RateLimit"."resetAt"
        END,
        "updatedAt" = ${nowDate}
    `;
  },

  // 清除（成功时调用）
  async reset(prefix: string, value: string): Promise<void> {
    await prisma.rateLimit.deleteMany({ where: { key: keyName(prefix, value) } });
  },
};
