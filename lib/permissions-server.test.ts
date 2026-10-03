import { beforeEach, describe, expect, it, vi } from "vitest";
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { rolePermission: { findUnique } } }));
import { getRolePermissions } from "./permissions-server";
import { DEFAULT_ROLE_PERMISSIONS, ALL_PERMISSIONS } from "./permissions";

describe("权限配置失败方向", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it.each(["null", '"manage_posts"', '["unknown"]', "{"])("损坏配置 %s 不恢复默认权限", async (permissions) => {
    findUnique.mockResolvedValue({ permissions });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getRolePermissions("ADMIN")).toEqual([]);
    log.mockRestore();
  });
  it("保留未配置角色的默认行为和显式空权限", async () => {
    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ permissions: "[]" });
    expect(await getRolePermissions("ADMIN")).toEqual(DEFAULT_ROLE_PERMISSIONS.ADMIN);
    expect(await getRolePermissions("ADMIN")).toEqual([]);
  });
  it("超级管理员权限不依赖配置表", async () => {
    expect(await getRolePermissions("SUPER_ADMIN")).toEqual(ALL_PERMISSIONS);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
