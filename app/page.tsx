import { Hero } from "@/components/home/Hero";
import { HomeSections } from "@/components/home/HomeSections";
import { Preloader } from "@/components/home/Preloader";

// 首页采用 ISR：每 60 秒后台重新生成，避免每次都实时查询（后台操作也会主动 revalidate）
export const revalidate = 60;

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
