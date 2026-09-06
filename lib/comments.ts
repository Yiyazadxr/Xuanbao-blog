// 评论数据查询层
import { prisma } from "@/lib/prisma";

// 每页顶层评论数（回复随其顶层评论一起加载）
export const COMMENTS_PER_PAGE = 10;

// 某篇文章的已审核评论（顶层 + 一层回复），支持分页
export async function getApprovedComments(
  postId: string,
  { skip = 0, take = COMMENTS_PER_PAGE }: { skip?: number; take?: number } = {}
) {
  return prisma.comment.findMany({
    where: { postId, isApproved: true, parentId: null },
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: {
      author: { select: { id: true, name: true, image: true } },
      replies: {
        where: { isApproved: true },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, image: true } } },
      },
    },
  });
}

// 评论计数：顶层评论数 + 回复总数（分页时仍展示真实总数）
export async function getCommentCounts(postId: string) {
  const [topLevel, replies] = await Promise.all([
    prisma.comment.count({ where: { postId, isApproved: true, parentId: null } }),
    prisma.comment.count({ where: { postId, isApproved: true, parentId: { not: null } } }),
  ]);
  return { topLevel, total: topLevel + replies };
}

export type CommentWithReplies = Awaited<ReturnType<typeof getApprovedComments>>[number];
