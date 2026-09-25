import Link from "next/link";
import { SITE } from "@/lib/constants";
import { getSiteStats } from "@/lib/posts";

// 全站页脚：两端布局，左侧欢迎语，右侧数据化叙事 + 导航
export async function Footer() {
  const stats = await getSiteStats();

  // 不透明底，遮挡水墨背景
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-[var(--footer-py)] sm:flex-row sm:justify-between sm:px-6">
        <p className="text-sm text-foreground/90">欢迎来到{SITE.shortName}的个人博客</p>

        <div className="flex flex-col items-center gap-2 text-center sm:items-end sm:text-right">
          <p className="text-xs tabular-nums text-muted">
            <span>运行 {stats.days} 天</span>
            <span className="mx-2">阅读 {stats.views.toLocaleString("zh-CN")} 次</span>
            <span className="mx-2">文章 {stats.posts} 篇</span>
            <span className="mx-2">文字 {stats.words.toLocaleString("zh-CN")} 字</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted sm:justify-end">
            <span>© {new Date().getFullYear()} {SITE.shortName}</span>
            <Link
              href="/privacy"
              className="text-muted transition-colors duration-200 hover:text-foreground"
            >
              隐私政策
            </Link>
            <Link
              href="/terms"
              className="text-muted transition-colors duration-200 hover:text-foreground"
            >
              用户协议
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
