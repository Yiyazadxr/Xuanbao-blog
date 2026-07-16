import type { Metadata } from "next";
import { PostEditor } from "@/components/admin/PostEditor";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "写文章" };
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">写文章</h1>
      <div className="mt-8">
        <PostEditor categories={categories} />
      </div>
    </>
  );
}
