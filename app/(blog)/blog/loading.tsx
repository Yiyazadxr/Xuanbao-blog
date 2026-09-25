import { PostGridSkeleton } from "@/components/blog/PostCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

// 骨架结构与文章列表一致，避免布局跳动。
export default function BlogLoading() {
  return (
    <div aria-busy="true">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-12 w-40" />
          <Skeleton className="mt-3 h-5 w-28" />
        </div>
        <Skeleton className="h-10 w-full rounded-full sm:w-64" />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>

      <div className="mt-10">
        <PostGridSkeleton />
      </div>
    </div>
  );
}
