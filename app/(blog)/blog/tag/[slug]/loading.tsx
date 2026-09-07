import { PostGridSkeleton } from "@/components/blog/PostCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

// 标签页骨架：结构对齐 tag/[slug]/page.tsx（标题 + 计数 + 9 张卡片）
export default function TagLoading() {
  return (
    <div aria-busy="true">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-2 h-4 w-24" />
      <div className="mt-8">
        <PostGridSkeleton />
      </div>
    </div>
  );
}
