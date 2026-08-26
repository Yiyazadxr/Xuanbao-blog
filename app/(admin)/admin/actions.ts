"use server";

// 后台管理 Server Actions：每个操作都按具体权限校验（双重保险）
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { SITE } from "@/lib/constants";
import { deleteImage, saveImage } from "@/lib/image-storage";
import { createInviteCode } from "@/lib/invites";
import { sendMail } from "@/lib/mail";
import { createNotification } from "@/lib/notifications";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { parseId, parseInput, batchPostsSchema, postSchema } from "@/lib/validation";

// 每篇文章保留的版本数上限
const MAX_REVISIONS = 50;

// 构造版本快照数据（保存/回滚前记录旧状态）
function revisionData(
  post: {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string | null;
    coverImage: string | null;
    categoryId: string | null;
    published: boolean;
    pinned: boolean;
    featured: boolean;
    archived: boolean;
    tags: { tag: { name: string } }[];
  },
  authorId: string
) {
  return {
    postId: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    categoryId: post.categoryId,
    tags: JSON.stringify(post.tags.map((t) => t.tag.name)),
    published: post.published,
    pinned: post.pinned,
    featured: post.featured,
    archived: post.archived,
    authorId,
  };
}

// 清理超出上限的旧版本（保留最近 MAX_REVISIONS 个）
async function pruneRevisions(postId: string) {
  const oldest = await prisma.postRevision.findMany({
    where: { postId },
    orderBy: { createdAt: "desc" },
    skip: MAX_REVISIONS,
    select: { id: true },
  });
  if (oldest.length > 0) {
    await prisma.postRevision.deleteMany({
      where: { id: { in: oldest.map((r) => r.id) } },
    });
  }
}

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

  const existing = p.id
    ? await prisma.post.findUnique({
        where: { id: p.id },
        include: { tags: { include: { tag: true } } },
      })
    : null;
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
    coverImage: p.coverImage || null,
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
        // 编辑前先快照旧状态为版本
        if (existing) {
          await tx.postRevision.create({ data: revisionData(existing, admin.id) });
        }
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

    // 注意：不在此删除被替换的旧封面——历史版本可能仍引用它，
    // 删除会导致回滚到旧版本时封面失效；封面统一在删除文章时清理
    await pruneRevisions(postId);

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
  const post = await prisma.post.findUnique({
    where: { id: pid.data },
    include: { revisions: { select: { coverImage: true } } },
  });
  if (!post) return { ok: false, error: "文章不存在" };
  // 删除文章连同其所有封面（当前封面 + 各历史版本引用过的封面）
  const covers = [post.coverImage, ...post.revisions.map((r) => r.coverImage)].filter(
    (c): c is string => Boolean(c)
  );
  await prisma.post.delete({ where: { id: pid.data } });
  for (const cover of covers) void deleteImage(cover);
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
  if (request.status !== "PENDING") return { ok: false, error: "该申请已处理" };

  // 防止重复生成邀请码（避免重复发送邮件）
  const existingInvite = await prisma.inviteCode.findFirst({
    where: { email: request.email, usedById: null },
  });
  if (existingInvite) {
    return { ok: false, error: "该申请已有未使用的邀请码，请勿重复生成" };
  }

  const invite = await createInviteCode(request.email);

  // 邮件仅用于注册流程：向申请者发送邀请码（失败不影响审核结果）
  try {
    await sendMail(
      request.email,
      "【Xuanbao.dev】你的账号申请已通过",
      `感谢你的申请！你的注册邀请码为：${invite.code}（7 天内有效）\n\n请前往 ${SITE.url}/register 使用该邀请码完成注册。`
    );
  } catch (e) {
    console.error("邀请码邮件发送失败：", e);
  }

  revalidatePath("/admin/invites");
  return { ok: true, message: `邀请码 ${invite.code} 已生成并邮件通知（绑定 ${request.email}）` };
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
    include: {
      post: { select: { slug: true } },
      author: { select: { name: true } },
      parent: { select: { authorId: true } },
    },
  });
  if (!comment) return { ok: false, error: "评论不存在" };
  await prisma.comment.update({ where: { id: cid.data }, data: { isApproved: true } });
  // 站内通知评论/回复作者（自己审核自己的内容时不重复通知）
  if (comment.authorId !== admin.id) {
    await createNotification(comment.authorId, {
      type: "comment_approved",
      title: "你的评论已通过审核",
      link: `/blog/${comment.post.slug}`,
    });
  }
  // 若为回复，通知被回复的用户（排除本人与审核者）
  if (
    comment.parent &&
    comment.parent.authorId !== comment.authorId &&
    comment.parent.authorId !== admin.id
  ) {
    await createNotification(comment.parent.authorId, {
      type: "comment_replied",
      title: `「${comment.author.name}」回复了你的评论`,
      link: `/blog/${comment.post.slug}`,
    });
  }
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

// 批量操作：发布 / 转草稿 / 归档 / 改分类 / 删除
export async function batchPosts(
  ids: unknown,
  operation: string,
  categoryId?: unknown
): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };

  const parsed = parseInput(batchPostsSchema, { ids, operation, categoryId });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { ids: idList, operation: op, categoryId: cid } = parsed.data;

  if (op === "delete") {
    const posts = await prisma.post.findMany({
      where: { id: { in: idList } },
      select: { coverImage: true, revisions: { select: { coverImage: true } } },
    });
    await prisma.post.deleteMany({ where: { id: { in: idList } } });
    for (const p of posts) {
      const covers = [p.coverImage, ...p.revisions.map((r) => r.coverImage)].filter(
        (c): c is string => Boolean(c)
      );
      for (const cover of covers) void deleteImage(cover);
    }
  } else if (op === "publish") {
    // 首次发布补齐发布时间
    await prisma.post.updateMany({
      where: { id: { in: idList }, publishedAt: null },
      data: { publishedAt: new Date() },
    });
    await prisma.post.updateMany({ where: { id: { in: idList } }, data: { published: true } });
  } else if (op === "unpublish") {
    await prisma.post.updateMany({ where: { id: { in: idList } }, data: { published: false } });
  } else if (op === "archive") {
    await prisma.post.updateMany({ where: { id: { in: idList } }, data: { archived: true } });
  } else if (op === "category") {
    await prisma.post.updateMany({
      where: { id: { in: idList } },
      data: { categoryId: cid || null },
    });
  }

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  return { ok: true, message: "已批量处理" };
}

// 上传封面图（返回可访问 URL）
export async function uploadImage(
  formData: FormData
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { ok: false, error: "未选择文件" };
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await saveImage({ type: file.type, data: buf });
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "上传失败" };
  }
}

// 回滚文章到某个历史版本
export async function restorePostRevision(revisionId: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };
  const rid = parseId(revisionId);
  if (!rid.data) return { ok: false, error: rid.error ?? "参数不合法" };

  const revision = await prisma.postRevision.findUnique({ where: { id: rid.data } });
  if (!revision) return { ok: false, error: "版本不存在" };

  const post = await prisma.post.findUnique({
    where: { id: revision.postId },
    include: { tags: { include: { tag: true } } },
  });
  if (!post) return { ok: false, error: "文章不存在" };

  // slug 唯一性检查（历史 slug 可能已被其他文章占用）
  const conflict = await prisma.post.findFirst({
    where: { slug: revision.slug, id: { not: post.id } },
  });
  if (conflict) return { ok: false, error: `slug「${revision.slug}」已被其他文章占用，无法回滚` };

  let tagNames: string[] = [];
  try {
    const parsed = JSON.parse(revision.tags);
    if (Array.isArray(parsed)) tagNames = parsed.filter((t) => typeof t === "string");
  } catch {
    tagNames = [];
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 先快照当前状态，使回滚可再次撤销
      await tx.postRevision.create({ data: revisionData(post, admin.id) });

      await tx.post.update({
        where: { id: post.id },
        data: {
          title: revision.title,
          slug: revision.slug,
          content: revision.content,
          excerpt: revision.excerpt,
          coverImage: revision.coverImage,
          categoryId: revision.categoryId,
          published: revision.published,
          pinned: revision.pinned,
          featured: revision.featured,
          archived: revision.archived,
        },
      });

      const tags = await Promise.all(
        tagNames.map((name) =>
          tx.tag.upsert({ where: { name }, update: {}, create: { name, slug: slugify(name) } })
        )
      );
      await tx.postTag.deleteMany({ where: { postId: post.id } });
      if (tags.length) {
        await tx.postTag.createMany({
          data: tags.map((t) => ({ postId: post.id, tagId: t.id })),
        });
      }
    });

    await pruneRevisions(post.id);
    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/admin/posts");
    return { ok: true, message: "已回滚到该版本" };
  } catch (e) {
    console.error("回滚失败：", e);
    return { ok: false, error: "回滚失败，请稍后重试" };
  }
}
