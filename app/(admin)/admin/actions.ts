"use server";

// 后台管理 Server Actions：每个操作都按具体权限校验（双重保险）
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createInviteCode } from "@/lib/invites";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { parseId, parseInput, postSchema } from "@/lib/validation";

export type AdminActionState = { ok: boolean; error?: string; message?: string };

// 新建/更新文章（id 为空则新建）
export async function savePost(
  payload: unknown
): Promise<AdminActionState & { id?: string }> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };

  const parsed = parseInput(postSchema, payload);
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const p = parsed.data;

  const slug = slugify(p.slug.trim() || p.title);

  // slug 唯一性检查（编辑时排除自己）
  const dup = await prisma.post.findFirst({
    where: { slug, ...(p.id ? { id: { not: p.id } } : {}) },
  });
  if (dup) return { ok: false, error: `slug「${slug}」已被文章「${dup.title}」占用` };

  // 校验分类存在（可选字段，但传入的值必须真实，防伪造 categoryId 触发外键错误）
  if (p.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: p.categoryId } });
    if (!category) return { ok: false, error: "分类不存在" };
  }

  const existing = p.id ? await prisma.post.findUnique({ where: { id: p.id } }) : null;
  if (p.id && !existing) return { ok: false, error: "文章不存在" };

  // 解析标签：逗号/顿号分隔，去重
  const tagNames = [
    ...new Set(
      p.tags
        .split(/[,，、]/)
        .map((t) => t.trim())
        .filter(Boolean)
    ),
  ];

  // 首次发布时记录发布时间，之后保留
  const publishedAt = p.published
    ? (existing?.publishedAt ?? new Date())
    : (existing?.publishedAt ?? null);

  const data = {
    title: p.title,
    slug,
    content: p.content,
    excerpt: p.excerpt || null,
    categoryId: p.categoryId || null,
    published: p.published,
    publishedAt,
    archived: p.archived,
    pinned: p.pinned,
    featured: p.featured,
  };

  try {
    const postId = await prisma.$transaction(async (tx) => {
      // 标签 upsert
      const tags = await Promise.all(
        tagNames.map((name) =>
          tx.tag.upsert({
            where: { name },
            update: {},
            create: { name, slug: slugify(name) },
          })
        )
      );

      let id = p.id;
      if (id) {
        await tx.post.update({ where: { id }, data });
        await tx.postTag.deleteMany({ where: { postId: id } });
      } else {
        const created = await tx.post.create({ data: { ...data, authorId: admin.id } });
        id = created.id;
      }
      if (tags.length) {
        await tx.postTag.createMany({
          data: tags.map((t) => ({ postId: id!, tagId: t.id })),
        });
      }
      return id;
    });

    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/admin/posts");
    return { ok: true, message: p.id ? "已保存" : "已创建", id: postId };
  } catch (e) {
    console.error("保存文章失败：", e);
    return { ok: false, error: "保存失败，请稍后重试" };
  }
}

// 删除文章
export async function deletePost(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };
  const pid = parseId(id);
  if (!pid.data) return { ok: false, error: pid.error ?? "参数不合法" };
  const post = await prisma.post.findUnique({ where: { id: pid.data } });
  if (!post) return { ok: false, error: "文章不存在" };
  await prisma.post.delete({ where: { id: pid.data } });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  return { ok: true, message: "已删除" };
}

// 切换发布状态（首次发布记录发布时间）
export async function togglePublish(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };
  const pid = parseId(id);
  if (!pid.data) return { ok: false, error: pid.error ?? "参数不合法" };
  const post = await prisma.post.findUnique({ where: { id: pid.data } });
  if (!post) return { ok: false, error: "文章不存在" };
  const published = !post.published;
  await prisma.post.update({
    where: { id: pid.data },
    data: {
      published,
      publishedAt: published && !post.publishedAt ? new Date() : post.publishedAt,
    },
  });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  return { ok: true, message: published ? "已发布" : "已转为草稿" };
}

// 切换置顶
export async function togglePin(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };
  const pid = parseId(id);
  if (!pid.data) return { ok: false, error: pid.error ?? "参数不合法" };
  const post = await prisma.post.findUnique({ where: { id: pid.data } });
  if (!post) return { ok: false, error: "文章不存在" };
  await prisma.post.update({ where: { id: pid.data }, data: { pinned: !post.pinned } });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  return { ok: true, message: post.pinned ? "已取消置顶" : "已置顶" };
}

// 切换归档（归档后不进入前台列表/SEO）
export async function toggleArchive(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };
  const pid = parseId(id);
  if (!pid.data) return { ok: false, error: pid.error ?? "参数不合法" };
  const post = await prisma.post.findUnique({ where: { id: pid.data } });
  if (!post) return { ok: false, error: "文章不存在" };
  await prisma.post.update({ where: { id: pid.data }, data: { archived: !post.archived } });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  return { ok: true, message: post.archived ? "已取消归档" : "已归档" };
}

// 为申请生成绑定邮箱的邀请码
export async function approveRequest(requestId: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.REVIEW_REQUESTS);
  if (!admin) return { ok: false, error: "无权限" };
  const rid = parseId(requestId);
  if (!rid.data) return { ok: false, error: rid.error ?? "参数不合法" };
  const request = await prisma.accountRequest.findUnique({ where: { id: rid.data } });
  if (!request) return { ok: false, error: "申请不存在" };
  const invite = await createInviteCode(request.email);
  revalidatePath("/admin/invites");
  return { ok: true, message: `邀请码 ${invite.code} 已生成（绑定 ${request.email}）` };
}

// 拒绝申请
export async function rejectRequest(requestId: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.REVIEW_REQUESTS);
  if (!admin) return { ok: false, error: "无权限" };
  const rid = parseId(requestId);
  if (!rid.data) return { ok: false, error: rid.error ?? "参数不合法" };
  const request = await prisma.accountRequest.findUnique({ where: { id: rid.data } });
  if (!request) return { ok: false, error: "申请不存在" };
  await prisma.accountRequest.update({
    where: { id: rid.data },
    data: { status: "REJECTED" },
  });
  revalidatePath("/admin/invites");
  return { ok: true, message: "已拒绝" };
}

// 生成不绑定邮箱的通用邀请码
export async function createFreeInvite(): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_INVITES);
  if (!admin) return { ok: false, error: "无权限" };
  const invite = await createInviteCode();
  revalidatePath("/admin/invites");
  return { ok: true, message: `通用邀请码 ${invite.code} 已生成（7 天有效）` };
}

// 删除未使用的邀请码
export async function deleteInvite(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_INVITES);
  if (!admin) return { ok: false, error: "无权限" };
  const iid = parseId(id);
  if (!iid.data) return { ok: false, error: iid.error ?? "参数不合法" };
  const invite = await prisma.inviteCode.findUnique({ where: { id: iid.data } });
  if (!invite) return { ok: false, error: "邀请码不存在" };
  if (invite.usedById) return { ok: false, error: "已使用的邀请码不能删除" };
  await prisma.inviteCode.delete({ where: { id: iid.data } });
  revalidatePath("/admin/invites");
  return { ok: true, message: "已删除" };
}

// 审核通过评论
export async function approveComment(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.APPROVE_COMMENTS);
  if (!admin) return { ok: false, error: "无权限" };
  const cid = parseId(id);
  if (!cid.data) return { ok: false, error: cid.error ?? "参数不合法" };
  const comment = await prisma.comment.findUnique({
    where: { id: cid.data },
    include: { post: { select: { slug: true } } },
  });
  if (!comment) return { ok: false, error: "评论不存在" };
  await prisma.comment.update({ where: { id: cid.data }, data: { isApproved: true } });
  revalidatePath(`/blog/${comment.post.slug}`);
  revalidatePath("/admin/comments");
  return { ok: true, message: "已通过" };
}

// 删除评论（连带回复一起删）
export async function deleteComment(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.DELETE_COMMENTS);
  if (!admin) return { ok: false, error: "无权限" };
  const cid = parseId(id);
  if (!cid.data) return { ok: false, error: cid.error ?? "参数不合法" };
  const comment = await prisma.comment.findUnique({
    where: { id: cid.data },
    include: { post: { select: { slug: true } } },
  });
  if (!comment) return { ok: false, error: "评论不存在" };
  await prisma.comment.deleteMany({ where: { OR: [{ id: cid.data }, { parentId: cid.data }] } });
  revalidatePath(`/blog/${comment.post.slug}`);
  revalidatePath("/admin/comments");
  return { ok: true, message: "已删除" };
}

// 删除文章后跳回列表（供编辑页用）
export async function deletePostAndRedirect(id: string) {
  const result = await deletePost(id);
  if (result.ok) redirect("/admin/posts");
  return result;
}
