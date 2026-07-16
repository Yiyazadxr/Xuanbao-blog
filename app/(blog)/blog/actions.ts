"use server";

// 评论与点赞 Server Actions（公开侧，需登录）
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CommentActionState = { ok: boolean; error?: string; message?: string };

// 提交评论（审核制：默认不可见）
export async function submitComment({
  postId,
  slug,
  content,
  parentId,
}: {
  postId: string;
  slug: string;
  content: string;
  parentId?: string;
}): Promise<CommentActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "请先登录再评论" };

  const text = content.trim();
  if (!text) return { ok: false, error: "评论内容不能为空" };
  if (text.length > 1000) return { ok: false, error: "评论最多 1000 字" };

  const post = await prisma.post.findFirst({ where: { id: postId, published: true } });
  if (!post) return { ok: false, error: "文章不存在" };

  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, postId, isApproved: true },
    });
    if (!parent) return { ok: false, error: "回复的评论不存在" };
    if (parent.parentId) return { ok: false, error: "只支持一层回复" };
  }

  await prisma.comment.create({
    data: { content: text, postId, authorId: user.id, parentId: parentId ?? null },
  });

  revalidatePath(`/blog/${slug}`);
  return { ok: true, message: "评论已提交，博主审核通过后会显示在这里" };
}

// 点赞 / 取消点赞
export async function toggleLike(
  postId: string,
  slug: string
): Promise<CommentActionState & { liked?: boolean; count?: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "请先登录再点赞" };

  const key = { userId_postId: { userId: user.id, postId } };
  const existing = await prisma.like.findUnique({ where: key });
  if (existing) {
    await prisma.like.delete({ where: key });
  } else {
    await prisma.like.create({ data: { userId: user.id, postId } });
  }
  const count = await prisma.like.count({ where: { postId } });

  revalidatePath(`/blog/${slug}`);
  return { ok: true, liked: !existing, count };
}
