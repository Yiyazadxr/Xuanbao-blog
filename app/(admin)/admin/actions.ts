"use server";

// 后台管理 Server Actions：每个操作都先校验 ADMIN 角色（双重保险）
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createInviteCode } from "@/lib/invites";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export type AdminActionState = { ok: boolean; error?: string; message?: string };

export type PostPayload = {
  id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  categoryId: string;
  tags: string; // 逗号分隔
  published: boolean;
  featured: boolean;
};

// 新建/更新文章（id 为空则新建）
export async function savePost(
  payload: PostPayload
): Promise<AdminActionState & { id?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "无权限" };

  const title = payload.title.trim();
  if (!title) return { ok: false, error: "标题不能为空" };
  if (!payload.content.trim()) return { ok: false, error: "正文不能为空" };

  const slug = slugify(payload.slug.trim() || title);

  // slug 唯一性检查（编辑时排除自己）
  const dup = await prisma.post.findFirst({
    where: { slug, ...(payload.id ? { id: { not: payload.id } } : {}) },
  });
  if (dup) return { ok: false, error: `slug「${slug}」已被文章「${dup.title}」占用` };

  // 解析标签：逗号/顿号分隔，去重
  const tagNames = [
    ...new Set(
      payload.tags
        .split(/[,，、]/)
        .map((t) => t.trim())
        .filter(Boolean)
    ),
  ];

  const data = {
    title,
    slug,
    content: payload.content,
    excerpt: payload.excerpt.trim() || null,
    categoryId: payload.categoryId || null,
    published: payload.published,
    featured: payload.featured,
  };

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

    let id = payload.id;
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

  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  return { ok: true, message: payload.id ? "已保存" : "已创建", id: postId };
}

// 删除文章
export async function deletePost(id: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "无权限" };
  await prisma.post.delete({ where: { id } });
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  return { ok: true, message: "已删除" };
}

// 切换发布状态
export async function togglePublish(id: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "无权限" };
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { ok: false, error: "文章不存在" };
  await prisma.post.update({ where: { id }, data: { published: !post.published } });
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  return { ok: true, message: post.published ? "已转为草稿" : "已发布" };
}

// 为申请生成绑定邮箱的邀请码
export async function approveRequest(requestId: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "无权限" };
  const request = await prisma.accountRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, error: "申请不存在" };
  const invite = await createInviteCode(request.email);
  revalidatePath("/admin/invites");
  return { ok: true, message: `邀请码 ${invite.code} 已生成（绑定 ${request.email}）` };
}

// 拒绝申请
export async function rejectRequest(requestId: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "无权限" };
  await prisma.accountRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" },
  });
  revalidatePath("/admin/invites");
  return { ok: true, message: "已拒绝" };
}

// 生成不绑定邮箱的通用邀请码
export async function createFreeInvite(): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "无权限" };
  const invite = await createInviteCode();
  revalidatePath("/admin/invites");
  return { ok: true, message: `通用邀请码 ${invite.code} 已生成（7 天有效）` };
}

// 删除未使用的邀请码
export async function deleteInvite(id: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "无权限" };
  const invite = await prisma.inviteCode.findUnique({ where: { id } });
  if (!invite) return { ok: false, error: "邀请码不存在" };
  if (invite.usedById) return { ok: false, error: "已使用的邀请码不能删除" };
  await prisma.inviteCode.delete({ where: { id } });
  revalidatePath("/admin/invites");
  return { ok: true, message: "已删除" };
}

// 删除文章后跳回列表（供编辑页用）
export async function deletePostAndRedirect(id: string) {
  const result = await deletePost(id);
  if (result.ok) redirect("/admin/posts");
  return result;
}
