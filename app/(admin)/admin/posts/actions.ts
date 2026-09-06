"use server";

// 文章管理 Server Actions：CRUD / 批量操作 / 版本回滚 / 封面图上传（按 manage_posts 权限校验）
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { deleteImage, saveImage } from "@/lib/image-storage";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { countWords, plainExcerpt, slugify } from "@/lib/utils";
import { batchPostsSchema, parseId, parseInput, postSchema } from "@/lib/validation";
import type { AdminActionState } from "../action-types";

// 每篇文章保留的版本数上限
const MAX_REVISIONS = 50;

// 构造版本快照数据
function revisionData(
  post: {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string | null;
    coverImage: string | null;
    categoryId: string | null;
    seriesId: string | null;
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
    seriesId: post.seriesId,
    tags: JSON.stringify(post.tags.map((t) => t.tag.name)),
    published: post.published,
    pinned: post.pinned,
    featured: post.featured,
    archived: post.archived,
    authorId,
  };
}

// 清理超出上限的旧版本
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

  // slug 唯一性检查
  const dup = await prisma.post.findFirst({
    where: { slug, ...(p.id ? { id: { not: p.id } } : {}) },
  });
  if (dup) return { ok: false, error: `slug「${slug}」已被文章「${dup.title}」占用` };

  // 校验分类存在
  if (p.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: p.categoryId } });
    if (!category) return { ok: false, error: "分类不存在" };
  }

  // 校验系列存在
  if (p.seriesId) {
    const series = await prisma.series.findUnique({ where: { id: p.seriesId } });
    if (!series) return { ok: false, error: "系列不存在" };
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
    // 摘要为空时用正文纯文本兜底并落库：列表查询已不再回读 content 正文
    // 空结果归为 null，与列表查询 `row.excerpt ?? ""` 展示口径一致
    excerpt: p.excerpt?.trim() || plainExcerpt(p.content ?? "") || null,
    coverImage: p.coverImage || null,
    categoryId: p.categoryId || null,
    seriesId: p.seriesId || null,
    published: p.published,
    publishedAt,
    archived: p.archived,
    pinned: p.pinned,
    featured: p.featured,
    // 纯文字字数：保存时计算，页脚只做 sum
    wordCount: countWords(p.content ?? ""),
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

// 删除文章后跳回列表
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

// 上传失败时仅向客户端暴露这些已知中文文案，其余错误统一通用文案，
// 避免 @vercel/blob 等底层错误泄漏 bucket 名/内部 URL
const IMAGE_ERROR_MESSAGES = ["仅支持 JPEG / PNG / WebP / GIF 图片", "图片大小不能超过 5MB"];

// 上传封面图
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
    const known =
      e instanceof Error
        ? IMAGE_ERROR_MESSAGES.find((m) => e.message.includes(m)) ?? null
        : null;
    if (!known) console.error("上传图片失败：", e);
    return { ok: false, error: known ?? "上传失败，请稍后重试" };
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

  // slug 唯一性检查
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
          excerpt: revision.excerpt?.trim() || plainExcerpt(revision.content ?? "") || null,
          coverImage: revision.coverImage,
          categoryId: revision.categoryId,
          seriesId: revision.seriesId,
          published: revision.published,
          pinned: revision.pinned,
          featured: revision.featured,
          archived: revision.archived,
          // 回滚后字数随正文变化，重新计算（版本快照不存 wordCount，用 content 现算）
          wordCount: countWords(revision.content ?? ""),
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
