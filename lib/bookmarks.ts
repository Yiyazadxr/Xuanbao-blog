import { prisma } from "@/lib/prisma";
import { listSelect, PUBLISHED_FILTER, toListItem, type PostListItem } from "@/lib/posts";

export async function getBookmarkInfo(postId: string, userId?: string) {
  const bookmarked = userId
    ? Boolean(await prisma.bookmark.findUnique({ where: { userId_postId: { userId, postId } } }))
    : false;
  return { bookmarked };
}

export async function getBookmarkCount(userId: string) {
  return prisma.bookmark.count({ where: { userId, post: PUBLISHED_FILTER } });
}

// 收藏列表仅含公开文章，并复用文章卡片字段。
export async function getBookmarkedPosts(userId: string): Promise<PostListItem[]> {
  const rows = await prisma.bookmark.findMany({
    where: { userId, post: PUBLISHED_FILTER },
    orderBy: { createdAt: "desc" },
    select: { post: { select: listSelect } },
  });
  return rows.map((r) => toListItem(r.post));
}
