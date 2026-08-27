// 邮件发送封装：仅用于注册流程（审核通过通知），未配置 SMTP 时降级为控制台打印
import nodemailer from "nodemailer";
import { SITE } from "@/lib/constants";

export async function sendMail(to: string, subject: string, text: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    console.log(`\n[邮件降级-控制台] 收件人：${to}\n主题：${subject}\n${text}\n`);
    return;
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
      "感谢你的申请！你的账号已审核通过，请凭以下信息登录：",
      "",
      `账号（邮箱）：${email}`,
      `登录密码：${password}`,
      "",
      `请在 ${graceDays} 天内登录并尽快修改密码。若 ${graceDays} 天内未登录，账号将被收回，需要重新申请。`,
      "",
      "登录入口：" + SITE.url + "/login",
      "",
      `您收到此邮件是因为您（或他人）在 ${SITE.name} 提交了账号注册申请。如非本人操作，请忽略此邮件。`,
    ].join("\n"),
  };
}
