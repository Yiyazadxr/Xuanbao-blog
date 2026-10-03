import { unstable_cache } from "next/cache";
import { cache } from "react";
import { QUERY_LIMITS, SITE } from "@/lib/constants";
import { recordDailyView } from "@/lib/daily-stats";
import { prisma } from "@/lib/prisma";
import { readingTimeFromWordCount } from "@/lib/utils";

// 公开可见的文章过滤条件：已发布且未归档（草稿/归档均不进入前台）
export const PUBLISHED_FILTER = { published: true, archived: false } as const;

// 列表项不包含正文，摘要和阅读时长由服务端生成。
export type PostListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  readingTime: number;
  createdAt: Date;
  category: { id: string; name: string; slug: string } | null;
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
  tags: { tag: { id: string; name: string; slug: string } }[];
};

// 摘要和字数已落库，列表查询不读取正文。
export function toListItem(row: ListPostRow): PostListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    coverImage: row.coverImage,
    readingTime: readingTimeFromWordCount(row.wordCount),
    createdAt: row.createdAt,
    category: row.category,
    tags: row.tags,
  };
}

// 列表查询不读取 content。
export const listSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  wordCount: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
} as const;

// 公开文章置顶优先；take 在查询层限制数量。
export async function getPosts({
  categorySlug,
  tagSlug,
  seriesSlug,
  skip = 0,
  take,
}: {
  categorySlug?: string;
  tagSlug?: string;
  seriesSlug?: string;
  skip?: number;
  take?: number;
} = {}) {
  const where = {
    ...PUBLISHED_FILTER,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
    ...(seriesSlug ? { series: { slug: seriesSlug } } : {}),
  };

  const pageSize = typeof take === "number" && Number.isSafeInteger(take) && take > 0
    ? Math.min(take, QUERY_LIMITS.postList) : QUERY_LIMITS.postList;
  const offset = Number.isSafeInteger(skip) && skip >= 0 ? skip : 0;
  const total = await prisma.post.count({ where });
  const effectiveSkip = total === 0 ? 0 : Math.min(offset, Math.floor((total - 1) / pageSize) * pageSize);
  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: listSelect,
    skip: effectiveSkip,
    take: pageSize,
  });

  const posts = rows.map(toListItem);
  return { posts, total };
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

// 搜索使用落库的 searchText；缺失时回落到摘要。
export async function getSearchIndex() {
  const rows = await prisma.post.findMany({
    where: PUBLISHED_FILTER,
    orderBy: { createdAt: "desc" },
    select: { ...listSelect, searchText: true },
    take: QUERY_LIMITS.searchIndex,
  });
  return rows.map((r) => ({ ...toListItem(r), text: r.searchText ?? r.excerpt ?? "" }));
}

export type SearchIndexItem = Awaited<ReturnType<typeof getSearchIndex>>[number];

// 单篇文章详情
// React cache 在单次请求内复用详情查询。
export const getPostBySlug = cache(async (slug: string) => {
  return prisma.post.findFirst({
    where: { slug, ...PUBLISHED_FILTER },
    include: {
      author: { select: { name: true, image: true } },
      category: true,
      series: true,
      tags: { include: { tag: true } },
    },
  });
});

// 分类详情（按 slug）
// React cache 在单次请求内复用分类查询。
export const getCategoryBySlug = cache(async (slug: string) => {
  return prisma.category.findUnique({ where: { slug } });
});

// 标签/系列 metadata 与页面主体共用，避免同一次请求重复查询 Prisma。
export const getTagBySlug = cache(async (slug: string) => {
  return prisma.tag.findUnique({ where: { slug } });
});

export const getSeriesBySlug = cache(async (slug: string) => {
  return prisma.series.findUnique({ where: { slug } });
});

// 同一系列内的上一篇 / 下一篇（按发布时间升序，即系列连载顺序）
export async function getSeriesAdjacent(seriesId: string, postId: string) {
  const select = { id: true, title: true, slug: true, createdAt: true } as const;
  const current = await prisma.post.findFirst({ where: { ...PUBLISHED_FILTER, id: postId, seriesId }, select });
  if (!current) return { prev: null, next: null };
  const [prev, next] = await Promise.all([
    prisma.post.findFirst({
      where: { ...PUBLISHED_FILTER, seriesId, OR: [
        { createdAt: { lt: current.createdAt } },
        { createdAt: current.createdAt, id: { lt: current.id } },
      ] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select,
    }),
    prisma.post.findFirst({
      where: { ...PUBLISHED_FILTER, seriesId, OR: [
        { createdAt: { gt: current.createdAt } },
        { createdAt: current.createdAt, id: { gt: current.id } },
      ] },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select,
    }),
  ]);
  return {
    prev: prev ? { title: prev.title, slug: prev.slug } : null,
    next: next ? { title: next.title, slug: next.slug } : null,
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

// 相关阅读条数
const RELATED_COUNT = 3;

// 相关阅读：优先同分类、不足补同标签，按浏览量降序（热文优先）。
// 两段查询而非 OR：保证同分类结果排在前，避免被同标签结果冲散。
export async function getRelatedPosts(post: {
  id: string;
  categoryId: string | null;
  tagIds: string[];
}): Promise<PostListItem[]> {
  const picked: PostListItem[] = [];
  const exclude = new Set<string>([post.id]);

  if (post.categoryId) {
    const rows = await prisma.post.findMany({
      where: { ...PUBLISHED_FILTER, categoryId: post.categoryId, id: { notIn: [...exclude] } },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: RELATED_COUNT,
      select: listSelect,
    });
    for (const row of rows) {
      picked.push(toListItem(row));
      exclude.add(row.id);
    }
  }

  if (picked.length < RELATED_COUNT && post.tagIds.length > 0) {
    const rows = await prisma.post.findMany({
      where: {
        ...PUBLISHED_FILTER,
        id: { notIn: [...exclude] },
        tags: { some: { tagId: { in: post.tagIds } } },
      },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: RELATED_COUNT - picked.length,
      select: listSelect,
    });
    for (const row of rows) picked.push(toListItem(row));
  }

  return picked;
}

// 仅统计仍然公开的文章；无效 ID 或撤稿不会污染每日统计。
export async function incrementViewCount(id: string) {
  const result = await prisma.post.updateMany({
    where: { id, ...PUBLISHED_FILTER }, data: { viewCount: { increment: 1 } },
  });
  if (!result.count) return false;
  await recordDailyView();
  return true;
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
    take: QUERY_LIMITS.archive,
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
// 用 unstable_cache 包裹，5 分钟内重复请求直接返回缓存，避免全站每个页面都查库拖慢性能。
// 注：Next 16 中 unstable_cache 已弃用，推荐迁移至 "use cache" 指令 + cacheTag/cacheLife；
// 但 "use cache"/cacheTag 要求在 next.config.ts 启用 cacheComponents（全应用静态优先、
// 动态 API 需显式 opt-in），属于影响所有路由缓存语义的大变更，超出本次优化爆炸半径，
// 暂缓迁移，待单独评估 cacheComponents 全量影响后再做。
export const getSiteStats = unstable_cache(
  async () => {
    const aggregate = await prisma.post.aggregate({
      where: PUBLISHED_FILTER,
      _count: { _all: true },
      _sum: { viewCount: true, wordCount: true },
    });

    const days = Math.max(
      0,
      Math.floor((Date.now() - new Date(SITE.launchedAt).getTime()) / 86_400_000)
    );

    return {
      days,
      views: aggregate._sum.viewCount ?? 0,
      posts: aggregate._count._all,
      words: aggregate._sum.wordCount ?? 0,
    };
  },
  ["site-stats"],
  { revalidate: 300 } // 5 分钟 ISR 缓存
);
