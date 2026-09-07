import { describe, expect, it } from "vitest";
import { dayKeyOf, dayKeyToStart, shiftDayKey } from "@/lib/daily-stats";

describe("dayKeyOf", () => {
  it("东八区时刻直接映射到当日日键", () => {
    expect(dayKeyOf(new Date("2026-07-17T00:00:00+08:00"))).toBe("2026-07-17");
    expect(dayKeyOf(new Date("2026-07-17T23:59:59+08:00"))).toBe("2026-07-17");
  });

  it("UTC 16:00 起计入东八区次日", () => {
    // UTC 16:00 = 北京时间 00:00
    expect(dayKeyOf(new Date("2026-07-16T16:00:00Z"))).toBe("2026-07-17");
    expect(dayKeyOf(new Date("2026-07-17T15:59:59Z"))).toBe("2026-07-17");
    expect(dayKeyOf(new Date("2026-07-17T16:00:00Z"))).toBe("2026-07-18");
  });
});

describe("dayKeyToStart", () => {
  it("日键解析为该日东八区零点（UTC 前一日 16:00）", () => {
    expect(dayKeyToStart("2026-07-17").toISOString()).toBe("2026-07-16T16:00:00.000Z");
  });
});

describe("shiftDayKey", () => {
  it("向后偏移一天", () => {
    expect(shiftDayKey("2026-07-17", 1)).toBe("2026-07-18");
  });

  it("向前偏移一天", () => {
    expect(shiftDayKey("2026-07-17", -1)).toBe("2026-07-16");
  });

  it("跨月", () => {
    expect(shiftDayKey("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("跨年", () => {
    expect(shiftDayKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});
