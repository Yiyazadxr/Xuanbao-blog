import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LikeButton } from "@/components/blog/LikeButton";
import { PostContent } from "@/components/blog/PostContent";
import { PostNav } from "@/components/blog/PostNav";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { CommentSection } from "@/components/comments/CommentSection";
import { Sidebar } from "@/components/layout/Sidebar";
import { getCurrentUser } from "@/lib/auth";
import { getLikeInfo } from "@/lib/likes";
import { extractToc } from "@/lib/markdown";
import { getAdjacentPosts, getPostBySlug, incrementViewCount } from "@/lib/posts";
import { formatDate, readingTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 动态 SEO：标题 + 摘要
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "文章未找到" };
  return {
    title: post.title,
    description: post.excerpt ?? post.title,
  };
}

// 文章详情页：正文 + TOC + 进度条 + 上下篇
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  // 浏览量异步 +1（不阻塞页面渲染，内部已捕获异常）
  void incrementViewCount(post.id);

  const toc = extractToc(post.content);
  const readTime = readingTime(post.content);
  const user = await getCurrentUser();
  const [adjacent, like] = await Promise.all([
    getAdjacentPosts(post.createdAt),
    getLikeInfo(post.id, user?.id),
  ]);

  return (
    <>
      <ReadingProgress />
      <article className="mx-auto max-w-4xl">
        {/* 文章头部 */}
        <header className="mb-12">
          {post.category && (
            <p className="text-sm font-medium text-accent">{post.category.name}</p>
          )}
          <h1 className="font-display mt-3 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            {post.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <span>{post.author.name}</span>
            <time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt)}</time>
            <span>约 {readTime} 分钟阅读</span>
            <span>{post.viewCount} 次浏览</span>
          </div>
          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map(({ tag }) => (
                <Link
                  key={tag.id}
                  href={`/blog/tag/${tag.slug}`}
                  className="text-xs text-muted transition-colors duration-200 hover:text-accent"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
        </header>

        {/* 正文 + 侧栏 TOC */}
        <div className="flex gap-12 xl:gap-16">
          <div className="min-w-0 flex-1">
            <PostContent content={post.content} />

            {/* 点赞 */}
            <div className="mt-12 flex justify-center">
              <LikeButton
                postId={post.id}
                slug={post.slug}
                initialCount={like.count}
                initialLiked={like.liked}
                isLoggedIn={Boolean(user)}
              />
            </div>

            <PostNav prev={adjacent.prev} next={adjacent.next} />

            {/* 评论区 */}
            <CommentSection postId={post.id} slug={post.slug} />
          </div>
          <aside className="hidden w-56 flex-shrink-0 xl:block">
            <Sidebar toc={toc} />
          </aside>
        </div>
      </article>
    </>
  );
}
