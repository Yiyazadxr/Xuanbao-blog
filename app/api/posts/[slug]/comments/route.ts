import { NextResponse } from "next/server";
import { getFreshUser } from "@/lib/auth";
import { getApprovedComments, getCommentCounts } from "@/lib/comments";
import { getMuteInfo } from "@/lib/mute";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { ROLES, type Role } from "@/lib/roles";

// 评论首屏数据（含按用户个性化的审核权/禁言状态）。
// 文章详情页改为 ISR 后由客户端挂载时拉取；日期经 JSON 序列化为字符串，
// 展示层的 formatDate 同时接受 Date 与 string，无需特殊处理。
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
    // 仅对非超管展示禁言提示（超管服务端免禁言校验）
    user && user.role !== ROLES.SUPER_ADMIN ? getMuteInfo(user.id) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    comments,
    topLevel: counts.topLevel,
    total: counts.total,
    canModerate,
    currentUserId: user?.id ?? null,
    muteInfo,
  });
}
