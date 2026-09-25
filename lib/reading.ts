import { prisma } from "@/lib/prisma";

// wordCount 保存首次阅读快照；upsert 原子去重，失败不影响页面。
export async function recordRead(postId: string, userId?: string, wordCount?: number | null) {
  if (!userId) return;
  try {
    await prisma.readingLog.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId, wordCount: wordCount ?? 0 },
      update: {},
    });
  } catch (e) {
    console.error("记录阅读失败：", e);
  }
}

export async function getReadingStats(userId: string) {
  const agg = await prisma.readingLog.aggregate({
    where: { userId },
    _sum: { wordCount: true },
    _count: true,
  });
  return {
    postsRead: agg._count,
    wordsRead: agg._sum.wordCount ?? 0,
  };
}
