import { beforeEach, describe, expect, it, vi } from "vitest";

const { tx, snapshot, transaction } = vi.hoisted(() => {
  const tx = {
    postRevision: { findUnique: vi.fn() },
    post: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    category: { findUnique: vi.fn() }, series: { findUnique: vi.fn() },
    tag: { upsert: vi.fn() },
    postTag: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  return { tx, snapshot: vi.fn(), transaction: vi.fn(async (fn) => fn(tx)) };
});
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
vi.mock("@/lib/post-revisions", () => ({ snapshotPost: snapshot }));

import { restoreRevision } from "@/lib/post-write";

describe("文章版本恢复", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.postRevision.findUnique.mockResolvedValue({
      postId: "post", title: "旧标题", slug: "old", content: "正文",
      excerpt: null, coverImage: null, categoryId: "deleted", seriesId: "deleted",
      published: true, pinned: false, featured: false, archived: false,
      tags: '["React","React"]',
    });
    tx.post.findUnique.mockResolvedValue({ id: "post", publishedAt: null, tags: [] });
    tx.post.findFirst.mockResolvedValue(null);
    tx.category.findUnique.mockResolvedValue(null);
    tx.series.findUnique.mockResolvedValue(null);
    tx.tag.upsert.mockResolvedValue({ id: "tag" });
  });

  it("恢复已删除分类的版本时清空失效关联，补齐首次发布时间并去重标签", async () => {
    await restoreRevision("revision", "admin");
    expect(tx.post.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      categoryId: null, seriesId: null, publishedAt: expect.any(Date),
    }) }));
    expect(tx.tag.upsert).toHaveBeenCalledTimes(1);
    expect(snapshot).toHaveBeenCalledWith(tx, expect.objectContaining({ id: "post" }), "admin");
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });

  it("保留原始首次发布时间", async () => {
    const publishedAt = new Date("2025-01-01T00:00:00Z");
    tx.post.findUnique.mockResolvedValue({ id: "post", publishedAt, tags: [] });
    await restoreRevision("revision", "admin");
    expect(tx.post.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ publishedAt }),
    }));
  });

  it("损坏的标签数据阻止恢复且不创建快照或写入文章", async () => {
    tx.postRevision.findUnique.mockResolvedValue({ postId: "post", slug: "old", tags: "broken" });
    await expect(restoreRevision("revision", "admin")).rejects.toThrow("版本标签数据损坏");
    expect(snapshot).not.toHaveBeenCalled();
    expect(tx.post.update).not.toHaveBeenCalled();
  });

  it("链接冲突时不更改文章", async () => {
    tx.post.findFirst.mockResolvedValue({ id: "other" });
    await expect(restoreRevision("revision", "admin")).rejects.toThrow("已被其他文章占用");
    expect(snapshot).not.toHaveBeenCalled();
    expect(tx.post.update).not.toHaveBeenCalled();
  });
});
