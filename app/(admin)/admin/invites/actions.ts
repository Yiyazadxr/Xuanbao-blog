"use server";

// 邀请码与申请审核 Server Actions：通过/拒绝申请、生成/删除邀请码（按权限校验）
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requirePermission } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { createInviteCode } from "@/lib/invites";
import { buildApprovalEmail, sendMail } from "@/lib/mail";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { generateRandomPassword } from "@/lib/random";
import { freeInviteSchema, parseId, parseInput } from "@/lib/validation";
import type { AdminActionState } from "../action-types";

// 通过账号申请：直接建号（普通申请发随机密码邮件）/ 激活（邀请码申请发自设密码邮件）
export async function approveRequest(requestId: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.REVIEW_REQUESTS);
  if (!admin) return { ok: false, error: "无权限" };
  const rid = parseId(requestId);
  if (!rid.data) return { ok: false, error: rid.error ?? "参数不合法" };
  const ridId = rid.data; // 守卫后非空：事务回调内 TS 不做属性收窄，先固化为局部常量
  const request = await prisma.accountRequest.findUnique({ where: { id: ridId } });
  if (!request) return { ok: false, error: "申请不存在" };
  if (request.status !== "PENDING") return { ok: false, error: "该申请已处理" };

  const email = request.email;
  // 邀请码路径（自设密码，提交时已建号待激活）
  const isInvitePath = Boolean(request.password);
  const existing = await prisma.user.findUnique({ where: { email } });

  // 确定密码与回收期：邀请码路径用自设密码（解密暂存的密文）、14 天；普通申请随机密码、7 天
  const graceDays = isInvitePath ? 14 : 7;
  let password: string;
  if (isInvitePath) {
    try {
      password = decryptSecret(request.password as string);
    } catch {
      return { ok: false, error: "申请数据损坏，密码无法解密，请删除后重新审核" };
    }
  } else {
    password = generateRandomPassword();
  }
  const hashed = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    if (existing) {
      // 已存在（被回收/待审核）则复用：重置密码 + 重新激活
      // 普通申请路径需清空旧的邀请码关联，确保回收期按 7 天判定
      await tx.user.update({
        where: { id: existing.id },
        data: {
          password: hashed,
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
          role: "MEMBER",
          activatedAt: new Date(),
        },
      });
    }
    // 申请标记通过，清空暂存的明文密码
    await tx.accountRequest.update({
      where: { id: ridId },
      data: { status: "APPROVED", password: null },
    });
  });

  // 邮件：发账号 + 密码（未配置 SMTP 时降级为控制台打印）
  const { subject, text } = buildApprovalEmail({ email, password, graceDays });
  let mailSent = false;
  try {
    mailSent = await sendMail(email, subject, text);
  } catch (e) {
    console.error("审核通过邮件发送失败：", e);
  }

  revalidatePath("/admin/invites");
  return {
    ok: true,
    message: mailSent
      ? `已通过，账号密码邮件已发送至 ${email}，请在 ${graceDays} 天内登录`
      : `已通过，请在 ${graceDays} 天内登录。邮件未发送成功，请手动告知账号密码`,
  };
}

// 拒绝申请
export async function rejectRequest(requestId: string): Promise<AdminActionState> {
  const admin = await requirePermission(PERMISSIONS.REVIEW_REQUESTS);
  if (!admin) return { ok: false, error: "无权限" };
  const rid = parseId(requestId);
  if (!rid.data) return { ok: false, error: rid.error ?? "参数不合法" };
  const ridId = rid.data;
  const request = await prisma.accountRequest.findUnique({ where: { id: ridId } });
  if (!request) return { ok: false, error: "申请不存在" };

  await prisma.$transaction(async (tx) => {
    await tx.accountRequest.update({
      where: { id: ridId },
      data: { status: "REJECTED", password: null },
    });
    // 邀请码路径提交时已建待审核账号，拒绝时删除该未激活账号，避免占用邮箱
    await tx.user.deleteMany({
      where: { email: request.email, activatedAt: null },
    });
  });

  revalidatePath("/admin/invites");
  return { ok: true, message: "已拒绝" };
}

// 生成通用邀请码（不绑定邮箱，支持有效期与使用次数）
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

// 删除未使用的邀请码
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
