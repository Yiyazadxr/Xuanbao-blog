import { PostGridSkeleton } from "@/components/blog/PostCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

// 骨架结构与标签页一致，避免布局跳动。
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
