import { CommentForm } from "@/components/comments/CommentForm";
import { CommentList } from "@/components/comments/CommentList";
import { getApprovedComments, getCommentCounts } from "@/lib/comments";
import { getFreshUser } from "@/lib/auth";
import { getMuteInfo } from "@/lib/mute";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions-server";
import { ROLES, type Role } from "@/lib/roles";

// 评论区（服务端获取第一页数据，后续分页在客户端 CommentList 中加载）
export async function CommentSection({ postId, slug }: { postId: string; slug: string }) {
  const [comments, counts, user] = await Promise.all([
    getApprovedComments(postId),
    getCommentCounts(postId),
    getFreshUser(),
  ]);
  const [canModerate, mute] = await Promise.all([
    hasPermission(user?.role as Role, PERMISSIONS.DELETE_COMMENTS),
    // 仅对非超管展示禁言提示（超管服务端免禁言校验）
    user && user.role !== ROLES.SUPER_ADMIN ? getMuteInfo(user.id) : Promise.resolve(null),
  ]);

  return (
    <section aria-label="评论区" className="mt-16 border-t border-border pt-10">
      <h2 className="text-xl font-bold tracking-tight">评论 {counts.total > 0 && `· ${counts.total}`}</h2>
      <div className="mt-6">
        <CommentForm postId={postId} slug={slug} muteInfo={mute} />
      </div>
      {comments.length > 0 && (
        <CommentList
          initialComments={comments}
          topLevel={counts.topLevel}
          postId={postId}
          slug={slug}
          canModerate={canModerate}
          currentUserId={user?.id ?? null}
        />
      )}
    </section>
  );
}
