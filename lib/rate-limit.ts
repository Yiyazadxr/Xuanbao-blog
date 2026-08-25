// 内存固定窗口限流（单进程有效）。
// 生产环境多实例/Serverless 部署时应替换为共享存储（如 Upstash Redis / 数据库表），
// 否则各实例各自计数，限流会被放大失效。
const buckets = new Map<string, { count: number; resetAt: number }>();

function get(key: string, now: number) {
  const b = buckets.get(key);
  if (!b) return null;
  if (now >= b.resetAt) {
    buckets.delete(key);
    return null;
  }
  return b;
}

export const rateLimit = {
  // 当前是否已被限流（超过阈值）
  isBlocked(key: string, limit: number) {
    const now = Date.now();
    const b = get(key, now);
    if (!b || b.count < limit) return { blocked: false, retryAfterSec: 0 };
    return { blocked: true, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  },
  // 记录一次（失败时调用）
  hit(key: string, windowMs: number) {
    const now = Date.now();
    const b = get(key, now);
    if (!b) buckets.set(key, { count: 1, resetAt: now + windowMs });
    else b.count += 1;
  },
  // 清除（成功时调用）
  reset(key: string) {
    buckets.delete(key);
  },
};
