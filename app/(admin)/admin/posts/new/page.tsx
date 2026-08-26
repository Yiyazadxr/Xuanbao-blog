import type { Metadata } from "next";
import { PostEditor } from "@/components/admin/PostEditor";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "写文章" };
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const [categories, series] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.series.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">写文章</h1>
      <div className="mt-8">
        <PostEditor categories={categories} series={series} />
      </div>
    </>
  );
}
