import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBookmarkInfo } from "@/lib/bookmarks";
import { getLikeInfo } from "@/lib/likes";
import { prisma } from "@/lib/prisma";

// 文章互动状态（按用户个性化）：点赞/收藏状态 + 点赞数。
// 文章详情页改为 ISR 后，这部分由客户端挂载后按需拉取。
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, published: true, archived: true },
  });
  if (!post || !post.published || post.archived) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const [like, bookmark] = await Promise.all([
    getLikeInfo(post.id, user?.id),
    getBookmarkInfo(post.id, user?.id),
  ]);

  return NextResponse.json({
    likeCount: like.count,
    liked: like.liked,
    bookmarked: bookmark.bookmarked,
    isLoggedIn: Boolean(user),
  });
}
