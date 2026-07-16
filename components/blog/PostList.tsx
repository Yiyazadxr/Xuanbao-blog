import type { PostListItem } from "@/lib/posts";
import { PostCard } from "@/components/blog/PostCard";

// 文章卡片网格 + 空状态
export function PostList({ posts }: { posts: PostListItem[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-20 text-center">
        <p className="text-lg font-medium">这里空空如也</p>
        <p className="mt-2 text-sm text-muted">没有找到符合条件的文章，换个关键词试试？</p>
      </div>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
