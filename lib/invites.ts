// 邀请码与账号申请：数据层函数（供 Server Actions 调用）
import bcrypt from "bcryptjs";
import { encryptSecret } from "@/lib/crypto";
import { notifyAdmins } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/random";

// 访客提交账号申请（路径 A：普通申请，无邀请码）→ 入库 + 站内通知管理员
export async function submitAccountRequest(email: string, message?: string) {
  const normalized = email.trim().toLowerCase();

  // 防刷交给调用方按 IP 维度限流
  // 这里只按「同一邮箱」做上限
  const recentForEmail = await prisma.accountRequest.count({
    where: {
      email: normalized,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recentForEmail >= 3) {
    return { ok: false, error: "该邮箱今日申请次数过多，请稍后再试" };
  }

  // 已注册且已激活（可正常登录）的邮箱不可重复申请；被禁用/待审核后允许重新申请
  const existingUser = await prisma.user.findUnique({ where: { email: normalized } });
  if (existingUser && !existingUser.disabled && existingUser.activatedAt) {
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
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    type: "account_request",
    title: `新账号申请：${normalized}`,
    link: "/admin/invites",
  });

  return { ok: true };
}

// 凭邀请码提交申请（路径 B：自设密码，建号待审核）→ 消耗邀请码 1 次 + 建待激活账号 + 申请记录
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

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing && !existing.disabled && existing.activatedAt) {
    return { ok: false, error: "该邮箱已注册，请直接登录" };
  }

  const pending = await prisma.accountRequest.findFirst({
    where: { email: normalized, status: "PENDING" },
  });
  if (pending) {
    return { ok: false, error: "该邮箱已有待处理的申请，请耐心等待博主审核" };
  }

  const invite = await prisma.inviteCode.findUnique({ where: { code: code.trim() } });
  if (!invite) return { ok: false, error: "邀请码不存在" };
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { ok: false, error: "邀请码已过期" };
  }
  if (invite.usedCount >= invite.maxUses) {
    return { ok: false, error: "邀请码使用次数已达上限" };
  }

  const hashed = await bcrypt.hash(password, 10);
  try {
    await prisma.$transaction(async (tx) => {
      // 已存在被回收/待审核的同邮箱账号则更新复用，否则新建（避免重复账号）
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { name: name.trim(), password: hashed, disabled: false, activatedAt: null, lastLoginAt: null },
          })
        : await tx.user.create({
            data: {
              name: name.trim(),
              email: normalized,
              password: hashed,
              role: "MEMBER",
              // 待审核：审核通过后才激活
              activatedAt: null,
            },
          });

      // 原子消耗邀请码次数（条件更新防并发超额）
      const claimed = await tx.inviteCode.updateMany({
        where: { id: invite.id, usedCount: { lt: invite.maxUses } },
        data: { usedCount: { increment: 1 } },
      });
      if (claimed.count === 0) throw new Error("INVITE_TAKEN");

      // 关联该用户到邀请码，便于区分「邀请码路径」与回收期判定
      await tx.user.update({
        where: { id: user.id },
        data: { inviteCodeId: invite.id },
      });

      await tx.accountRequest.create({
        // 明文密码加密暂存（AES-256-GCM，AUTH_SECRET 派生密钥），审核通过时解密后发邮件
        data: { email: normalized, status: "PENDING", password: encryptSecret(password) },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INVITE_TAKEN") {
      return { ok: false, error: "邀请码刚刚被使用了" };
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

// 生成邀请码（后台用）：XR-XX-12位，默认 7 天有效、可用 1 次
export async function createInviteCode(expiresInDays = 7, maxUses = 1) {
  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  return prisma.inviteCode.create({
    data: { code, maxUses: Math.max(1, maxUses), expiresAt },
  });
}
