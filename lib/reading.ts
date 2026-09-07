// 阅读统计数据层：记录登录用户读过的文章（去重），供个人页聚合累计阅读字数
import { prisma } from "@/lib/prisma";

// 记录一次阅读（仅登录用户）。wordCount 为文章已落库的字数快照（旧文章可能为 null，按 0 计）。
// 同一文章重复阅读不重复计数：用 upsert 原子去重，失败不影响页面渲染。
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

// 个人阅读统计：已读文章数 + 累计阅读字数
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
