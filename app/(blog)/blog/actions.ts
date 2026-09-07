"use server";

// 评论与点赞 Server Actions（公开侧，需登录且拥有对应权限）
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { getApprovedComments, type CommentWithReplies } from "@/lib/comments";
import { getMuteInfo } from "@/lib/mute";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { ROLES } from "@/lib/roles";
import { commentPageSchema, commentSchema, likeSchema, parseInput } from "@/lib/validation";

export type CommentActionState = { ok: boolean; error?: string; message?: string };

// 提交评论（审核制：默认不可见）
export async function submitComment(payload: unknown): Promise<CommentActionState> {
  const user = await requirePermission(PERMISSIONS.COMMENT);
  if (!user) return { ok: false, error: "请先登录再评论" };

  // 禁言拦截：被禁言用户不能发表评论/回复（超管除外）
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

  // 普通用户限流：30 秒内只能发一条（防刷评论淹没审核后台）；超管不受限。
  // 统一走 DB 限流器（与登录/注册同款），消除自造"查最后一条评论时间"的双轨逻辑
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

  // 超管评论直接显示，无需审核通知
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

  // 限流：防高频点赞刷 DB 写与通知；超管不受限
  if (user.role !== ROLES.SUPER_ADMIN) {
    const check = await rateLimit.checkAndHit("like", user.id, 30, 60 * 1000);
    if (check.blocked) {
      return { ok: false, error: `操作过于频繁，请 ${check.retryAfterSec} 秒后再试` };
    }
  }

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
        // 同一篇文章的点赞合并为一条
        aggregateKey: `like:${post.id}`,
      });
    }
  }
  const count = await prisma.like.count({ where: { postId: pid } });

  revalidatePath(`/blog/${parsed.data.slug}`);
  return { ok: true, liked: !existing, count };
}

// 加载更多评论（公开读，游客也可查看；校验 postId/skip 防滥用，不做权限拦截）。
// 是否还有更多由客户端用 topLevel 判断，这里不再重复 count 查询
export async function getMoreComments(
  postId: string,
  skip: number
): Promise<{ ok: boolean; error?: string; comments: CommentWithReplies[] }> {
  const parsed = parseInput(commentPageSchema, { postId, skip });
  if (!parsed.data) {
    return { ok: false, error: parsed.error ?? "参数不合法", comments: [] };
  }

  // 限流：游客可调用，按 IP 限制拉取频率，防滥用
  const ip = await getClientIp();
  const ipCheck = await rateLimit.checkAndHit("comments-fetch", ip, 30, 60 * 1000);
  if (ipCheck.blocked) {
    return { ok: false, error: `操作过于频繁，请 ${ipCheck.retryAfterSec} 秒后再试`, comments: [] };
  }

  // 校验文章存在且公开，避免对不存在/未公开文章发起无意义查询
  const post = await prisma.post.findFirst({
    where: { id: parsed.data.postId, published: true, archived: false },
    select: { id: true },
  });
  if (!post) return { ok: false, error: "文章不存在", comments: [] };

  const comments = await getApprovedComments(parsed.data.postId, { skip: parsed.data.skip });
  return { ok: true, comments };
}
