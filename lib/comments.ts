// 评论数据查询层
import { prisma } from "@/lib/prisma";

// 某篇文章的已审核评论（顶层 + 一层回复）
export async function getApprovedComments(postId: string) {
  return prisma.comment.findMany({
    where: { postId, isApproved: true, parentId: null },
    orderBy: { createdAt: "desc" },
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

export type CommentWithReplies = Awaited<ReturnType<typeof getApprovedComments>>[number];
