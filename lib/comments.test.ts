import { expect, it, vi } from "vitest";
const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { comment: { findMany } } }));
import { getApprovedComments } from "@/lib/comments";

it("分页使用稳定双字段边界，删除游标评论后仍能继续", async () => {
  findMany.mockResolvedValue([]);
  await getApprovedComments("post", { cursor: { id: "deleted", createdAt: "2026-01-01T00:00:00.000Z" } });
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ OR: [
      { createdAt: { lt: new Date("2026-01-01T00:00:00Z") } },
      { createdAt: new Date("2026-01-01T00:00:00Z"), id: { lt: "deleted" } },
    ] }),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  }));
});

it("多取一条判断下一页，末页不依赖旧总数", async () => {
  const make = (id: string) => ({ id, content: "评论", createdAt: new Date("2026-01-01T00:00:00Z"), author: { id: "user", name: "用户", image: null }, replies: [] });
  findMany.mockResolvedValue([make("c"), make("b"), make("a")]);
  const page = await getApprovedComments("post", { take: 2 });
  expect(page.comments.map((c) => c.id)).toEqual(["c", "b"]);
  expect(page.nextCursor?.id).toBe("b");
  findMany.mockResolvedValue([make("a")]);
  expect((await getApprovedComments("post", { take: 2, cursor: page.nextCursor })).nextCursor).toBeNull();
});
