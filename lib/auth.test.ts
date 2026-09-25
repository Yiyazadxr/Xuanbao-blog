import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), update: vi.fn(), checkAndHit: vi.fn(), reset: vi.fn(), compare: vi.fn(),
  authorize: undefined as undefined | ((credentials: unknown) => Promise<unknown>),
}));
vi.mock("next-auth", () => ({ default: (config: { providers: { authorize: typeof mocks.authorize }[] }) => {
  mocks.authorize = config.providers[0].authorize;
  return {};
} }));
vi.mock("next-auth/providers/credentials", () => ({ default: (config: unknown) => config }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique, update: mocks.update } } }));
vi.mock("@/lib/permissions-server", () => ({ hasPermission: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: async () => "127.0.0.1", rateLimit: mocks }));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare } }));

describe("认证入口限流", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.checkAndHit.mockResolvedValue({ blocked: false });
  });

  it("直接认证请求超过 IP 限额时不查询用户或计算密码", async () => {
    await import("@/lib/auth");
    mocks.checkAndHit.mockResolvedValueOnce({ blocked: true });
    expect(await mocks.authorize!({ email: "test@example.com", password: "password123" })).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.compare).not.toHaveBeenCalled();
  });

  it("邮箱限额独立生效", async () => {
    await import("@/lib/auth");
    mocks.checkAndHit.mockResolvedValueOnce({ blocked: false }).mockResolvedValueOnce({ blocked: true });
    expect(await mocks.authorize!({ email: "test@example.com", password: "password123" })).toBeNull();
    expect(mocks.checkAndHit).toHaveBeenCalledTimes(2);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("无效输入不触发数据库请求", async () => {
    await import("@/lib/auth");
    expect(await mocks.authorize!({ email: "invalid", password: "" })).toBeNull();
    expect(mocks.checkAndHit).not.toHaveBeenCalled();
  });
});
