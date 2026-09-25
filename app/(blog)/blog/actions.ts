"use server";

// 公开互动需登录并具备对应权限。
import { revalidatePath } from "next/cache";
import { getFreshUser, requirePermission } from "@/lib/auth";
import { getApprovedComments, type CommentWithReplies } from "@/lib/comments";
import { getMuteInfo } from "@/lib/mute";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { ROLES } from "@/lib/roles";
import { commentPageSchema, commentSchema, likeSchema, parseId, parseInput } from "@/lib/validation";

export type CommentActionState = { ok: boolean; error?: string; message?: string };

// 评论默认进入审核状态。
export async function submitComment(payload: unknown): Promise<CommentActionState> {
  const user = await requirePermission(PERMISSIONS.COMMENT);
  if (!user) return { ok: false, error: "请先登录再评论" };

  // SUPER_ADMIN 不受禁言限制。
  if (user.role !== ROLES.SUPER_ADMIN) {
    const mute = await getMuteInfo(user.id);
    if (mute.muted) {
      const untilText = mute.permanent
        ? ""
        : mute.until
          ? `，解禁时间为 ${new Date(mute.until).toLocaleString("zh-CN")}`
          : "";
      return { ok: false, error: `你已被禁言${untilText}${mute.reason ? `，原因：${mute.reason}` : ""}` };
    }
  }

  const parsed = parseInput(commentSchema, payload);
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { postId, slug, content, parentId } = parsed.data;

  const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;

  // 普通用户每 30 秒一条；SUPER_ADMIN 不限流。
  if (!isSuperAdmin) {
    const check = await rateLimit.checkAndHit("comment", user.id, 1, 30 * 1000);
    if (check.blocked) {
      return { ok: false, error: `操作过于频繁，请 ${check.retryAfterSec} 秒后再试` };
    }
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

  await prisma.comment.create({
    data: {
      content,
      postId,
      authorId: user.id,
      parentId: parentId ?? null,
      isApproved: isSuperAdmin,
    },
  });

  // SUPER_ADMIN 评论直接公开。
  if (!isSuperAdmin) {
    await notifyAdmins({
      category: NOTIFICATION_CATEGORIES.COMMENT,
      type: parentId ? "reply_pending" : "comment_pending",
      actorName: user.name,
      title: parentId ? "回复了评论，待审核" : `评论了你的文章《${post.title}》，待审核`,
      link: "/admin/comments",
      // 按「文章 + 类型」聚合
      aggregateKey: `${parentId ? "reply_pending" : "comment_pending"}:${postId}`,
    });
  }

  revalidatePath(`/blog/${slug}`);
  return {
    ok: true,
    message: isSuperAdmin ? "评论已发布" : "评论已提交，博主审核通过后会显示在这里",
  };
}

export async function toggleLike(
  postId: string,
  slug: string
): Promise<CommentActionState & { liked?: boolean; count?: number }> {
  const user = await requirePermission(PERMISSIONS.LIKE);
  if (!user) return { ok: false, error: "请先登录再点赞" };

  const parsed = parseInput(likeSchema, { postId, slug });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { postId: pid } = parsed.data;

  // 点赞限流防止高频写入；SUPER_ADMIN 不限流。
  if (user.role !== ROLES.SUPER_ADMIN) {
    const check = await rateLimit.checkAndHit("like", user.id, 30, 60 * 1000);
    if (check.blocked) {
      return { ok: false, error: `操作过于频繁，请 ${check.retryAfterSec} 秒后再试` };
    }
  }

  // 先校验文章，避免伪造 postId 触发外键错误。
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
        // 同一篇文章的点赞合并为一条
        aggregateKey: `like:${post.id}`,
      });
    }
  }
  const count = await prisma.like.count({ where: { postId: pid } });

  revalidatePath(`/blog/${parsed.data.slug}`);
  return { ok: true, liked: !existing, count };
}

// 收藏仅要求登录，不设独立权限。
export async function toggleBookmark(
  postId: string
): Promise<CommentActionState & { bookmarked?: boolean }> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "请先登录" };

  const parsed = parseId(postId);
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };

  // 仅允许收藏公开文章。
  const post = await prisma.post.findFirst({
    where: { id: parsed.data, published: true, archived: false },
    select: { id: true },
  });
  if (!post) return { ok: false, error: "文章不存在" };

  const key = { userId_postId: { userId: user.id, postId: parsed.data } };
  const existing = await prisma.bookmark.findUnique({ where: key });
  if (existing) {
    await prisma.bookmark.delete({ where: key });
  } else {
    await prisma.bookmark.create({ data: { userId: user.id, postId: parsed.data } });
  }

  return { ok: true, bookmarked: !existing };
}

// 评论公开读取，但校验 postId 和 skip；客户端根据 topLevel 判断是否还有更多。
export async function getMoreComments(
  postId: string,
  skip: number
): Promise<{ ok: boolean; error?: string; comments: CommentWithReplies[] }> {
  const parsed = parseInput(commentPageSchema, { postId, skip });
  if (!parsed.data) {
    return { ok: false, error: parsed.error ?? "参数不合法", comments: [] };
  }

  // 游客请求按 IP 限流。
  const ip = await getClientIp();
  const ipCheck = await rateLimit.checkAndHit("comments-fetch", ip, 30, 60 * 1000);
  if (ipCheck.blocked) {
    return { ok: false, error: `操作过于频繁，请 ${ipCheck.retryAfterSec} 秒后再试`, comments: [] };
  }

  // 仅查询公开文章。
  const post = await prisma.post.findFirst({
    where: { id: parsed.data.postId, published: true, archived: false },
    select: { id: true },
  });
  if (!post) return { ok: false, error: "文章不存在", comments: [] };

  const comments = await getApprovedComments(parsed.data.postId, { skip: parsed.data.skip });
  return { ok: true, comments };
}
