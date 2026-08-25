import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostList } from "@/components/blog/PostList";
import { Pagination } from "@/components/ui/Pagination";
import { getPosts } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug } });
  return { title: tag ? `#${tag.name} · 标签` : "标签未找到" };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ slug }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const { posts, total, totalPages } = await getPosts({ page, tagSlug: slug });

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        #{tag.name}
      </h1>
      <p className="mt-2 text-sm text-muted">共 {total} 篇文章</p>
      <div className="mt-8">
        <PostList posts={posts} />
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        basePath={`/blog/tag/${slug}`}
        searchParams={{ page: page > 1 ? String(page) : undefined }}
      />
    </>
  );
}
