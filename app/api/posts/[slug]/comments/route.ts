import { NextResponse } from "next/server";
import { getFreshUser } from "@/lib/auth";
import { getApprovedComments, getCommentCounts } from "@/lib/comments";
import { getMuteInfo } from "@/lib/mute";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { ROLES, type Role } from "@/lib/roles";
import type { CommentsPayload } from "@/lib/comment-types";

// ISR 详情页在客户端加载个性化评论状态；日期序列化为字符串。
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { id: true, published: true, archived: true },
  });
  if (!post || !post.published || post.archived) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [comments, counts, user] = await Promise.all([
    getApprovedComments(post.id),
    getCommentCounts(post.id),
    getFreshUser(),
  ]);
  const [canModerate, muteInfo] = await Promise.all([
    hasPermission(user?.role as Role, PERMISSIONS.DELETE_COMMENTS),
    // SUPER_ADMIN 不显示禁言状态。
    user && user.role !== ROLES.SUPER_ADMIN ? getMuteInfo(user.id) : Promise.resolve(null),
  ]);

  const payload: CommentsPayload = {
    ...comments,
    topLevel: counts.topLevel,
    total: counts.total,
    canModerate,
    currentUserId: user?.id ?? null,
    muteInfo,
  };
  return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
}
