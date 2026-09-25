import { Hero } from "@/components/home/Hero";
import { HomeSections } from "@/components/home/HomeSections";
import { Preloader } from "@/components/home/Preloader";

// 首页使用 60 秒 ISR，后台操作会主动刷新缓存。
export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <Preloader />
      <Hero />
      <HomeSections />
    </>
  );
}
