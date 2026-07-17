"use server";

// 登录/注册相关 Server Actions
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { registerWithInvite, submitAccountRequest } from "@/lib/invites";

export type ActionState = { ok: boolean; error?: string; message?: string };

// 邮箱密码登录
export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return { ok: true };
  } catch (error) {
    // signIn 成功时会抛 NEXT_REDIRECT，必须原样抛出让框架处理跳转
    if (error instanceof AuthError) {
      return { ok: false, error: "邮箱或密码不正确" };
    }
    throw error;
  }
}

// 退出登录改由客户端 next-auth/react 的 signOut 处理（见 Header）

// 提交账号申请
export async function applyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "请输入有效的邮箱地址" };
  }
  const result = await submitAccountRequest(email, message);
  return result.ok
    ? { ok: true, message: "申请已提交！博主审核后会向你提供邀请码" }
    : { ok: false, error: result.error };
}

// 凭邀请码注册
export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!code) return { ok: false, error: "请输入邀请码" };
  if (!name) return { ok: false, error: "请输入昵称" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "请输入有效的邮箱地址" };
  }
  if (password.length < 8) return { ok: false, error: "密码至少 8 位" };
  if (password.length > 72) return { ok: false, error: "密码最长 72 位" }; // bcrypt 上限

  const result = await registerWithInvite({ code, email, password, name });
  return result.ok
    ? { ok: true, message: "注册成功！现在可以登录了" }
    : { ok: false, error: result.error };
}
