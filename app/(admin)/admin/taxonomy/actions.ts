"use server";

// 分类、标签和系列操作要求 manage_posts。
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePostContent } from "@/lib/post-cache";
import { slugify } from "@/lib/slug";
import { categorySchema, parseId, parseInput, seriesSchema, tagSchema } from "@/lib/validation";

export type TaxonomyActionState = { ok: boolean; error?: string; message?: string };

function guard() {
  return requirePermission(PERMISSIONS.MANAGE_POSTS);
}

function refreshTaxonomy() {
  revalidatePath("/admin/taxonomy");
  revalidatePostContent();
}

// ===== 分类 =====

export async function createCategory(
  name: string,
  description?: string
): Promise<TaxonomyActionState> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "无权限" };

  const parsed = parseInput(categorySchema, { name, description });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { name: n, description: desc } = parsed.data;

  const slug = slugify(n);
  const dup = await prisma.category.findFirst({ where: { OR: [{ name: n }, { slug }] } });
  if (dup) return { ok: false, error: "该分类已存在（名称或 URL 标识重复）" };

  await prisma.category.create({ data: { name: n, slug, description: desc || null } });
  refreshTaxonomy();
  return { ok: true, message: "已创建分类" };
}

export async function updateCategory(
  id: string,
  name: string,
  description?: string
): Promise<TaxonomyActionState> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "无权限" };

  const cid = parseId(id);
  if (!cid.data) return { ok: false, error: cid.error ?? "参数不合法" };
  const parsed = parseInput(categorySchema, { name, description });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { name: n, description: desc } = parsed.data;

  const existing = await prisma.category.findUnique({ where: { id: cid.data } });
  if (!existing) return { ok: false, error: "分类不存在" };

  const slug = slugify(n);
  const dup = await prisma.category.findFirst({
    where: { OR: [{ name: n }, { slug }], id: { not: cid.data } },
  });
  if (dup) return { ok: false, error: "该名称或 URL 标识已被其他分类占用" };

  await prisma.category.update({ where: { id: cid.data }, data: { name: n, slug, description: desc || null } });
  refreshTaxonomy();
  return { ok: true, message: "已保存分类" };
}

export async function deleteCategory(id: string): Promise<TaxonomyActionState> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "无权限" };

  const cid = parseId(id);
  if (!cid.data) return { ok: false, error: cid.error ?? "参数不合法" };
  const existing = await prisma.category.findUnique({ where: { id: cid.data } });
  if (!existing) return { ok: false, error: "分类不存在" };

  // 删除分类后相关文章变为无分类。
  await prisma.category.delete({ where: { id: cid.data } });
  refreshTaxonomy();
  return { ok: true, message: "已删除分类" };
}

// ===== 标签 =====

export async function createTag(name: string): Promise<TaxonomyActionState> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "无权限" };

  const parsed = parseInput(tagSchema, { name });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const n = parsed.data.name;
  const slug = slugify(n);

  const dup = await prisma.tag.findFirst({ where: { OR: [{ name: n }, { slug }] } });
  if (dup) return { ok: false, error: "该标签已存在（名称或 URL 标识重复）" };

  await prisma.tag.create({ data: { name: n, slug } });
  refreshTaxonomy();
  return { ok: true, message: "已创建标签" };
}

export async function updateTag(id: string, name: string): Promise<TaxonomyActionState> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "无权限" };

  const tid = parseId(id);
  if (!tid.data) return { ok: false, error: tid.error ?? "参数不合法" };
  const parsed = parseInput(tagSchema, { name });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const n = parsed.data.name;

  const existing = await prisma.tag.findUnique({ where: { id: tid.data } });
  if (!existing) return { ok: false, error: "标签不存在" };

  const slug = slugify(n);
  const dup = await prisma.tag.findFirst({
    where: { OR: [{ name: n }, { slug }], id: { not: tid.data } },
  });
  if (dup) return { ok: false, error: "该名称或 URL 标识已被其他标签占用" };

  await prisma.tag.update({ where: { id: tid.data }, data: { name: n, slug } });
  refreshTaxonomy();
  return { ok: true, message: "已保存标签" };
}

export async function deleteTag(id: string): Promise<TaxonomyActionState> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "无权限" };

  const tid = parseId(id);
  if (!tid.data) return { ok: false, error: tid.error ?? "参数不合法" };
  const existing = await prisma.tag.findUnique({ where: { id: tid.data } });
  if (!existing) return { ok: false, error: "标签不存在" };

  // 删除标签时级联删除文章关联。
  await prisma.tag.delete({ where: { id: tid.data } });
  refreshTaxonomy();
  return { ok: true, message: "已删除标签" };
}

// ===== 系列/专题 =====

export async function createSeries(
  name: string,
  description?: string
): Promise<TaxonomyActionState> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "无权限" };

  const parsed = parseInput(seriesSchema, { name, description });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { name: n, description: desc } = parsed.data;

  const slug = slugify(n);
  const dup = await prisma.series.findFirst({ where: { OR: [{ name: n }, { slug }] } });
  if (dup) return { ok: false, error: "该系列已存在（名称或 URL 标识重复）" };

  await prisma.series.create({ data: { name: n, slug, description: desc || null } });
  refreshTaxonomy();
  return { ok: true, message: "已创建系列" };
}

export async function updateSeries(
  id: string,
  name: string,
  description?: string
): Promise<TaxonomyActionState> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "无权限" };

  const sid = parseId(id);
  if (!sid.data) return { ok: false, error: sid.error ?? "参数不合法" };
  const parsed = parseInput(seriesSchema, { name, description });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { name: n, description: desc } = parsed.data;

  const existing = await prisma.series.findUnique({ where: { id: sid.data } });
  if (!existing) return { ok: false, error: "系列不存在" };

  const slug = slugify(n);
  const dup = await prisma.series.findFirst({
    where: { OR: [{ name: n }, { slug }], id: { not: sid.data } },
  });
  if (dup) return { ok: false, error: "该名称或 URL 标识已被其他系列占用" };

  await prisma.series.update({
    where: { id: sid.data },
    data: { name: n, slug, description: desc || null },
  });
  refreshTaxonomy();
  return { ok: true, message: "已保存系列" };
}

export async function deleteSeries(id: string): Promise<TaxonomyActionState> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "无权限" };

  const sid = parseId(id);
  if (!sid.data) return { ok: false, error: sid.error ?? "参数不合法" };
  const existing = await prisma.series.findUnique({ where: { id: sid.data } });
  if (!existing) return { ok: false, error: "系列不存在" };

  // 删除系列后相关文章通过 SetNull 变为无系列。
  await prisma.series.delete({ where: { id: sid.data } });
  refreshTaxonomy();
  return { ok: true, message: "已删除系列" };
}
