import type { Metadata } from "next";
import Link from "next/link";

import { CategoryDonut } from "@/components/admin/charts/CategoryDonut";
import { TopPostsRank } from "@/components/admin/charts/TopPostsRank";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { StatCard } from "@/components/admin/StatCard";
import { DASHBOARD_RANGES, getDashboardData, parseRange } from "@/lib/stats";
import { formatCount } from "@/lib/utils";

export const metadata: Metadata = { title: "管理后台" };
export const dynamic = "force-dynamic";

const CARD_CLS = "rounded-2xl border border-border bg-surface p-5";

// 统计看板：概览计数 + 趋势 + 热门文章 + 分类分布
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const days = parseRange(range);
  const data = await getDashboardData(days);
  const { totals, delta } = data;

  // 环比：上一周期为 0 时没有可比基数，回落 null（卡片显示「持平」）
  const pctOf = (d: { current: number; previous: number }) =>
    d.previous === 0 ? null : ((d.current - d.previous) / d.previous) * 100;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">仪表盘</h1>
          <p className="mt-1 text-sm text-muted">近 {days} 天的站点表现</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border p-1">
            {DASHBOARD_RANGES.map((r) => (
              <Link
                key={r}
                href={`/admin?range=${r}`}
                aria-current={r === days ? "true" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                  r === days ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                近 {r} 天
              </Link>
            ))}
          </div>
          <Link
            href="/admin/posts/new"
            className="inline-flex h-9 cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-opacity duration-200 hover:opacity-90"
          >
            写文章
          </Link>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          icon="ph:eye-bold"
          label="总浏览量"
          value={totals.views}
          delta={pctOf(delta.views)}
          hint={`近 ${days} 天 ${formatCount(delta.views.current)}`}
        />
        <StatCard
          icon="ph:chats-bold"
          label="评论"
          value={totals.comments}
          delta={pctOf(delta.comments)}
          hint={totals.pendingComments > 0 ? `${totals.pendingComments} 条待审核` : "无待审核"}
          href="/admin/comments"
        />
        <StatCard
          icon="ph:heart-bold"
          label="获赞"
          value={totals.likes}
          delta={pctOf(delta.likes)}
          hint={`近 ${days} 天 ${formatCount(delta.likes.current)}`}
        />
        <StatCard
          icon="ph:article-bold"
          label="已发布"
          value={totals.published}
          hint={`${totals.drafts} 篇草稿`}
          href="/admin/posts"
        />
        <StatCard
          icon="ph:users-bold"
          label="注册用户"
          value={totals.users}
          delta={pctOf(delta.users)}
          hint={`近 ${days} 天新增 ${formatCount(delta.users.current)}`}
          href="/admin/users"
        />
        <StatCard
          icon="ph:envelope-bold"
          label="待处理申请"
          value={totals.pendingRequests}
          hint={totals.pendingRequests > 0 ? "等待审核" : "已全部处理"}
          href="/admin/invites"
        />
      </div>

      {/* 趋势 */}
      <section className={`mt-4 ${CARD_CLS}`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">趋势</h2>
          <p className="text-xs text-muted">按东八区自然日统计</p>
        </div>
        <div className="mt-4">
          <TrendChart data={data.trend} />
        </div>
        <p className="mt-3 text-xs text-muted">
          评论、点赞与新用户按创建时间统计；浏览量按天累计，自接入统计之日起才有数据。
        </p>
      </section>

      {/* 热门文章 + 分类分布 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className={CARD_CLS}>
          <h2 className="font-display text-lg font-semibold">热门文章</h2>
          <p className="mt-0.5 text-xs text-muted">按累计浏览量排序</p>
          <div className="mt-4">
            <TopPostsRank posts={data.topPosts} />
          </div>
        </section>

        <section className={CARD_CLS}>
          <h2 className="font-display text-lg font-semibold">分类分布</h2>
          <p className="mt-0.5 text-xs text-muted">悬停查看单个分类</p>
          <div className="mt-4">
            <CategoryDonut data={data.categories} />
          </div>
        </section>
      </div>
    </>
  );
}
