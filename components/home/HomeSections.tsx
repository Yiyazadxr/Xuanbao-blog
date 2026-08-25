import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { Reveal } from "@/components/ui/Reveal";
import { getCategoriesWithCount, getFeaturedPosts, getPosts } from "@/lib/posts";

// 首页下半部分：精选文章 + 最新文章 + 分类入口（服务端取数）
export async function HomeSections() {
  const [featured, { posts: latest }, categories] = await Promise.all([
    getFeaturedPosts(),
    getPosts(),
    getCategoriesWithCount(),
  ]);

  const latestPosts = latest.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-24 px-4 py-24 sm:px-6">
      {/* 精选文章 */}
      {featured.length > 0 && (
        <section aria-labelledby="featured-heading">
          <Reveal>
            <h2 id="featured-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              精选文章
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((post, i) => (
              <Reveal key={post.id} delay={i * 0.08}>
                <PostCard post={post} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 最新文章 */}
      {latestPosts.length > 0 && (
        <section aria-labelledby="latest-heading">
          <Reveal>
            <div className="flex items-end justify-between">
              <h2 id="latest-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
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
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestPosts.map((post, i) => (
              <Reveal key={post.id} delay={i * 0.06}>
                <PostCard post={post} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 分类入口 */}
      <section aria-labelledby="category-heading">
        <Reveal>
          <h2 id="category-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            按分类浏览
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {categories.map((cat, i) => (
            <Reveal key={cat.id} delay={i * 0.08}>
              <Link
                href={`/blog/category/${cat.slug}`}
                className="group flex items-center justify-between rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-accent"
              >
                <div>
                  <p className="text-lg font-bold transition-colors duration-200 group-hover:text-accent">
                    {cat.name}
                  </p>
                  {cat.description && (
                    <p className="mt-1 text-sm text-muted">{cat.description}</p>
                  )}
                </div>
                <span className="font-display text-3xl font-bold text-muted/40">
                  {cat.postCount}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
