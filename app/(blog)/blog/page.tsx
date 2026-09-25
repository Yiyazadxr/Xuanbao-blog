import type { Metadata } from "next";
import { BlogPostsClient } from "@/components/blog/BlogPostsClient";
import { websiteOpenGraph } from "@/lib/metadata";
import { getCategoriesWithCount, getPosts } from "@/lib/posts";

const blogDescription = "浏览全部文章，支持全文模糊搜索与分类筛选";

export const metadata: Metadata = {
  title: "文章",
  description: blogDescription,
  openGraph: websiteOpenGraph("文章", blogDescription, "/blog"),
};
export const revalidate = 60;

// 列表使用 ISR；搜索索引在客户端首次输入时按需获取。
export default async function BlogPage() {
  const [{ posts }, categories] = await Promise.all([getPosts(), getCategoriesWithCount()]);

  return <BlogPostsClient posts={posts} categories={categories} />;
}
