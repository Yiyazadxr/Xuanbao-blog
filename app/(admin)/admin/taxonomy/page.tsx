import type { Metadata } from "next";
import { TaxonomyManager } from "@/components/admin/TaxonomyManager";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "分类与标签" };
export const dynamic = "force-dynamic";

// 分类与标签管理：列表 + 新建 + 编辑 + 删除
export default async function TaxonomyPage() {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
  ]);

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">分类与标签</h1>
      <p className="mt-2 text-sm text-muted">管理文章的分类与标签，新建、编辑或删除</p>
      <div className="mt-8">
        <TaxonomyManager
          categories={categories.map((c) => ({ ...c, postCount: c._count.posts }))}
          tags={tags.map((t) => ({ ...t, postCount: t._count.posts }))}
        />
      </div>
    </>
  );
}
