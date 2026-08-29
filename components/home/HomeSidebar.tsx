import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { CONTACT, SITE } from "@/lib/constants";

// 头像 + 昵称 + 签名（桌面侧栏与移动端顶部卡共用）
function Profile() {
  return (
    <>
      <span
        lang="zh"
        className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 text-4xl font-bold leading-none text-accent lg:size-20 lg:text-5xl"
        style={{ fontFamily: '"幼圆", "YouYuan", "Yuanti SC", "PingFang SC", sans-serif' }}
      >
        暄
      </span>
      <div>
        <p className="font-bold lg:text-lg">{SITE.shortName}</p>
        <p className="mt-1 text-sm text-muted">记录技术、生活与一切让我着迷的东西</p>
      </div>
    </>
  );
}

// 社交图标行
function SocialLinks() {
  return (
    <div className="flex items-center gap-1">
      <a
        href="https://github.com/Yiyazadxr"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub"
        className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
      >
        <Icon icon="ph:github-logo-bold" width={18} height={18} aria-hidden />
      </a>
      <a
        href={`mailto:${CONTACT.email}`}
        aria-label="Email"
        className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
      >
        <Icon icon="ph:envelope-bold" width={18} height={18} aria-hidden />
      </a>
      <a
        href="/feed.xml"
        aria-label="RSS"
        className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
      >
        <Icon icon="ph:rss-simple-bold" width={18} height={18} aria-hidden />
      </a>
    </div>
  );
}

// 首页左侧信息栏（桌面 sticky）+ 移动端顶部简介卡
export function HomeSidebar({
  categories,
  tags,
}: {
  categories: { id: string; name: string; slug: string; postCount: number }[];
  tags: { id: string; name: string; slug: string; postCount: number }[];
}) {
  return (
    <>
      {/* 移动端/平板：顶部水平简介卡（头像在左，昵称签名+社交在右） */}
      <div className="lg:hidden">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
          <Profile />
          <SocialLinks />
        </div>
      </div>

      {/* 桌面端：sticky 左侧信息栏 */}
      <aside className="sticky top-[calc(var(--header-h)+1.5rem)] hidden flex-col gap-6 self-start lg:flex lg:w-72">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-6 text-center">
          <Profile />
          <SocialLinks />
        </div>

        {categories.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">分类</p>
            <div className="mt-3 flex flex-col gap-1">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/blog/category/${cat.slug}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
                >
                  <span>{cat.name}</span>
                  <span className="text-xs tabular-nums text-muted/60">{cat.postCount}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">标签</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.slice(0, 12).map((tag) => (
                <Link
                  key={tag.id}
                  href={`/blog/tag/${tag.slug}`}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors duration-150 hover:border-accent hover:text-accent"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
