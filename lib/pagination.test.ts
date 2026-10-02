import { describe, expect, it } from "vitest";
import { clampPage, parsePage } from "@/lib/pagination";
import { postPageQuerySchema } from "@/lib/validation";

describe("公开文章分页", () => {
  it.each([undefined, null, "", "-1", "0", "1.5", "Infinity", "NaN", "1e3", "abc", NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
  ("非法页码 %s 回落第一页", (input) => { expect(parsePage(input)).toBe(1); });

  it("接受安全正整数，越界请求收敛到末页", () => {
    expect(parsePage("12")).toBe(12);
    expect(parsePage(12)).toBe(12);
    expect(clampPage(999, 20)).toBe(3);
    expect(clampPage(999, 18)).toBe(2);
    expect(clampPage(999, 0)).toBe(1);
  });

  it("拒绝未知查询字段和超长筛选，允许中文 slug", () => {
    expect(postPageQuerySchema.safeParse({ categorySlug: "随笔", page: "2" }).success).toBe(true);
    expect(postPageQuerySchema.safeParse({ take: "99999" }).success).toBe(false);
    expect(postPageQuerySchema.safeParse({ tagSlug: "a".repeat(201) }).success).toBe(false);
  });
});
