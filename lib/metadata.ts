import type { Metadata } from "next";

import { SITE } from "@/lib/constants";

// 公开页统一 Open Graph：type=website + title/description/url。
// siteName / locale 已在根布局默认 openGraph 中设置，此处自动继承；
// 文章详情页（type=article + 封面图）单独实现，不走这里。
export function websiteOpenGraph(
  title: string,
  description: string,
  path: string
): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    title,
    description,
    url: `${SITE.url}${path}`,
  };
}
