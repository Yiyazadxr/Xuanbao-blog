import { describe, expect, it } from "vitest";
import { pushHistory, SEARCH_HISTORY_MAX } from "@/lib/search-history";

describe("pushHistory", () => {
  it("空词不入历史", () => {
    expect(pushHistory(["a"], "  ")).toEqual(["a"]);
  });

  it("新词放在最前", () => {
    expect(pushHistory(["a", "b"], "c")).toEqual(["c", "a", "b"]);
  });

  it("重复词提到最前且不重复", () => {
    expect(pushHistory(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
  });

  it("超过上限截断（默认 8 条）", () => {
    const prev = ["1", "2", "3", "4", "5", "6", "7", "8"];
    expect(pushHistory(prev, "9")).toEqual(["9", "1", "2", "3", "4", "5", "6", "7"]);
  });

  it("空历史加入首条", () => {
    expect(pushHistory([], "nextjs")).toEqual(["nextjs"]);
  });

  it("自定义上限生效", () => {
    expect(pushHistory(["a", "b"], "c", 2)).toEqual(["c", "a"]);
  });

  it("上限常量默认 8", () => {
    expect(SEARCH_HISTORY_MAX).toBe(8);
  });
});
