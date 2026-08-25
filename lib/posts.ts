// 文章数据查询层：所有文章相关的数据库读写集中在这里
import { prisma } from "@/lib/prisma";

export const PAGE_SIZE = 9;

// 公开可见的文章过滤条件：已发布且未归档（草稿/归档均不进入前台）
const PUBLISHED_FILTER = { published: true, archived: false } as const;

// 文章列表（分页 + 分类/标签筛选，仅公开可见；置顶优先）
export async function getPosts({
  page = 1,
  categorySlug,
  tagSlug,
}: {
  page?: number;
  categorySlug?: string;
  tagSlug?: string;
} = {}) {
  const where = {
    ...PUBLISHED_FILTER,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return { posts, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

// 列表项类型（组件 props 用）
export type PostListItem = Awaited<ReturnType<typeof getPosts>>["posts"][number];

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
      tags: { include: { tag: true } },
    },
  });
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
