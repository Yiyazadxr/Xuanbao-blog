import type { Metadata } from "next";
import Link from "next/link";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">编辑文章</h1>
        <Link
          href={`/admin/posts/${post.id}/revisions`}
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          版本历史
        </Link>
      </div>
      <div className="mt-8">
        <PostEditor categories={categories} post={post} />
      </div>
    </>
  );
}
