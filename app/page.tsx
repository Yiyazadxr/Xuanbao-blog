import { Hero } from "@/components/home/Hero";
import { HomeSections } from "@/components/home/HomeSections";
import { Preloader } from "@/components/home/Preloader";

export const dynamic = "force-dynamic";

// 首页：进场幕布 + 沉浸式 Hero + 精选/最新文章 + 分类入口
export default function HomePage() {
  return (
    <>
      <Preloader />
      <Hero />
      <HomeSections />
    </>
  );
}
