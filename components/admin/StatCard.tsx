import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { formatCount } from "@/lib/utils";

// 看板概览卡片：图标 + 数值 + 环比 + 补充说明，可整卡跳转
// delta 为环比百分比（null 表示上一周期为 0，无可比基数）
export function StatCard({
  icon,
  label,
  value,
  delta = null,
  hint,
  href,
}: {
  icon: string;
  label: string;
  value: number;
  delta?: number | null;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-muted">
        <Icon icon={icon} width={16} height={16} aria-hidden />
        <span className="text-xs font-medium">{label}</span>
        {delta !== null && <DeltaBadge delta={delta} />}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{formatCount(value)}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );

  const cls =
    "block rounded-2xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-accent";

  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const up = delta >= 0;
  return (
    <span
      className={`ml-auto text-[11px] font-medium tabular-nums ${
        Math.abs(delta) < 1
          ? "text-muted"
          : up
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-500"
      }`}
      title="与上一个等长周期相比"
    >
      {Math.abs(delta) < 1 ? "持平" : `${up ? "↑" : "↓"}${Math.round(Math.abs(delta))}%`}
    </span>
  );
}
