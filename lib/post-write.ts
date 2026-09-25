import { prisma } from "@/lib/prisma";
import { snapshotPost } from "@/lib/post-revisions";
import { buildSearchText, countWords, plainExcerpt, slugify } from "@/lib/utils";

export class PostWriteError extends Error {}

/** 权限和输入校验由调用方完成；业务读取和写入共享事务快照。 */
export async function restoreRevision(revisionId: string, authorId: string) {
  return prisma.$transaction(async (tx) => {
    const revision = await tx.postRevision.findUnique({ where: { id: revisionId } });
    if (!revision) throw new PostWriteError("版本不存在");
    const post = await tx.post.findUnique({
      where: { id: revision.postId },
      include: { tags: { include: { tag: true } } },
    });
    if (!post) throw new PostWriteError("文章不存在");
    const conflict = await tx.post.findFirst({
      where: { slug: revision.slug, id: { not: post.id } },
    });
    if (conflict) throw new PostWriteError("该版本的链接标识已被其他文章占用，无法回滚");

    const category = revision.categoryId
      ? await tx.category.findUnique({ where: { id: revision.categoryId } }) : null;
    const series = revision.seriesId
      ? await tx.series.findUnique({ where: { id: revision.seriesId } }) : null;
    // 损坏的版本数据不能被悄悄当作空标签覆盖现有内容。
    let names: unknown;
    try { names = JSON.parse(revision.tags); } catch {
      throw new PostWriteError("版本标签数据损坏，无法回滚");
    }
    if (!Array.isArray(names) || !names.every((name) => typeof name === "string")) {
      throw new PostWriteError("版本标签数据损坏，无法回滚");
    }
    const tagNames = [...new Set((names as string[]).map((name) => name.trim()).filter(Boolean))];

    await snapshotPost(tx, post, authorId);
    await tx.post.update({
      where: { id: post.id },
      data: {
        title: revision.title, slug: revision.slug, content: revision.content,
        excerpt: revision.excerpt?.trim() || plainExcerpt(revision.content) || null,
        coverImage: revision.coverImage,
        categoryId: category?.id ?? null, seriesId: series?.id ?? null,
        published: revision.published,
        publishedAt: post.publishedAt ?? (revision.published ? new Date() : null),
        pinned: revision.pinned, featured: revision.featured, archived: revision.archived,
        wordCount: countWords(revision.content), searchText: buildSearchText(revision.content),
      },
    });
    const tags = await Promise.all(tagNames.map((name) => tx.tag.upsert({
      where: { name }, update: {}, create: { name, slug: slugify(name) },
    })));
    await tx.postTag.deleteMany({ where: { postId: post.id } });
    if (tags.length) await tx.postTag.createMany({
      data: tags.map((tag) => ({ postId: post.id, tagId: tag.id })),
    });
  }, { isolationLevel: "Serializable" });
}
