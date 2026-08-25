// 文章数据查询层：所有文章相关的数据库读写集中在这里
import { prisma } from "@/lib/prisma";

export const PAGE_SIZE = 9;

// 文章列表（分页 + 分类/标签/关键词筛选，仅已发布）
export async function getPosts({
  page = 1,
  categorySlug,
  tagSlug,
  q,
}: {
  page?: number;
  categorySlug?: string;
  tagSlug?: string;
  q?: string;
} = {}) {
  // 截断超长关键词：content 的 LIKE 全表扫描会随查询串变长放大，限制长度防滥用
  const query = q?.trim().slice(0, 50);
  const where = {
    published: true,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { excerpt: { contains: query } },
            { content: { contains: query } },
          ],
        }
      : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

// 单篇文章详情
export async function getPostBySlug(slug: string) {
  return prisma.post.findFirst({
    where: { slug, published: true },
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
      where: { published: true, createdAt: { lt: createdAt } },
      orderBy: { createdAt: "desc" },
      select,
    }),
    prisma.post.findFirst({
      where: { published: true, createdAt: { gt: createdAt } },
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

// 分类列表（带已发布文章数）
export async function getCategoriesWithCount() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { posts: { where: { published: true } } } } },
    orderBy: { name: "asc" },
  });
  return categories.map((c) => ({ ...c, postCount: c._count.posts }));
}

// 标签列表（带已发布文章数）
export async function getTagsWithCount() {
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { posts: { where: { post: { published: true } } } } } },
    orderBy: { name: "asc" },
  });
  return tags.map((t) => ({ ...t, postCount: t._count.posts }));
}

// 归档：全部已发布文章按年份分组（新→旧）
export async function getArchive() {
  const posts = await prisma.post.findMany({
    where: { published: true },
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
