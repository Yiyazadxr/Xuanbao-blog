import { Skeleton } from "@/components/ui/Skeleton";

// 与 PostCard 结构 1:1（封面区固定 h-40），保证骨架卡片与真实卡片等高，
// 数据到位后只是"填色"，不发生布局位移
export function PostCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6">
      <Skeleton className="-mx-6 -mt-6 mb-4 h-40 rounded-t-2xl" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3.5 w-20" />
      </div>
      <Skeleton className="mt-4 h-6 w-4/5" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-3.5 w-14" />
      </div>
    </div>
  );
}

// 列表骨架：默认 9 张，与 PostListPaginated 的 PAGE_SIZE 一致，翻页时高度也能对上
export function PostGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}
