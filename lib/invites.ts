// 邀请码与账号申请：数据层函数（供 Server Actions 调用）
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

// 访客提交账号申请 → 入库 + 站内通知管理员
export async function submitAccountRequest(email: string, message?: string) {
  const normalized = email.trim().toLowerCase();

  // 全局节流：10 分钟内申请总数超过 5 条则拒绝（防刷申请）
  const recentCount = await prisma.accountRequest.count({
    where: { createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (recentCount >= 5) {
    return { ok: false, error: "申请过于频繁，请稍后再试" };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalized } });
  if (existingUser) {
    return { ok: false, error: "该邮箱已注册，请直接登录" };
  }

  const pending = await prisma.accountRequest.findFirst({
    where: { email: normalized, status: "PENDING" },
  });
  if (pending) {
    return { ok: false, error: "该邮箱已有待处理的申请，请耐心等待博主审核" };
  }

  await prisma.accountRequest.create({
    data: { email: normalized, message: message?.trim() || null },
  });

  // 站内通知管理员有新的账号申请
  await notifyAdmins({
    type: "account_request",
    title: `新账号申请：${normalized}`,
    link: "/admin/invites",
  });

  return { ok: true };
}

// 凭邀请码注册：校验邀请码 → 创建用户 → 标记已用（事务）
export async function registerWithInvite({
  code,
  email,
  password,
  name,
}: {
  code: string;
  email: string;
  password: string;
  name: string;
}) {
  const normalized = email.trim().toLowerCase();

  const invite = await prisma.inviteCode.findUnique({ where: { code: code.trim() } });
  if (!invite) return { ok: false, error: "邀请码不存在" };
  if (invite.usedById) return { ok: false, error: "邀请码已被使用" };
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { ok: false, error: "邀请码已过期" };
  }
  if (invite.email && invite.email !== normalized) {
    return { ok: false, error: "该邀请码绑定了其他邮箱" };
  }

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) return { ok: false, error: "该邮箱已注册，请直接登录" };

  const hashed = await bcrypt.hash(password, 10);
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: name.trim(), email: normalized, password: hashed, role: "MEMBER" },
      });
      // 原子抢占邀请码：条件更新（usedById 仍为空才生效），防止并发时同一邀请码被两个账号使用
      const claimed = await tx.inviteCode.updateMany({
        where: { id: invite.id, usedById: null },
        data: { usedById: user.id },
      });
      if (claimed.count === 0) throw new Error("INVITE_TAKEN");
      // 同步把对应申请标记为已通过
      await tx.accountRequest.updateMany({
        where: { email: normalized, status: "PENDING" },
        data: { status: "APPROVED" },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INVITE_TAKEN") {
      return { ok: false, error: "邀请码刚刚被别人使用了" };
    }
    throw e;
  }

  return { ok: true };
}

// 生成邀请码（后台用）：XR- 前缀 + 8 位随机十六进制
export async function createInviteCode(email?: string, expiresInDays = 7) {
  const code = `XR-${randomBytes(4).toString("hex").toUpperCase()}`;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  return prisma.inviteCode.create({
    data: { code, email: email?.trim().toLowerCase() || null, expiresAt },
  });
}
