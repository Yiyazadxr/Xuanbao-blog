// 收藏（书签）数据查询层
import { prisma } from "@/lib/prisma";
import { listSelect, PUBLISHED_FILTER, toListItem, type PostListItem } from "@/lib/posts";

// 当前用户是否已收藏该文章
export async function getBookmarkInfo(postId: string, userId?: string) {
  const bookmarked = userId
    ? Boolean(await prisma.bookmark.findUnique({ where: { userId_postId: { userId, postId } } }))
    : false;
  return { bookmarked };
}

// 当前用户收藏的文章数（供个人页展示）
export async function getBookmarkCount(userId: string) {
  return prisma.bookmark.count({ where: { userId, post: PUBLISHED_FILTER } });
}

// 当前用户的收藏列表（仅公开文章，新→旧），复用 listSelect 保证卡片字段口径一致
export async function getBookmarkedPosts(userId: string): Promise<PostListItem[]> {
  const rows = await prisma.bookmark.findMany({
    where: { userId, post: PUBLISHED_FILTER },
    orderBy: { createdAt: "desc" },
    select: { post: { select: listSelect } },
  });
  return rows.map((r) => toListItem(r.post));
}
