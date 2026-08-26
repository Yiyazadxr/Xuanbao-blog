// 邮件发送封装：仅用于注册流程（向申请者发送邀请码），未配置 SMTP 时降级为控制台打印
import nodemailer from "nodemailer";

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
    from: `"博客通知" <${SMTP_USER}>`,
    to,
    subject,
    text,
  });
}
