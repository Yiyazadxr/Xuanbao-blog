"use server";

// 文章操作要求 manage_posts 权限。
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { runAfter } from "@/lib/deferred";
import { deleteImage, saveImage } from "@/lib/image-storage";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { countWords, buildSearchText, plainExcerpt, slugify } from "@/lib/utils";
import { batchPostsSchema, parseId, parseInput, postSchema } from "@/lib/validation";
import type { AdminActionState } from "../action-types";

// 每篇文章保留的版本数上限
const MAX_REVISIONS = 50;

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

export async function savePost(
  payload: unknown
): Promise<AdminActionState & { id?: string }> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_POSTS);
  if (!admin) return { ok: false, error: "无权限" };

  const parsed = parseInput(postSchema, payload);
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const p = parsed.data;

  const slug = slugify(p.slug.trim() || p.title);

  const dup = await prisma.post.findFirst({
    where: { slug, ...(p.id ? { id: { not: p.id } } : {}) },
  });
  if (dup) return { ok: false, error: `slug「${slug}」已被文章「${dup.title}」占用` };

  if (p.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: p.categoryId } });
    if (!category) return { ok: false, error: "分类不存在" };
  }

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

  const tagNames = [
    ...new Set(
      p.tags
        .split(/[,，、]/)
        .map((t) => t.trim())
        .filter(Boolean)
    ),
  ];

  // publishedAt 仅在首次发布时写入。
  const publishedAt = p.published
    ? (existing?.publishedAt ?? new Date())
    : (existing?.publishedAt ?? null);

  const data = {
    title: p.title,
    slug,
    content: p.content,
    // 空摘要从正文生成；空结果存为 null。
    excerpt: p.excerpt?.trim() || plainExcerpt(p.content ?? "") || null,
    coverImage: p.coverImage || null,
    categoryId: p.categoryId || null,
    seriesId: p.seriesId || null,
    published: p.published,
    publishedAt,
    archived: p.archived,
    pinned: p.pinned,
    featured: p.featured,
    wordCount: countWords(p.content ?? ""),
    // 搜索文本在保存时落库，查询不读取完整正文。
    searchText: buildSearchText(p.content ?? ""),
  };

  try {
    const postId = await prisma.$transaction(async (tx) => {
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
        // 编辑前保存旧状态，支持回滚。
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

    // 旧封面可能被历史版本引用，仅在删除文章时统一清理。
    await pruneRevisions(postId);

    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath(`/blog/${p.slug}`);
    revalidatePath("/admin/posts");
    return { ok: true, message: p.id ? "已保存" : "已创建", id: postId };
  } catch (e) {
    console.error("保存文章失败：", e);
    return { ok: false, error: "保存失败，请稍后重试" };
  }
}

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
  // 同时删除当前和历史版本引用的封面。
  const covers = [post.coverImage, ...post.revisions.map((r) => r.coverImage)].filter(
    (c): c is string => Boolean(c)
  );
  await prisma.post.delete({ where: { id: pid.data } });
  runAfter(() => Promise.all(covers.map((cover) => deleteImage(cover))));
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/admin/posts");
  return { ok: true, message: "已删除" };
}

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
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/admin/posts");
  return { ok: true, message: published ? "已发布" : "已转为草稿" };
}

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
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/admin/posts");
  return { ok: true, message: post.pinned ? "已取消置顶" : "已置顶" };
}

// 归档文章不进入公开列表和 SEO。
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
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/admin/posts");
  return { ok: true, message: post.archived ? "已取消归档" : "已归档" };
}

export async function deletePostAndRedirect(id: string) {
  const result = await deletePost(id);
  if (result.ok) redirect("/admin/posts");
  return result;
}

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
      select: { slug: true, coverImage: true, revisions: { select: { coverImage: true } } },
    });
    await prisma.post.deleteMany({ where: { id: { in: idList } } });
    for (const p of posts) {
      const covers = [p.coverImage, ...p.revisions.map((r) => r.coverImage)].filter(
        (c): c is string => Boolean(c)
      );
      runAfter(() => Promise.all(covers.map((cover) => deleteImage(cover))));
      revalidatePath(`/blog/${p.slug}`);
    }
  } else if (op === "publish") {
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

  // 批量状态变更后逐篇刷新 ISR 详情缓存。
  if (op !== "delete") {
    const affected = await prisma.post.findMany({
      where: { id: { in: idList } },
      select: { slug: true },
    });
    for (const p of affected) revalidatePath(`/blog/${p.slug}`);
  }

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  return { ok: true, message: "已批量处理" };
}

// 仅暴露已知上传错误，避免泄漏存储服务内部信息。
const IMAGE_ERROR_MESSAGES = ["仅支持 JPEG / PNG / WebP / GIF 图片", "图片大小不能超过 5MB"];

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
    const url = await saveImage(buf);
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
      // 回滚前保存当前状态，使回滚可撤销。
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
          // 版本不存 wordCount，回滚时按正文重算。
          wordCount: countWords(revision.content ?? ""),
          searchText: buildSearchText(revision.content ?? ""),
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
