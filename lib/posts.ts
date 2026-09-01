// 文章数据查询层：所有文章相关的数据库读写集中在这里
import { unstable_cache } from "next/cache";
import { SITE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// 公开可见的文章过滤条件：已发布且未归档（草稿/归档均不进入前台）
const PUBLISHED_FILTER = { published: true, archived: false } as const;

// 列表项类型：不含正文，readingTime 与摘要已在服务端算好（供卡片/客户端分页使用）
export type PostListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  readingTime: number;
  createdAt: Date;
  category: { id: string; name: string; slug: string } | null;
  series: { id: string; name: string; slug: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
};

type ListPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  wordCount: number | null;
  createdAt: Date;
  category: { id: string; name: string; slug: string } | null;
  series: { id: string; name: string; slug: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
};

// 把数据库行映射为轻量列表项。
// 摘要与字数在保存文章时已落库（excerpt / wordCount），列表查询不再回读 content 全文，
// 避免把所有文章正文拉进服务端内存只为现场算摘要。
function toListItem(row: ListPostRow): PostListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    coverImage: row.coverImage,
    readingTime: Math.max(1, Math.round((row.wordCount ?? 0) / 400)),
    createdAt: row.createdAt,
    category: row.category,
    series: row.series,
    tags: row.tags,
  };
}

// 列表查询字段：不取 content 全文（正文已在保存时折算为 excerpt + wordCount）
const listSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  wordCount: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  series: { select: { id: true, name: true, slug: true } },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
} as const;

// 文章列表（全部公开文章，客户端分页；置顶优先）
export async function getPosts({
  categorySlug,
  tagSlug,
  seriesSlug,
}: {
  categorySlug?: string;
  tagSlug?: string;
  seriesSlug?: string;
} = {}) {
  const where = {
    ...PUBLISHED_FILTER,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
    ...(seriesSlug ? { series: { slug: seriesSlug } } : {}),
  };

  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select: listSelect,
  });

  const posts = rows.map(toListItem);
  return { posts, total: posts.length };
}

// 首页精选文章
export async function getFeaturedPosts() {
  const rows = await prisma.post.findMany({
    where: { ...PUBLISHED_FILTER, featured: true },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: listSelect,
  });
  return rows.map(toListItem);
}

// 搜索索引：全部公开文章的精简字段（供客户端 Fuse.js 模糊搜索）
export async function getSearchIndex() {
  return prisma.post.findMany({
    where: PUBLISHED_FILTER,
    orderBy: { createdAt: "desc" },
    select: { slug: true, title: true, excerpt: true, createdAt: true },
  });
}

export type SearchIndexItem = Awaited<ReturnType<typeof getSearchIndex>>[number];

// 单篇文章详情
export async function getPostBySlug(slug: string) {
  return prisma.post.findFirst({
    where: { slug, ...PUBLISHED_FILTER },
    include: {
      author: { select: { name: true, image: true } },
      category: true,
      series: true,
      tags: { include: { tag: true } },
    },
  });
}

// 同一系列内的上一篇 / 下一篇（按发布时间升序，即系列连载顺序）
export async function getSeriesAdjacent(seriesId: string, postId: string) {
  const select = { id: true, title: true, slug: true, createdAt: true } as const;
  const posts = await prisma.post.findMany({
    where: { ...PUBLISHED_FILTER, seriesId },
    orderBy: { createdAt: "asc" },
    select,
  });
  const index = posts.findIndex((p) => p.id === postId);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? { title: posts[index - 1].title, slug: posts[index - 1].slug } : null,
    next: index < posts.length - 1 ? { title: posts[index + 1].title, slug: posts[index + 1].slug } : null,
  };
}

// 上一篇 / 下一篇（按发布时间排序）
export async function getAdjacentPosts(createdAt: Date) {
  const select = { title: true, slug: true } as const;
  const [prev, next] = await Promise.all([
    prisma.post.findFirst({
      where: { ...PUBLISHED_FILTER, createdAt: { lt: createdAt } },
      orderBy: { createdAt: "desc" },
      select,
    }),
    prisma.post.findFirst({
      where: { ...PUBLISHED_FILTER, createdAt: { gt: createdAt } },
      orderBy: { createdAt: "asc" },
      select,
    }),
  ]);
  return { prev, next };
}

// 浏览量 +1（详情页触发，失败不影响页面渲染）
export async function incrementViewCount(id: string) {
  try {
    await prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  } catch (e) {
    // 计数失败不影响渲染，记录日志便于排查
    console.error("浏览量计数失败：", e);
  }
}

// 分类列表（带公开文章数）
export async function getCategoriesWithCount() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { posts: { where: PUBLISHED_FILTER } } } },
    orderBy: { name: "asc" },
  });
  return categories.map((c) => ({ ...c, postCount: c._count.posts }));
}

// 标签列表（带公开文章数）
export async function getTagsWithCount() {
  const tags = await prisma.tag.findMany({
    include: {
      _count: { select: { posts: { where: { post: PUBLISHED_FILTER } } } },
    },
    orderBy: { name: "asc" },
  });
  return tags.map((t) => ({ ...t, postCount: t._count.posts }));
}

// 归档：全部公开文章按年份分组（新→旧）
export async function getArchive() {
  const posts = await prisma.post.findMany({
    where: PUBLISHED_FILTER,
    orderBy: { createdAt: "desc" },
    select: { title: true, slug: true, createdAt: true },
  });
  const byYear = new Map<number, typeof posts>();
  for (const post of posts) {
    const year = post.createdAt.getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(post);
  }
  return [...byYear.entries()].map(([year, items]) => ({ year, posts: items }));
}

// 页脚统计：运行天数 + 总阅读量 + 公开文章数 + 正文总字数
// 用 unstable_cache 包裹，5 分钟内重复请求直接返回缓存，避免全站每个页面都查库拖慢性能
export const getSiteStats = unstable_cache(
  async () => {
    const [postCount, viewAgg, wordAgg] = await Promise.all([
      prisma.post.count({ where: PUBLISHED_FILTER }),
      prisma.post.aggregate({ _sum: { viewCount: true }, where: PUBLISHED_FILTER }),
      prisma.post.aggregate({ _sum: { wordCount: true }, where: PUBLISHED_FILTER }),
    ]);

    const days = Math.max(
      0,
      Math.floor((Date.now() - new Date(SITE.launchedAt).getTime()) / 86_400_000)
    );

    return {
      days,
      views: viewAgg._sum.viewCount ?? 0,
      posts: postCount,
      words: wordAgg._sum.wordCount ?? 0,
    };
  },
  ["site-stats"],
  { revalidate: 300 } // 5 分钟 ISR 缓存
);
