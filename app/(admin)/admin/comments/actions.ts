"use server";

// 评论审核 Server Actions：通过 / 删除（按权限校验；删除允许评论作者自助删除自己的评论）
import { revalidatePath } from "next/cache";
import { getFreshUser, requirePermission } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import { parseId } from "@/lib/validation";
import type { AdminActionState } from "../action-types";

// 审核通过评论
export async function approveComment(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.APPROVE_COMMENTS);
  if (!admin) return { ok: false, error: "无权限" };
  const cid = parseId(id);
  if (!cid.data) return { ok: false, error: cid.error ?? "参数不合法" };
  const comment = await prisma.comment.findUnique({
    where: { id: cid.data },
    include: {
      post: { select: { slug: true, title: true, authorId: true } },
      author: { select: { name: true } },
      parent: { select: { authorId: true } },
    },
  });
  if (!comment) return { ok: false, error: "评论不存在" };
  await prisma.comment.update({ where: { id: cid.data }, data: { isApproved: true } });
  // 站内通知评论作者
  if (comment.authorId !== admin.id) {
    await createNotification(comment.authorId, {
      category: NOTIFICATION_CATEGORIES.SYSTEM,
      type: "comment_approved",
      title: "你的评论已通过审核",
      link: `/blog/${comment.post.slug}`,
      // 同一文章下多条评论通过合并为一条
      aggregateKey: `comment_approved:${comment.postId}`,
    });
  }
  // 通知文章作者有人评论了你的文章
  if (
    comment.post.authorId !== comment.authorId &&
    comment.post.authorId !== admin.id
  ) {
    await createNotification(comment.post.authorId, {
      category: NOTIFICATION_CATEGORIES.COMMENT,
      type: "comment",
      actorName: comment.author.name,
      title: `评论了你的文章《${comment.post.title}》`,
      link: `/blog/${comment.post.slug}`,
      // 同一文章的评论合并
      aggregateKey: `comment:${comment.postId}`,
    });
  }
  // 若为回复，通知被回复的用户
  if (
    comment.parent &&
    comment.parent.authorId !== comment.authorId &&
    comment.parent.authorId !== admin.id
  ) {
    await createNotification(comment.parent.authorId, {
      category: NOTIFICATION_CATEGORIES.COMMENT,
      type: "reply",
      actorName: comment.author.name,
      title: "回复了你的评论",
      link: `/blog/${comment.post.slug}`,
      // 同一文章下的回复合并
      aggregateKey: `reply:${comment.postId}`,
    });
  }
  revalidatePath(`/blog/${comment.post.slug}`);
  revalidatePath("/admin/comments");
  return { ok: true, message: "已通过" };
}

// 删除评论
export async function deleteComment(id: string): Promise<AdminActionState> {
  const user = await getFreshUser();
  if (!user) return { ok: false, error: "无权限" };
  const moderator = await hasPermission(user.role as Role, PERMISSIONS.DELETE_COMMENTS);
  const cid = parseId(id);
  if (!cid.data) return { ok: false, error: cid.error ?? "参数不合法" };
  const comment = await prisma.comment.findUnique({
    where: { id: cid.data },
    include: { post: { select: { slug: true } } },
  });
  if (!comment) return { ok: false, error: "评论不存在" };
  const permitted = moderator || comment.authorId === user.id;
  if (!permitted) return { ok: false, error: "无权限" };
  await prisma.comment.deleteMany({ where: { OR: [{ id: cid.data }, { parentId: cid.data }] } });
  revalidatePath(`/blog/${comment.post.slug}`);
  revalidatePath("/admin/comments");
  return { ok: true, message: "已删除" };
}
