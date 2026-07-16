import type { Metadata } from "next";
import {
  CreateInviteButton,
  DeleteInviteButton,
  RequestActions,
} from "@/components/admin/InviteActions";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "申请与邀请码" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  PENDING: { text: "待处理", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  APPROVED: { text: "已注册", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  REJECTED: { text: "已拒绝", cls: "bg-red-500/10 text-red-500" },
};

// 账号申请列表 + 邀请码管理
export default async function AdminInvitesPage() {
  const [requests, invites] = await Promise.all([
    prisma.accountRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { usedBy: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">申请与邀请码</h1>
        <CreateInviteButton />
      </div>

      {/* 账号申请 */}
      <h2 className="mt-10 text-lg font-bold">账号申请</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        {requests.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">暂无申请</p>
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((req) => {
              const status = STATUS_LABEL[req.status] ?? STATUS_LABEL.PENDING;
              return (
                <li
                  key={req.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{req.email}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>
                        {status.text}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(req.createdAt)}
                      {req.message && ` · ${req.message}`}
                    </p>
                  </div>
                  {req.status === "PENDING" && <RequestActions requestId={req.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 邀请码 */}
      <h2 className="mt-10 text-lg font-bold">邀请码</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        {invites.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">暂无邀请码</p>
        ) : (
          <ul className="divide-y divide-border">
            {invites.map((invite) => {
              const expired = invite.expiresAt && invite.expiresAt < new Date();
              return (
                <li
                  key={invite.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-foreground/5 px-2.5 py-1 font-mono text-sm font-semibold">
                        {invite.code}
                      </code>
                      {invite.usedBy ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          已被 {invite.usedBy.name} 使用
                        </span>
                      ) : expired ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                          已过期
                        </span>
                      ) : (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                          未使用
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {invite.email ? `绑定 ${invite.email}` : "通用（不绑定邮箱）"} · 创建于{" "}
                      {formatDate(invite.createdAt)}
                      {invite.expiresAt && ` · ${formatDate(invite.expiresAt)} 过期`}
                    </p>
                  </div>
                  {!invite.usedBy && <DeleteInviteButton id={invite.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
