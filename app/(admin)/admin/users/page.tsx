import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserRowActions } from "@/components/admin/UserRowActions";
import { getFreshUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin, ROLE_BADGE_CLS, ROLE_LABELS, type Role } from "@/lib/roles";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "用户管理" };
export const dynamic = "force-dynamic";

// 用户管理：仅超级管理员可见，管理成员 ↔ 管理员角色、删除用户
export default async function AdminUsersPage() {
  const me = await getFreshUser();
  if (!me) redirect("/");
  if (!isSuperAdmin(me.role)) redirect("/admin");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { posts: true, comments: true } } },
  });

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">用户管理</h1>
      <p className="mt-2 text-sm text-muted">
        角色层级：超级管理员 &gt; 管理员 &gt; 成员。管理员可管理文章/评论/邀请码；成员可评论点赞。
      </p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border bg-surface text-left text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">用户</th>
              <th className="px-5 py-3 font-medium">角色</th>
              <th className="px-5 py-3 font-medium">文章</th>
              <th className="px-5 py-3 font-medium">评论</th>
              <th className="px-5 py-3 font-medium">注册时间</th>
              <th className="px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const role = u.role as Role;
              return (
                <tr key={u.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        ROLE_BADGE_CLS[role] ?? ROLE_BADGE_CLS.MEMBER
                      }`}
                    >
                      {ROLE_LABELS[role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 tabular-nums">{u._count.posts}</td>
                  <td className="px-5 py-3 tabular-nums">{u._count.comments}</td>
                  <td className="px-5 py-3 text-muted">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3">
                    {role === "SUPER_ADMIN" ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <UserRowActions userId={u.id} currentRole={u.role} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
