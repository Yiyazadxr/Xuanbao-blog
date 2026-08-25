import Link from "next/link";

// 分页导航：基于 URL searchParams，服务端组件即可
export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const linkCls =
    "inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-full border border-border px-4 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const disabledCls =
    "inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm text-muted opacity-50";

  return (
    <nav aria-label="分页" className="mt-12 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={linkCls}>
          上一页
        </Link>
      ) : (
        <span className={disabledCls} aria-disabled="true">
          上一页
        </span>
      )}
      <span className="text-sm text-muted" aria-live="polite">
        第 {page} / {totalPages} 页
      </span>
      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={linkCls}>
          下一页
        </Link>
      ) : (
        <span className={disabledCls} aria-disabled="true">
          下一页
        </span>
      )}
    </nav>
  );
}
