"use server";

// 邀请码和申请审核按权限校验。
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requirePermission } from "@/lib/auth";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { createInviteCode } from "@/lib/invites";
import { buildApprovalEmail, isMailConfigured, sendMail } from "@/lib/mail";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { generateRandomPassword } from "@/lib/random";
import { ROLES } from "@/lib/roles";
import { freeInviteSchema, parseId, parseInput } from "@/lib/validation";
import type { AdminActionState } from "../action-types";

const PROCESSING_LEASE_MS = 15 * 60 * 1000;

// 普通申请生成随机密码；邀请码申请使用自设密码。
export async function approveRequest(requestId: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.REVIEW_REQUESTS);
  if (!admin) return { ok: false, error: "无权限" };
  const rid = parseId(requestId);
  if (!rid.data) return { ok: false, error: rid.error ?? "参数不合法" };
  const ridId = rid.data; // 事务回调不保留外层属性收窄。
  const request = await prisma.accountRequest.findUnique({ where: { id: ridId } });
  if (!request) return { ok: false, error: "申请不存在" };
  const leaseCutoff = new Date(Date.now() - PROCESSING_LEASE_MS);
  if (request.status === "PROCESSING" && request.updatedAt >= leaseCutoff) {
    return { ok: false, error: "该申请正在发送邮件，请稍后再试" };
  }
  if (request.status !== "PENDING" && request.status !== "PROCESSING") {
    return { ok: false, error: "该申请已处理" };
  }
  if (!isMailConfigured()) {
    return { ok: false, error: "SMTP 未配置，无法安全发送账号凭据" };
  }

  const email = request.email;
  // 邀请码申请已预建账号；普通申请在首次审批时建号。
  const isInvitePath = request.kind === "INVITE";
  // 邀请申请使用自设密码和 14 天期限；普通申请使用随机密码和 7 天期限。
  const graceDays = isInvitePath ? 14 : 7;
  let password: string;
  if (request.password) {
    try {
      password = decryptSecret(request.password);
    } catch {
      return { ok: false, error: "申请数据损坏，密码无法解密，请删除后重新审核" };
    }
  } else if (isInvitePath) {
    return { ok: false, error: "申请数据损坏，密码不存在，请删除后重新提交" };
  } else {
    password = generateRandomPassword();
  }
  const hashed = await bcrypt.hash(password, 10);

  const currentUser = await prisma.user.findUnique({ where: { email } });
  if (currentUser?.role === ROLES.SUPER_ADMIN) {
    return { ok: false, error: "不能通过申请重置超级管理员账号" };
  }
  if (currentUser && !currentUser.disabled && currentUser.activatedAt) {
    return { ok: false, error: "该邮箱已有可用账号，请直接登录" };
  }
  if (isInvitePath && !currentUser) {
    return { ok: false, error: "待审核账号状态异常，请删除申请后重新提交" };
  }

  // 原子抢占审批并持久化凭据，中断重试仍使用同一密码。
  const claimStartedAt = new Date();
  const claimed = await prisma.accountRequest.updateMany({
    where: {
      id: ridId,
      OR: [
        { status: "PENDING" },
        { status: "PROCESSING", updatedAt: { lt: leaseCutoff } },
      ],
    },
    data: {
      status: "PROCESSING",
      password: encryptSecret(password),
      updatedAt: claimStartedAt,
    },
  });
  if (claimed.count !== 1) return { ok: false, error: "该申请正在处理或已完成" };

  const { subject, text } = buildApprovalEmail({ email, password, graceDays });
  try {
    const sent = await sendMail(email, subject, text);
    if (!sent) throw new Error("MAIL_NOT_SENT");
  } catch (error) {
    console.error("审核通过邮件发送失败：", error);
    await prisma.accountRequest.updateMany({
      where: { id: ridId, status: "PROCESSING", updatedAt: claimStartedAt },
      data: { status: "PENDING" },
    });
    return { ok: false, error: "邮件发送失败，申请仍为待审核状态，请修复邮件服务后重试" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing && !existing.disabled && existing.activatedAt) {
        throw new Error("EMAIL_ALREADY_EXISTS");
      }
      if (isInvitePath && !existing) throw new Error("INVALID_PENDING_USER");

      if (existing) {
        await tx.user.update({
          where: { id: existing.id },
          data: {
            ...(isInvitePath && request.message ? { name: request.message } : {}),
            password: hashed,
            sessionVersion: { increment: 1 },
            role: ROLES.MEMBER,
            activatedAt: new Date(),
            disabled: false,
            lastLoginAt: null,
            inviteCodeId: isInvitePath ? existing.inviteCodeId : null,
          },
        });
      } else {
        await tx.user.create({
          data: {
            email,
            name: email.split("@")[0] ?? email,
            password: hashed,
            role: ROLES.MEMBER,
            activatedAt: new Date(),
          },
        });
      }

      const finalized = await tx.accountRequest.updateMany({
        where: { id: ridId, status: "PROCESSING", updatedAt: claimStartedAt },
        data: { status: "APPROVED", password: null },
      });
      if (finalized.count !== 1) throw new Error("REQUEST_TAKEN");
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "REQUEST_TAKEN") {
        return { ok: false, error: "凭据已发送，但申请状态发生变化，请检查账号后再处理" };
      }
      if (error.message === "INVALID_PENDING_USER") {
        return { ok: false, error: "凭据已发送，但待审核账号不存在，请联系申请者忽略邮件" };
      }
      if (error.message === "EMAIL_ALREADY_EXISTS") {
        return { ok: false, error: "凭据已发送，但该邮箱已有可用账号，请联系申请者忽略邮件" };
      }
    }
    console.error("审核账号申请失败：", error);
    throw error;
  }

  revalidatePath("/admin/invites");
  return {
    ok: true,
    message: `已通过，账号密码邮件已发送至 ${email}，请在 ${graceDays} 天内登录`,
  };
}

export async function rejectRequest(requestId: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.REVIEW_REQUESTS);
  if (!admin) return { ok: false, error: "无权限" };
  const rid = parseId(requestId);
  if (!rid.data) return { ok: false, error: rid.error ?? "参数不合法" };
  const ridId = rid.data;
  const request = await prisma.accountRequest.findUnique({ where: { id: ridId } });
  if (!request) return { ok: false, error: "申请不存在" };
  const leaseCutoff = new Date(Date.now() - PROCESSING_LEASE_MS);
  if (request.status === "PROCESSING" && request.updatedAt >= leaseCutoff) {
    return { ok: false, error: "该申请正在发送邮件，暂时无法拒绝" };
  }
  if (request.status !== "PENDING" && request.status !== "PROCESSING") {
    return { ok: false, error: "该申请已处理" };
  }

  const rejected = await prisma.$transaction(async (tx) => {
    const claimed = await tx.accountRequest.updateMany({
      where: {
        id: ridId,
        OR: [
          { status: "PENDING" },
          { status: "PROCESSING", updatedAt: { lt: leaseCutoff } },
        ],
      },
      data: { status: "REJECTED", password: null },
    });
    if (claimed.count !== 1) return false;
    const pendingUser = await tx.user.findFirst({
      where: { email: request.email, role: ROLES.MEMBER, activatedAt: null },
      select: { id: true, inviteCodeId: true },
    });
    if (pendingUser?.inviteCodeId) {
      await tx.inviteCode.updateMany({
        where: { id: pendingUser.inviteCodeId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
    // 拒绝邀请码申请时删除预建账号，释放邮箱。
    await tx.user.deleteMany({
      where: { email: request.email, role: ROLES.MEMBER, activatedAt: null },
    });
    return true;
  });
  if (!rejected) return { ok: false, error: "该申请已处理" };

  revalidatePath("/admin/invites");
  return { ok: true, message: "已拒绝" };
}

export async function createFreeInvite(payload: unknown): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_INVITES);
  if (!admin) return { ok: false, error: "无权限" };
  const parsed = parseInput(freeInviteSchema, payload);
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { expiresInDays: days, maxUses: uses } = parsed.data;
  const invite = await createInviteCode(days, uses);
  revalidatePath("/admin/invites");
  return {
    ok: true,
    message: `邀请码 ${invite.code} 已生成：${days} 天有效，可用 ${uses} 次`,
  };
}

export async function deleteInvite(id: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.MANAGE_INVITES);
  if (!admin) return { ok: false, error: "无权限" };
  const iid = parseId(id);
  if (!iid.data) return { ok: false, error: iid.error ?? "参数不合法" };
  const invite = await prisma.inviteCode.findUnique({ where: { id: iid.data } });
  if (!invite) return { ok: false, error: "邀请码不存在" };
  if (invite.usedCount > 0) return { ok: false, error: "已被使用的邀请码不能删除" };
  await prisma.inviteCode.delete({ where: { id: iid.data } });
  revalidatePath("/admin/invites");
  return { ok: true, message: "已删除" };
}
