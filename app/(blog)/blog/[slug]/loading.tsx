import { Skeleton } from "@/components/ui/Skeleton";

// ISR 文章页的加载骨架与详情布局等高，避免导航时空白或布局跳动。
export default function BlogPostLoading() {
  return (
    <article className="mx-auto max-w-4xl" aria-busy="true">
      <header className="mb-12">
        <Skeleton className="h-4 w-16" />
        <div className="mt-3 space-y-3">
          <Skeleton className="h-11 w-3/4" />
          <Skeleton className="h-11 w-1/2" />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
      </header>

      <div className="flex gap-12 xl:gap-16">
        <div className="min-w-0 flex-1 space-y-4">
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} style={{ width: `${80 - (i % 4) * 10}%` }}>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
          <div className="pt-8">
            <Skeleton className="mx-auto h-10 w-48 rounded-full" />
          </div>
        </div>
        <aside className="hidden w-56 flex-shrink-0 xl:block">
          <Skeleton className="h-4 w-20" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-3.5 w-full" />
            ))}
          </div>
        </aside>
      </div>
    </article>
  );
}
