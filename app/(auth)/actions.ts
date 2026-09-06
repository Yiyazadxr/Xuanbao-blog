"use server";

// 登录/注册相关 Server Actions
// CSRF 说明：Next.js Server Action 默认校验 Origin/Host（同源），跨站请求会被拒绝，
// 因此这里无需额外手写 CSRF token；本文件的重点是与 Auth.js 配合的登录/注册与防暴力破解限流。
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { verifyHCaptcha } from "@/lib/hcaptcha";
import { submitAccountRequest, submitInviteRequest } from "@/lib/invites";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { applySchema, loginSchema, parseInput, registerSchema } from "@/lib/validation";

export type ActionState = { ok: boolean; error?: string; message?: string };

// 邮箱密码登录（防暴力破解：按邮箱 + 按 IP 双重限流）
export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseInput(loginSchema, {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };
  const { email } = parsed.data;

  const ip = await getClientIp();
  const emailKey = `${email}:${ip}`;

  // 先扣额度再执行登录（原子计数 + 判定）：超出阈值时连 bcrypt 都不执行，
  // 且并发请求不会因「先判后计」竞态而集体绕过阈值
  const emailCheck = await rateLimit.checkAndHit("login", emailKey, 5, 15 * 60 * 1000);
  if (emailCheck.blocked) {
    return { ok: false, error: `尝试次数过多，请 ${emailCheck.retryAfterSec} 秒后再试` };
  }
  const ipCheck = await rateLimit.checkAndHit("login-ip", ip, 20, 15 * 60 * 1000);
  if (ipCheck.blocked) {
    return { ok: false, error: "尝试次数过多，请稍后再试" };
  }

  try {
    // redirect: false —— 成功后不抛 NEXT_REDIRECT，由客户端做整页跳转，
    // 使 SessionProvider 重新挂载、重新拉取会话
    await signIn("credentials", { email, password: parsed.data.password, redirect: false });
    await rateLimit.reset("login", emailKey);
    await rateLimit.reset("login-ip", ip);
    return { ok: true, message: "登录成功" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "邮箱或密码不正确" };
    }
    throw error;
  }
}

// 提交账号申请（按 IP 限流 + submitAccountRequest 内部按邮箱限流，避免全局配额被单点占满）
export async function applyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseInput(applySchema, {
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };

  // hCaptcha 人机验证（未配置密钥时降级放行）
  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }

  const ip = await getClientIp();
  const check = await rateLimit.checkAndHit("apply", ip, 5, 10 * 60 * 1000);
  if (check.blocked) {
    return { ok: false, error: `申请过于频繁，请 ${check.retryAfterSec} 秒后再试` };
  }

  const result = await submitAccountRequest(parsed.data.email, parsed.data.message);
  if (result.ok) await rateLimit.reset("apply", ip);
  return result.ok
    ? { ok: true, message: "申请已提交！博主审核后会向你提供邀请码" }
    : { ok: false, error: result.error };
}

// 凭邀请码申请账号（按 IP 限流，防脚本批量注册）：自设密码 + 建号待审核
export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseInput(registerSchema, {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };

  // hCaptcha 人机验证（未配置密钥时降级放行）
  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }

  const ip = await getClientIp();
  const check = await rateLimit.checkAndHit("register", ip, 10, 60 * 60 * 1000);
  if (check.blocked) {
    return { ok: false, error: `注册太频繁，请 ${check.retryAfterSec} 秒后再试` };
  }

  const result = await submitInviteRequest(parsed.data);
  if (result.ok) await rateLimit.reset("register", ip);
  return result.ok
    ? { ok: true, message: "申请已提交，博主审核通过后即可登录" }
    : { ok: false, error: result.error };
}
