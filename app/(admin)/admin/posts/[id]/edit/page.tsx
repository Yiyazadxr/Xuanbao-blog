import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "编辑文章" };
export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, categories] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!post) notFound();

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">编辑文章</h1>
      <div className="mt-8">
        <PostEditor categories={categories} post={post} />
      </div>
    </>
  );
}
