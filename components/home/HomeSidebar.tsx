import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { SITE } from "@/lib/constants";
import { SocialLinks } from "@/components/home/SocialLinks";

// 头像 + 昵称 + 签名（桌面侧栏与移动端顶部卡共用）
function Profile({
  owner,
}: {
  owner?: { name: string; image: string | null } | null;
}) {
  const name = owner?.name ?? SITE.shortName;
  return (
    <>
      <Avatar
        image={owner?.image}
        name={name}
        seed={owner?.name ?? name}
        className="size-24 text-6xl lg:size-28 lg:text-7xl"
      />
      <div>
        <p className="font-bold lg:text-lg">{name}</p>
        <p className="mt-1 text-sm text-muted">遗憾你自己留着吧，我有小怡了。</p>
      </div>
    </>
  );
}

// 首页左侧信息栏（桌面 sticky）+ 移动端顶部简介卡
export function HomeSidebar({
  owner,
  categories,
  tags,
}: {
  owner?: { name: string; image: string | null } | null;
  categories: { id: string; name: string; slug: string; postCount: number }[];
  tags: { id: string; name: string; slug: string; postCount: number }[];
}) {
  return (
    <>
      {/* 移动端/平板：顶部水平简介卡（头像在左，昵称签名+社交在右） */}
      <div className="lg:hidden">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
          <Profile owner={owner} />
          <SocialLinks />
        </div>
      </div>

      {/* 桌面端：sticky 左侧信息栏 */}
      <aside className="sticky top-[calc(var(--header-h)+1.5rem)] hidden flex-col gap-6 self-start lg:flex lg:w-72">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-6 text-center">
          <Profile owner={owner} />
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
