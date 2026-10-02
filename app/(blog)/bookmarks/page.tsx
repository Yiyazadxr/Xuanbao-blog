import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PostListPaginated } from "@/components/blog/PostListPaginated";
import { getFreshUser } from "@/lib/auth";
import { getBookmarkedPosts } from "@/lib/bookmarks";

export const metadata: Metadata = { title: "我的收藏" };
export const dynamic = "force-dynamic";

// 收藏列表页（需登录）：展示当前用户收藏的文章
export default async function BookmarksPage() {
  const user = await getFreshUser();
  if (!user) redirect("/");

  const bookmarks = await getBookmarkedPosts(user.id);

  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">我的收藏</h1>
      <p className="mt-3 text-muted">共 {bookmarks.length} 篇收藏文章</p>
      <div className="mt-10">
        <Suspense>
          <PostListPaginated posts={bookmarks} total={bookmarks.length} basePath="/bookmarks" />
        </Suspense>
      </div>
    </>
  );
}
