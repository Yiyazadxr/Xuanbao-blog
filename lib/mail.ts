// 邮件发送封装：仅用于注册流程（审核通过通知）。
// 返回是否真正通过 SMTP 发送成功（未配置/失败返回 false），供调用方决定是否额外提示管理员
import nodemailer from "nodemailer";
import { SITE } from "@/lib/constants";

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!isMailConfigured() || !SMTP_USER || !SMTP_PASS) {
    // 邮件正文包含初始密码，任何环境都不能写入日志。
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[邮件未发送] SMTP 未配置，收件人：${to}，主题：${subject}`);
    }
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST || "smtp.qq.com",
    port: Number(SMTP_PORT) || 465,
    secure: true, // QQ 邮箱 465 端口走 SSL
    auth: { user: SMTP_USER, pass: SMTP_PASS }, // pass 是 QQ 邮箱授权码
  });

  await transporter.sendMail({
    from: `"${SITE.name}" <${SMTP_USER}>`,
    to,
    subject,
    text,
  });
  return true;
}

// 审核通过邮件（含账号 + 密码）：普通申请发随机密码，邀请码申请发自设密码
export function buildApprovalEmail({
  email,
  password,
  graceDays,
}: {
  email: string;
  password: string;
  graceDays: number;
}): { subject: string; text: string } {
  return {
    subject: `【${SITE.name}】你的账号申请已通过`,
    text: [
      "感谢你的申请！账号已审核通过，请凭以下信息登录：",
      "",
      `登录邮箱：${email}`,
      `登录密码：${password}`,
      "",
      `请在 ${graceDays} 天内登录并尽快修改密码。逾期未登录，账号将被收回。`,
      "",
      "登录入口：" + SITE.url + "/login",
      "",
      `此邮件由 ${SITE.name} 的账号注册申请触发。如非本人操作，请忽略。`,
    ].join("\n"),
  };
}
