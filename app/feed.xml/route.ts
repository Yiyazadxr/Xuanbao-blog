// RSS 订阅源：最新 20 篇已发布文章
import { SITE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { plainExcerpt } from "@/lib/utils";

export const dynamic = "force-dynamic";

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { title: true, slug: true, excerpt: true, content: true, createdAt: true },
  });

  const items = posts
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE.url}/blog/${post.slug}</link>
      <guid>${SITE.url}/blog/${post.slug}</guid>
      <description>${escapeXml(post.excerpt || plainExcerpt(post.content))}</description>
      <pubDate>${post.createdAt.toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${SITE.url}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
