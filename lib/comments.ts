import { prisma } from "@/lib/prisma";

// 分页按顶层评论计数，回复随父评论加载。
export const COMMENTS_PER_PAGE = 10;

// 仅返回已审核的顶层评论和一层回复。
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

// 总数包含顶层评论和回复，不受分页影响。
export async function getCommentCounts(postId: string) {
  const [topLevel, replies] = await Promise.all([
    prisma.comment.count({ where: { postId, isApproved: true, parentId: null } }),
    prisma.comment.count({ where: { postId, isApproved: true, parentId: { not: null } } }),
  ]);
  return { topLevel, total: topLevel + replies };
}

export type CommentWithReplies = Awaited<ReturnType<typeof getApprovedComments>>[number];
