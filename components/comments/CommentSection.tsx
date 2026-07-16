import { CommentForm } from "@/components/comments/CommentForm";
import { CommentItem } from "@/components/comments/CommentItem";
import { getApprovedComments } from "@/lib/comments";

// 评论区（服务端获取数据，表单与交互在客户端子组件）
export async function CommentSection({ postId, slug }: { postId: string; slug: string }) {
  const comments = await getApprovedComments(postId);
  const total = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  return (
    <section aria-label="评论区" className="mt-16 border-t border-border pt-10">
      <h2 className="text-xl font-bold tracking-tight">评论 {total > 0 && `· ${total}`}</h2>
      <div className="mt-6">
        <CommentForm postId={postId} slug={slug} />
      </div>
      {comments.length > 0 && (
        <ul className="mt-8 divide-y divide-border">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} postId={postId} slug={slug} />
          ))}
        </ul>
      )}
    </section>
  );
}
