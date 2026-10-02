export const POSTS_PER_PAGE = 9;

// URL 参数、客户端和数据层使用同一规则；不把 NaN/Infinity/小数传给 Prisma。
export function parsePage(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") return 1;
  if (typeof value === "string" && !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function clampPage(page: number, total: number, size = POSTS_PER_PAGE): number {
  return Math.min(parsePage(page), Math.max(1, Math.ceil(total / size)));
}
