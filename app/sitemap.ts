import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// 实时生成，使新发布文章立即进入站点地图。
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, series, tags] = await Promise.all([
    prisma.post.findMany({
      where: { published: true, archived: false },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.series.findMany({ select: { slug: true } }),
    prisma.tag.findMany({ select: { slug: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE.url, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/blog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/blog/archive`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/social`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE.url}/tools`, changeFrequency: "monthly", priority: 0.4 },
  ];

  return [
    ...staticPages,
    ...posts.map((post) => ({
      url: `${SITE.url}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: `${SITE.url}/blog/category/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...series.map((s) => ({
      url: `${SITE.url}/blog/series/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...tags.map((t) => ({
      url: `${SITE.url}/blog/tag/${t.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
  ];
}
