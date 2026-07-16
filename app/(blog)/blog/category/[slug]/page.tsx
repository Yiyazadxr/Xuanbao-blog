import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostList } from "@/components/blog/PostList";
import { Pagination } from "@/components/ui/Pagination";
import { getPosts } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await prisma.category.findUnique({ where: { slug } });
  return { title: cat ? `${cat.name} · 分类` : "分类未找到" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ slug }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (!cat) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const { posts, total, totalPages } = await getPosts({ page, categorySlug: slug });

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {cat.name}
      </h1>
      {cat.description && <p className="mt-2 text-muted">{cat.description}</p>}
      <p className="mt-1 text-sm text-muted">共 {total} 篇文章</p>
      <div className="mt-8">
        <PostList posts={posts} />
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        basePath={`/blog/category/${slug}`}
        searchParams={{ page: page > 1 ? String(page) : undefined }}
      />
    </>
  );
}
