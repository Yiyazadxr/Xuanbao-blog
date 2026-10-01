import { describe, expect, it } from "vitest";
import { getFestivalsForDay } from "@/lib/festivals";
import { dayKeyOf } from "@/lib/day-key";

describe("节日当日规则", () => {
  it.each([
    ["2026-01-01", ["new-year"]],
    ["2026-02-03", []],
    ["2026-02-17", ["spring-festival"]],
    ["2026-03-08", ["womens-day"]],
    ["2026-03-12", ["arbor-day"]],
    ["2027-02-07", ["spring-festival"]],
    ["2026-03-03", ["lantern-festival"]],
    ["2026-09-25", ["mid-autumn"]],
    ["2026-04-05", ["qingming"]],
    ["2028-04-04", ["qingming"]],
    ["2029-04-04", ["qingming"]],
    ["2030-04-05", ["qingming"]],
    ["2026-05-01", ["labor-day"]],
    ["2026-05-04", ["youth-day"]],
    ["2026-05-10", ["mothers-day"]],
    ["2026-05-12", ["wenchuan-remembrance"]],
    ["2026-06-19", ["dragon-boat"]],
    ["2026-06-01", ["childrens-day"]],
    ["2026-07-01", ["party-anniversary"]],
    ["2026-08-01", ["army-day"]],
    ["2026-09-18", ["september-eighteenth"]],
    ["2026-09-30", []],
    ["2027-09-15", ["mid-autumn"]],
    ["2026-12-13", ["national-memorial-day"]],
    ["2026-10-01", ["national-day"]],
    ["2020-10-01", ["national-day", "mid-autumn"]],
    ["2026-10-02", []],
    ["2026-02-18", []],
    ["2026-01-02", []],
    ["2026-04-04", []],
    ["2026-06-20", []],
    ["2026-06-21", ["fathers-day"]],
    ["2026-09-26", []],
    ["2026-02-30", []],
    ["", []],
  ])("%s", (day, expected) => {
    expect(getFestivalsForDay(day)).toEqual(expected);
  });

  it("按东八区半开区间开始和结束", () => {
    expect(getFestivalsForDay(dayKeyOf(new Date("2026-09-29T15:59:59.999Z")))).toEqual([]);
    expect(getFestivalsForDay(dayKeyOf(new Date("2026-09-30T16:00:00Z")))).toEqual(["national-day"]);
    expect(getFestivalsForDay(dayKeyOf(new Date("2026-10-01T16:00:00Z")))).toEqual([]);
  });

  it("母亲节按公历五月第二个星期日计算", () => {
    expect(getFestivalsForDay("2027-05-09")).toContain("mothers-day");
    expect(getFestivalsForDay("2027-05-16")).not.toContain("mothers-day");
  });

  it("父亲节按公历六月第三个星期日计算", () => {
    expect(getFestivalsForDay("2026-06-21")).toContain("fathers-day");
    expect(getFestivalsForDay("2026-06-14")).not.toContain("fathers-day");
  });

  it("可在同一天保留多个节日", () => {
    expect(getFestivalsForDay("2026-05-12")).toEqual(["wenchuan-remembrance"]);
    expect(getFestivalsForDay("2020-10-01")).toEqual(["national-day", "mid-autumn"]);
  });
});
