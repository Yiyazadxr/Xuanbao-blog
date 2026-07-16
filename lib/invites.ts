// 邀请码与账号申请：数据层函数（供 Server Actions 调用）
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendMailToAdmin } from "@/lib/mail";

// 访客提交账号申请 → 入库 + 通知博主邮箱
export async function submitAccountRequest(email: string, message?: string) {
  const normalized = email.trim().toLowerCase();

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

  // 邮件失败不影响申请成功（申请已入库，后台可见）
  try {
    await sendMailToAdmin(
      "【博客】新的账号申请",
      `申请邮箱：${normalized}\n申请说明：${message?.trim() || "（无）"}\n\n请登录后台 /admin/invites 审核并分配邀请码。`
    );
  } catch (e) {
    console.error("申请通知邮件发送失败：", e);
  }

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
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: name.trim(), email: normalized, password: hashed, role: "READER" },
    });
    await tx.inviteCode.update({
      where: { id: invite.id },
      data: { usedById: user.id },
    });
    // 同步把对应申请标记为已通过
    await tx.accountRequest.updateMany({
      where: { email: normalized, status: "PENDING" },
      data: { status: "APPROVED" },
    });
  });

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
