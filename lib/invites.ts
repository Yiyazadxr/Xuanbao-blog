import bcrypt from "bcryptjs";
import { encryptSecret } from "@/lib/crypto";
import { notifyAdmins } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/random";
import { ROLES } from "@/lib/roles";

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function submitAccountRequest(email: string, message?: string) {
  const normalized = email.trim().toLowerCase();

  // IP 限流由调用方处理；此处只限制单个邮箱。
  const recentForEmail = await prisma.accountRequest.count({
    where: {
      email: normalized,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recentForEmail >= 3) {
    return { ok: true };
  }

  // 停用账号可重新申请；通过后降为 MEMBER，凭据仅发往原邮箱。
  const existingUser = await prisma.user.findUnique({ where: { email: normalized } });
  if (existingUser && !existingUser.disabled) {
    return { ok: true };
  }

  const pending = await prisma.accountRequest.findFirst({
    where: { email: normalized, status: { in: ["PENDING", "PROCESSING"] } },
  });
  if (pending) {
    return { ok: true };
  }

  try {
    await prisma.accountRequest.create({
      data: { email: normalized, message: message?.trim() || null, kind: "STANDARD" },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: true };
    }
    throw error;
  }

  await notifyAdmins({
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    type: "account_request",
    title: `新账号申请：${normalized}`,
    link: "/admin/invites",
  });

  return { ok: true };
}

export async function submitInviteRequest({
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

  // 邀请码验证必须先于邮箱分支，避免用无效邀请码探测账号。
  const invite = await prisma.inviteCode.findUnique({ where: { code: code.trim() } });
  if (!invite || (invite.expiresAt && invite.expiresAt < new Date()) || invite.usedCount >= invite.maxUses) {
    return { ok: false, error: "邀请码无效或已失效" };
  }
  const hashed = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing && !existing.disabled) {
    return { ok: true };
  }

  const pending = await prisma.accountRequest.findFirst({
    where: { email: normalized, status: { in: ["PENDING", "PROCESSING"] } },
  });
  if (pending) {
    return { ok: true };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 停用账号在审核通过前保持不可用。
      const user = existing
        ? existing
        : await tx.user.create({
            data: {
              name: name.trim(),
              email: normalized,
              password: hashed,
              role: ROLES.MEMBER,
              activatedAt: null,
            },
          });

      // 条件更新原子消耗次数，防止并发超额。
      const claimed = await tx.inviteCode.updateMany({
        where: { id: invite.id, usedCount: { lt: invite.maxUses } },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count === 0) throw new Error("INVITE_TAKEN");

      // 邀请码关联用于区分 14 天回收期。
      await tx.user.update({
        where: { id: user.id },
        data: { inviteCodeId: invite.id },
      });

      await tx.accountRequest.create({
        // 密码以 AES-256-GCM 加密暂存，通过后解密发送。
        // 邀请码路径没有申请留言，复用 message 保存待审核昵称，激活时再写入账号。
        data: {
          email: normalized,
          message: name.trim(),
          kind: "INVITE",
          status: "PENDING",
          password: encryptSecret(password),
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INVITE_TAKEN") {
      return { ok: false, error: "邀请码无效或已失效" };
    }
    if (isUniqueConstraintError(e)) {
      return { ok: true };
    }
    throw e;
  }

  await notifyAdmins({
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    type: "account_request",
    title: `凭邀请码新账号申请：${normalized}`,
    link: "/admin/invites",
  });

  return { ok: true };
}

export async function createInviteCode(expiresInDays = 7, maxUses = 1) {
  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  return prisma.inviteCode.create({
    data: { code, maxUses: Math.max(1, maxUses), expiresAt },
  });
}
