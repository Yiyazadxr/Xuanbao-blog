"use server";

// 评论与点赞 Server Actions（公开侧，需登录且拥有对应权限）
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
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
  const user = await requirePermission(PERMISSIONS.COMMENT);
  if (!user) return { ok: false, error: "请先登录再评论" };

  const text = content.trim();
  if (!text) return { ok: false, error: "评论内容不能为空" };
  if (text.length > 1000) return { ok: false, error: "评论最多 1000 字" };

  // 单用户节流：30 秒内只能发一条（防刷评论淹没审核后台）
  const lastComment = await prisma.comment.findFirst({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (lastComment && Date.now() - lastComment.createdAt.getTime() < 30 * 1000) {
    return { ok: false, error: "评论太频繁了，请稍等 30 秒再试" };
  }

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
  const user = await requirePermission(PERMISSIONS.LIKE);
  if (!user) return { ok: false, error: "请先登录再点赞" };

  // 校验文章存在（防伪造 postId 触发外键错误 / 给不存在的文章点赞）
  const post = await prisma.post.findFirst({
    where: { id: postId, published: true },
    select: { id: true },
  });
  if (!post) return { ok: false, error: "文章不存在" };

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
