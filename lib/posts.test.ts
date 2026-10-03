import { beforeEach, describe, expect, it, vi } from "vitest";
const { count, findMany, findFirst, updateMany, recordDailyView } = vi.hoisted(() => ({ count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), recordDailyView: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { post: { count, findMany, findFirst, updateMany } } }));
vi.mock("@/lib/daily-stats", () => ({ recordDailyView }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { getPosts, getSeriesAdjacent, incrementViewCount } from "@/lib/posts";
import { QUERY_LIMITS } from "@/lib/constants";

beforeEach(() => { vi.resetAllMocks(); count.mockResolvedValue(20); findMany.mockResolvedValue([]); });

it("不存在或已撤稿的文章不能增加日统计", async () => {
  updateMany.mockResolvedValue({ count: 0 });
  expect(await incrementViewCount("missing")).toBe(false);
  expect(recordDailyView).not.toHaveBeenCalled();
  expect(updateMany).toHaveBeenCalledWith({ where: { id: "missing", published: true, archived: false }, data: { viewCount: { increment: 1 } } });
});

it("文章写入失败不会污染日统计", async () => {
  updateMany.mockRejectedValue(new Error("unavailable"));
  await expect(incrementViewCount("post1")).rejects.toThrow("unavailable");
  expect(recordDailyView).not.toHaveBeenCalled();
});

describe("文章列表查询边界", () => {
  it("越界页定位末页，计数与查询使用同一公开筛选", async () => {
    const result = await getPosts({ categorySlug: "notes", skip: 900, take: 9 });
    expect(result.total).toBe(20);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 18, take: 9,
      where: { published: true, archived: false, category: { slug: "notes" } },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    }));
    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
  });

  it.each([NaN, Infinity, -1, 1.5])("非法 offset %s 不传递到 Prisma", async (skip) => {
    await getPosts({ skip, take: 9 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 9 }));
  });

  it.each([0, -1, 1.5, Infinity, NaN, 99999])("非法或超大 take %s 受查询上限保护", async (take) => {
    await getPosts({ take });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: QUERY_LIMITS.postList }));
  });

  it("空库仍请求第一页并返回空列表", async () => {
    count.mockResolvedValue(0);
    expect(await getPosts({ skip: 999, take: 9 })).toEqual({ posts: [], total: 0 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
  });
});

it("同时间的系列文章通过 ID 确定相邻顺序", async () => {
  const createdAt = new Date("2026-01-01T00:00:00Z");
  findFirst.mockResolvedValueOnce({ id: "b", createdAt })
    .mockResolvedValueOnce({ title: "前文", slug: "a" })
    .mockResolvedValueOnce({ title: "后文", slug: "c" });
  expect(await getSeriesAdjacent("series", "b")).toEqual({ prev: { title: "前文", slug: "a" }, next: { title: "后文", slug: "c" } });
  expect(findFirst.mock.calls[1][0].where.OR).toContainEqual({ createdAt, id: { lt: "b" } });
  expect(findFirst.mock.calls[2][0].where.OR).toContainEqual({ createdAt, id: { gt: "b" } });
});
