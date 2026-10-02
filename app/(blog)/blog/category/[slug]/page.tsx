import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostGridSkeleton } from "@/components/blog/PostCardSkeleton";
import { PostListPaginated } from "@/components/blog/PostListPaginated";
import { websiteOpenGraph } from "@/lib/metadata";
import { getCategoryBySlug, getPosts } from "@/lib/posts";
import { SITE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { POSTS_PER_PAGE } from "@/lib/pagination";

export const revalidate = 60;

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ select: { slug: true } });
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "分类未找到" };
  const description = cat.description || `浏览「${cat.name}」分类下的全部文章`;
  return {
    title: `${cat.name} · 分类`,
    description,
    openGraph: websiteOpenGraph(`${cat.name} · 分类`, description, `/blog/category/${slug}`),
    alternates: { types: { "application/rss+xml": `${SITE.url}/feed.xml/category/${slug}` } },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();

  const { posts, total } = await getPosts({ categorySlug: slug, take: POSTS_PER_PAGE });

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {cat.name}
      </h1>
      {cat.description && <p className="mt-2 text-muted">{cat.description}</p>}
      <p className="mt-1 text-sm text-muted">共 {total} 篇文章</p>
      <div className="mt-8">
        <Suspense fallback={<PostGridSkeleton />}>
          <PostListPaginated posts={posts} total={total} basePath={`/blog/category/${slug}`} serverPaginated filters={{ categorySlug: slug }} />
        </Suspense>
      </div>
    </>
  );
}
