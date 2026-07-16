import { Hero } from "@/components/home/Hero";

// 首页：沉浸式 Hero（Phase 6 将在下方追加精选文章、分类入口等区块）
export default function HomePage() {
  return (
    <>
      <Hero />
      {/* 占位区：验证 Hero 之后的内容滚动与页脚衔接，Phase 6 替换为真实区块 */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          更多内容建设中
        </h2>
        <p className="mt-4 max-w-xl leading-relaxed text-muted">
          精选文章、分类导航等区块即将上线，先去「文章」页逛逛吧。
        </p>
      </section>
    </>
  );
}
