import { Hero } from "@/components/home/Hero";
import { HomeSections } from "@/components/home/HomeSections";

export const dynamic = "force-dynamic";

// 首页：沉浸式 Hero + 精选/最新文章 + 分类入口
export default function HomePage() {
  return (
    <>
      <Hero />
      <HomeSections />
    </>
  );
}
