import { describe, expect, it } from "vitest";
import { normalizePermissions, PERMISSIONS } from "@/lib/permissions";

describe("normalizePermissions", () => {
  it("保留合法权限并去重", () => {
    expect(
      normalizePermissions([
        PERMISSIONS.COMMENT,
        PERMISSIONS.LIKE,
        PERMISSIONS.COMMENT,
      ])
    ).toEqual([PERMISSIONS.COMMENT, PERMISSIONS.LIKE]);
  });

  it("保留合法空数组以表达零权限", () => {
    expect(normalizePermissions([])).toEqual([]);
  });

  it("过滤非法权限值", () => {
    expect(normalizePermissions([PERMISSIONS.COMMENT, "unknown", null, 1])).toEqual([
      PERMISSIONS.COMMENT,
    ]);
  });

  it("全部为非法值时视为损坏配置", () => {
    expect(normalizePermissions(["unknown", null, 1])).toBeNull();
  });

  it("非数组配置视为损坏", () => {
    expect(normalizePermissions("comment")).toBeNull();
    expect(normalizePermissions(null)).toBeNull();
  });
});
