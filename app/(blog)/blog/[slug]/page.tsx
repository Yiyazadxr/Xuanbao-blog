import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EngagementBar } from "@/components/blog/EngagementBar";
import { MobileToc } from "@/components/blog/MobileToc";
import { PostContent } from "@/components/blog/PostContent";
import { PostNav } from "@/components/blog/PostNav";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { ViewTracker } from "@/components/blog/ViewTracker";
import { CommentSection } from "@/components/comments/CommentSection";
import { Sidebar } from "@/components/layout/Sidebar";
import { Reveal } from "@/components/ui/Reveal";
import { SITE } from "@/lib/constants";
import { extractToc } from "@/lib/markdown";
import {
  getAdjacentPosts,
  getPostBySlug,
  getRelatedPosts,
  getSeriesAdjacent,
} from "@/lib/posts";
import { formatDate, readingTime } from "@/lib/utils";

// ISR：公开文章页走静态缓存，浏览量/点赞/收藏/评论等个性化数据由客户端挂载后按需拉取
export const revalidate = 60;

// 动态 SEO：标题 + 摘要 + OpenGraph/Twitter 分享信息
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "文章未找到" };

  const description = post.excerpt ?? post.title;
  const url = `${SITE.url}/blog/${post.slug}`;
  const coverUrl = post.coverImage
    ? post.coverImage.startsWith("http")
      ? post.coverImage
      : `${SITE.url}${post.coverImage}`
    : undefined;

  return {
    title: post.title,
    description,
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description,
      images: coverUrl ? [{ url: coverUrl }] : undefined,
      publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      tags: post.tags.map((t) => t.tag.name),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: coverUrl ? [coverUrl] : undefined,
    },
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

  const toc = extractToc(post.content);
  const readTime = readingTime(post.content);
  const [adjacent, seriesAdjacent, related] = await Promise.all([
    getAdjacentPosts(post.createdAt),
    post.seriesId ? getSeriesAdjacent(post.seriesId, post.id) : Promise.resolve(null),
    getRelatedPosts({
      id: post.id,
      categoryId: post.categoryId,
      tagIds: post.tags.map((t) => t.tag.id),
    }),
  ]);

  return (
    <>
      <ReadingProgress />
      <MobileToc toc={toc} />
      {/* 浏览量 +1 / 阅读记录上报（客户端挂载时触发） */}
      <ViewTracker postId={post.id} slug={post.slug} wordCount={post.wordCount} />
      <article className="mx-auto max-w-4xl">
        {/* 文章头部 */}
        <Reveal>
        <header className="mb-12">
          {post.category && (
            <p className="text-sm font-medium text-accent">{post.category.name}</p>
          )}
          <h1 className="font-display mt-3 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            {post.title}
          </h1>
          {post.coverImage && (
            <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover"
              />
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <span>{post.author.name}</span>
            <time dateTime={(post.publishedAt ?? post.createdAt).toISOString()}>
              {formatDate(post.publishedAt ?? post.createdAt)}
            </time>
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
        </Reveal>

        {/* 正文 + 侧栏 TOC */}
        <div className="flex gap-12 xl:gap-16">
          <div className="min-w-0 flex-1">
            <Reveal delay={0.1}>
              <PostContent content={post.content} />
            </Reveal>

            {/* 点赞 + 收藏 + 分享（个性化状态客户端挂载后拉取） */}
            <EngagementBar postId={post.id} slug={post.slug} title={post.title} />

            {/* 系列导航：同一系列内的上下篇 */}
            {post.series && (
              <div className="mt-12 rounded-2xl border border-border bg-surface p-5">
                <Link
                  href={`/blog/series/${post.series.slug}`}
                  className="text-sm font-semibold text-accent transition-colors duration-200 hover:opacity-80"
                >
                  {post.series.name}
                </Link>
                {post.series.description && (
                  <p className="mt-1 text-xs text-muted">{post.series.description}</p>
                )}
                {seriesAdjacent && (seriesAdjacent.prev || seriesAdjacent.next) && (
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    {seriesAdjacent.prev ? (
                      <Link
                        href={`/blog/${seriesAdjacent.prev.slug}`}
                        className="min-w-0 truncate text-muted transition-colors duration-200 hover:text-accent"
                      >
                        ← {seriesAdjacent.prev.title}
                      </Link>
                    ) : (
                      <span className="text-muted/50">已是系列第一篇</span>
                    )}
                    {seriesAdjacent.next ? (
                      <Link
                        href={`/blog/${seriesAdjacent.next.slug}`}
                        className="min-w-0 truncate text-right text-muted transition-colors duration-200 hover:text-accent"
                      >
                        {seriesAdjacent.next.title} →
                      </Link>
                    ) : (
                      <span className="text-muted/50">已是系列最后一篇</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <PostNav prev={adjacent.prev} next={adjacent.next} />

            <RelatedPosts posts={related} />

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
