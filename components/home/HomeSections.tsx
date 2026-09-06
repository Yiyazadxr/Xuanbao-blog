import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { Reveal } from "@/components/ui/Reveal";
import { Stagger, StaggerItem } from "@/components/ui/Stagger";
import { HomeSidebar } from "@/components/home/HomeSidebar";
import { getCategoriesWithCount, getFeaturedPosts, getPosts, getTagsWithCount } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

// 首页主体：双栏布局
export async function HomeSections() {
  const [featured, { posts: latest }, categories, tags, owner] = await Promise.all([
    getFeaturedPosts(),
    getPosts(),
    getCategoriesWithCount(),
    getTagsWithCount(),
    // 博主资料
    prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
      orderBy: { createdAt: "asc" }, // 多个超管时取最早创建者，保证稳定
      select: { name: true, image: true },
    }),
  ]);

  const latestPosts = latest.slice(0, 6);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-24 sm:px-6 lg:flex-row">
      {/* 左侧信息栏（sticky，桌面端显示）；移动端为顶部简介卡 */}
      <HomeSidebar owner={owner} categories={categories} tags={tags} />

      {/* 右侧文章流 */}
      <div className="min-w-0 flex-1 space-y-20">
        {/* 精选文章 */}
        {featured.length > 0 && (
          <section aria-labelledby="featured-heading">
            <Reveal>
              <h2 id="featured-heading" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                精选文章
              </h2>
            </Reveal>
            <Stagger className="mt-6 grid gap-5 sm:grid-cols-2" staggerChildren={0.06}>
              {featured.map((post) => (
                <StaggerItem key={post.id}>
                  <PostCard post={post} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}

        {/* 最新文章 */}
        {latestPosts.length > 0 && (
          <section aria-labelledby="latest-heading">
            <Reveal>
              <div className="flex items-end justify-between">
                <h2 id="latest-heading" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  最新文章
                </h2>
                <Link
                  href="/blog"
                  className="text-sm font-medium text-muted transition-colors duration-200 hover:text-accent"
                >
                  查看全部 →
                </Link>
              </div>
            </Reveal>
            <Stagger className="mt-6 grid gap-5 sm:grid-cols-2" staggerChildren={0.06}>
              {latestPosts.map((post) => (
                <StaggerItem key={post.id}>
                  <PostCard post={post} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}
      </div>
    </div>
  );
}
