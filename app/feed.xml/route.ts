// RSS 订阅源：全站最新文章，分页（?page=N，每页 20 篇）
import { SITE } from "@/lib/constants";
import { buildRssFeed, fetchRssPosts, parsePage } from "@/lib/rss";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parsePage(url.searchParams);
  const PUBLISHED = { published: true, archived: false };
  const { posts, total } = await fetchRssPosts({ where: PUBLISHED, page });

  return buildRssFeed({
    title: SITE.name,
    description: SITE.description,
    feedPath: "",
    posts,
    page,
    total,
  });
}
