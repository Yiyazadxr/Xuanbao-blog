import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostListPaginated } from "@/components/blog/PostListPaginated";
import { getPosts } from "@/lib/posts";
import { SITE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function generateStaticParams() {
  const tags = await prisma.tag.findMany({ select: { slug: true } });
  return tags.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) return { title: "标签未找到" };
  return {
    title: `#${tag.name} · 标签`,
    alternates: { types: { "application/rss+xml": `${SITE.url}/feed.xml/tag/${slug}` } },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug } });
  if (!tag) notFound();

  const { posts, total } = await getPosts({ tagSlug: slug });

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        #{tag.name}
      </h1>
      <p className="mt-2 text-sm text-muted">共 {total} 篇文章</p>
      <div className="mt-8">
        <Suspense>
          <PostListPaginated posts={posts} basePath={`/blog/tag/${slug}`} />
        </Suspense>
      </div>
    </>
  );
}
