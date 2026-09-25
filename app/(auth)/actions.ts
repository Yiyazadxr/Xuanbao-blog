"use server";

// Server Action 由 Next.js 校验 Origin/Host，无需额外 CSRF token。
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { verifyHCaptcha } from "@/lib/hcaptcha";
import { submitAccountRequest, submitInviteRequest } from "@/lib/invites";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { applySchema, loginSchema, parseInput, registerSchema } from "@/lib/validation";

export type ActionState = { ok: boolean; error?: string; message?: string };

// 登录按邮箱和 IP 双重限流。
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

  // 原子计数后再登录，超限时跳过 bcrypt。
  const emailCheck = await rateLimit.checkAndHit("login", emailKey, 5, 15 * 60 * 1000);
  if (emailCheck.blocked) {
    return { ok: false, error: `尝试次数过多，请 ${emailCheck.retryAfterSec} 秒后再试` };
  }
  const ipCheck = await rateLimit.checkAndHit("login-ip", ip, 20, 15 * 60 * 1000);
  if (ipCheck.blocked) {
    return { ok: false, error: "尝试次数过多，请稍后再试" };
  }

  try {
    // 客户端整页跳转以重新挂载 SessionProvider。
    await signIn("credentials", { email, password: parsed.data.password, redirect: false });
    await rateLimit.reset("login", emailKey);
    return { ok: true, message: "登录成功" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "邮箱或密码不正确" };
    }
    throw error;
  }
}

// 账号申请按 IP 和邮箱分别限流。
export async function applyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseInput(applySchema, {
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if (!parsed.data) return { ok: false, error: parsed.error ?? "参数不合法" };

  // 未配置 hCaptcha 密钥时放行。
  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }

  const ip = await getClientIp();
  const check = await rateLimit.checkAndHit("apply", ip, 5, 10 * 60 * 1000);
  if (check.blocked) {
    return { ok: false, error: `申请过于频繁，请 ${check.retryAfterSec} 秒后再试` };
  }

  const result = await submitAccountRequest(parsed.data.email, parsed.data.message);
  return result.ok
    ? { ok: true, message: "申请已提交，博主审核通过后会将登录凭据发至你的邮箱" }
    : { ok: false, error: result.error };
}

// 邀请码申请按 IP 限流，并预建待审核账号。
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

  // 未配置 hCaptcha 密钥时放行。
  if (!(await verifyHCaptcha(String(formData.get("captcha") ?? "")))) {
    return { ok: false, error: "人机验证未通过，请重新验证" };
  }

  const ip = await getClientIp();
  const check = await rateLimit.checkAndHit("register", ip, 10, 60 * 60 * 1000);
  if (check.blocked) {
    return { ok: false, error: `注册太频繁，请 ${check.retryAfterSec} 秒后再试` };
  }

  const result = await submitInviteRequest(parsed.data);
  return result.ok
    ? { ok: true, message: "申请已提交，博主审核通过后即可登录" }
    : { ok: false, error: result.error };
}
