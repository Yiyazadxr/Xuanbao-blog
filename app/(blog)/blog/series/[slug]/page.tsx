import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostListPaginated } from "@/components/blog/PostListPaginated";
import { getPosts } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function generateStaticParams() {
  const series = await prisma.series.findMany({ select: { slug: true } });
  return series.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = await prisma.series.findUnique({ where: { slug } });
  return { title: s ? `${s.name} · 系列` : "系列未找到" };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await prisma.series.findUnique({ where: { slug } });
  if (!series) notFound();

  const { posts, total } = await getPosts({ seriesSlug: slug });

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{series.name}</h1>
      {series.description && <p className="mt-2 text-muted">{series.description}</p>}
      <p className="mt-1 text-sm text-muted">共 {total} 篇文章</p>
      <div className="mt-8">
        <Suspense>
          <PostListPaginated posts={posts} basePath={`/blog/series/${slug}`} />
        </Suspense>
      </div>
    </>
  );
}
