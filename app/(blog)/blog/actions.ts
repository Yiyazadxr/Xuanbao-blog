"use server";

// 评论与点赞 Server Actions（公开侧，需登录且拥有对应权限）
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { commentSchema, likeSchema, parseInput } from "@/lib/validation";

export type CommentActionState = { ok: boolean; error?: string; message?: string };

// 提交评论（审核制：默认不可见）
export async function submitComment(payload: unknown): Promise<CommentActionState> {
  const user = await requirePermission(PERMISSIONS.COMMENT);
  if (!user) return { ok: false, error: "请先登录再评论" };

  const parsed = parseInput(commentSchema, payload);
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { postId, slug, content, parentId } = parsed.data;

  // 单用户节流：30 秒内只能发一条（防刷评论淹没审核后台）
  const lastComment = await prisma.comment.findFirst({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (lastComment && Date.now() - lastComment.createdAt.getTime() < 30 * 1000) {
    return { ok: false, error: "评论太频繁了，请稍等 30 秒再试" };
  }

  const post = await prisma.post.findFirst({ where: { id: postId, published: true, archived: false } });
  if (!post) return { ok: false, error: "文章不存在" };

  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, postId, isApproved: true },
    });
    if (!parent) return { ok: false, error: "回复的评论不存在" };
    if (parent.parentId) return { ok: false, error: "只支持一层回复" };
  }

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  await prisma.comment.create({
    data: {
      content,
      postId,
      authorId: user.id,
      parentId: parentId ?? null,
      isApproved: isSuperAdmin,
    },
  });

  // 超管评论直接显示，无需审核通知
  if (!isSuperAdmin) {
    await notifyAdmins({
      category: NOTIFICATION_CATEGORIES.COMMENT,
      type: parentId ? "reply_pending" : "comment_pending",
      actorName: user.name,
      title: parentId ? "回复了评论，待审核" : `评论了你的文章《${post.title}》，待审核`,
      link: "/admin/comments",
    });
  }

  revalidatePath(`/blog/${slug}`);
  return {
    ok: true,
    message: isSuperAdmin ? "评论已发布" : "评论已提交，博主审核通过后会显示在这里",
  };
}

// 点赞 / 取消点赞
export async function toggleLike(
  postId: string,
  slug: string
): Promise<CommentActionState & { liked?: boolean; count?: number }> {
  const user = await requirePermission(PERMISSIONS.LIKE);
  if (!user) return { ok: false, error: "请先登录再点赞" };

  const parsed = parseInput(likeSchema, { postId, slug });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { postId: pid } = parsed.data;

  // 校验文章存在（防伪造 postId 触发外键错误 / 给不存在的文章点赞）
  const post = await prisma.post.findFirst({
    where: { id: pid, published: true, archived: false },
    select: { id: true, title: true, slug: true, authorId: true },
  });
  if (!post) return { ok: false, error: "文章不存在" };

  const key = { userId_postId: { userId: user.id, postId: pid } };
  const existing = await prisma.like.findUnique({ where: key });
  if (existing) {
    await prisma.like.delete({ where: key });
  } else {
    await prisma.like.create({ data: { userId: user.id, postId: pid } });
    // 站内通知文章作者有人点赞（自己赞自己不通知）
    if (post.authorId !== user.id) {
      await createNotification(post.authorId, {
        category: NOTIFICATION_CATEGORIES.LIKE,
        type: "like",
        actorName: user.name,
        title: `赞了你的文章《${post.title}》`,
        link: `/blog/${post.slug}`,
      });
    }
  }
  const count = await prisma.like.count({ where: { postId: pid } });

  revalidatePath(`/blog/${parsed.data.slug}`);
  return { ok: true, liked: !existing, count };
}
