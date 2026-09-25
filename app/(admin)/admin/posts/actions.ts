"use server";

// 文章操作要求 manage_posts 权限。
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { runAfter } from "@/lib/deferred";
import { deleteImage, saveImage } from "@/lib/image-storage";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePostContent } from "@/lib/post-cache";
import { snapshotPost } from "@/lib/post-revisions";
import { PostWriteError, restoreRevision } from "@/lib/post-write";
import { countWords, buildSearchText, plainExcerpt, slugify } from "@/lib/utils";
import { batchPostsSchema, parseId, parseInput, postSchema } from "@/lib/validation";
import type { AdminActionState } from "../action-types";

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

  const tagNames = [
    ...new Set(
      p.tags
        .split(/[,，、]/)
        .map((t) => t.trim())
        .filter(Boolean)
    ),
  ];

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
    archived: p.archived,
    pinned: p.pinned,
    featured: p.featured,
    wordCount: countWords(p.content ?? ""),
    // 搜索文本在保存时落库，查询不读取完整正文。
    searchText: buildSearchText(p.content ?? ""),
  };

  try {
    const postId = await prisma.$transaction(async (tx) => {
      const existing = p.id ? await tx.post.findUnique({
        where: { id: p.id },
        include: { tags: { include: { tag: true } } },
      }) : null;
      if (p.id && !existing) throw new PostWriteError("文章不存在");
      const writeData = {
        ...data,
        publishedAt: existing?.publishedAt ?? (p.published ? new Date() : null),
      };
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
          await snapshotPost(tx, existing, admin.id);
        }
        await tx.post.update({ where: { id }, data: writeData });
        await tx.postTag.deleteMany({ where: { postId: id } });
      } else {
        const created = await tx.post.create({ data: { ...writeData, authorId: admin.id } });
        id = created.id;
      }
      if (tags.length) {
        await tx.postTag.createMany({
          data: tags.map((t) => ({ postId: id!, tagId: t.id })),
        });
      }
      return id;
    }, { isolationLevel: "Serializable" });

    // 旧封面可能被历史版本引用，仅在删除文章时统一清理。
    revalidatePostContent();
    return { ok: true, message: p.id ? "已保存" : "已创建", id: postId };
  } catch (e) {
    if (e instanceof PostWriteError) return { ok: false, error: e.message };
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
  revalidatePostContent();
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
  revalidatePostContent();
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
  revalidatePostContent();
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
  revalidatePostContent();
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
    }
  } else if (op === "publish") {
    await prisma.$transaction([prisma.post.updateMany({
      where: { id: { in: idList }, publishedAt: null },
      data: { publishedAt: new Date() },
    }), prisma.post.updateMany({ where: { id: { in: idList } }, data: { published: true } })]);
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

  revalidatePostContent();
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

  try {
    await restoreRevision(rid.data, admin.id);

    revalidatePostContent();
    return { ok: true, message: "已回滚到该版本" };
  } catch (e) {
    if (e instanceof PostWriteError) return { ok: false, error: e.message };
    console.error("回滚失败：", e);
    return { ok: false, error: "回滚失败，请稍后重试" };
  }
}
