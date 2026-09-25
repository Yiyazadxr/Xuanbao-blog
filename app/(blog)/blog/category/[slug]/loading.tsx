import { PostGridSkeleton } from "@/components/blog/PostCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

// 骨架结构与分类页一致，避免布局跳动。
export default function CategoryLoading() {
  return (
    <div aria-busy="true">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-2 h-5 w-64" />
      <Skeleton className="mt-2 h-4 w-24" />
      <div className="mt-8">
        <PostGridSkeleton />
      </div>
    </div>
  );
}
