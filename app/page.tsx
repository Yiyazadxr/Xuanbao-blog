import { Hero } from "@/components/home/Hero";
import { HomeSections } from "@/components/home/HomeSections";
import { Preloader } from "@/components/home/Preloader";

// 首页 ISR：60 秒后台重新生成，后台操作也会主动 revalidate
export const revalidate = 60;

// 首页：幕布 + Hero + 精选/最新
export default function HomePage() {
  return (
    <>
      <Preloader />
      <Hero />
      <HomeSections />
    </>
  );
}
