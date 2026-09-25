import { prisma } from "@/lib/prisma";

// 文章点赞数 + 当前用户是否已赞
export async function getLikeInfo(postId: string, userId?: string) {
  const [count, mine] = await Promise.all([
    prisma.like.count({ where: { postId } }),
    userId
      ? prisma.like.findUnique({ where: { userId_postId: { userId, postId } } })
      : Promise.resolve(null),
  ]);
  return { count, liked: Boolean(mine) };
}
