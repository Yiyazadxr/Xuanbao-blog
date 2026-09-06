// RSS 订阅源：某系列下的文章，分页（?page=N）
import { SITE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { buildRssFeed, fetchRssPosts, parsePage } from "@/lib/rss";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const page = parsePage(url.searchParams);

  const series = await prisma.series.findUnique({ where: { slug }, select: { name: true } });
  if (!series) {
    return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const { posts, total } = await fetchRssPosts({
    where: { published: true, archived: false, series: { slug } },
    page,
  });

  return buildRssFeed({
    title: `${SITE.name} · 系列「${series.name}」`,
    description: `${SITE.name}「${series.name}」系列下的文章订阅`,
    feedPath: `series/${slug}`,
    posts,
    page,
    total,
  });
}
