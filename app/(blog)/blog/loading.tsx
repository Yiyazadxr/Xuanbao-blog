import { PostGridSkeleton } from "@/components/blog/PostCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

// 文章列表页骨架：结构对齐 blog/page.tsx（标题 + 搜索框 + 分类入口 + 9 张卡片）
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
