"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type ActionState } from "@/app/(auth)/actions";
import { errorCls, inputCls, labelCls, primaryBtnCls } from "@/components/ui/form-styles";

const initialState: ActionState = { ok: false };

// 登录页：邮箱 + 密码
export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">登录</h1>
      <p className="mt-2 text-sm text-muted">
        还没有账号？{" "}
        <Link href="/register" className="text-accent hover:underline">
          申请一个
        </Link>
      </p>

      <form action={formAction} className="mt-8 space-y-5">
        {state.error && (
          <p role="alert" className={errorCls}>
            {state.error}
          </p>
        )}
        <div>
          <label htmlFor="email" className={labelCls}>
            邮箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelCls}>
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className={inputCls}
          />
        </div>
        <button type="submit" disabled={pending} className={primaryBtnCls}>
          {pending ? "登录中…" : "登录"}
        </button>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        登录即表示您已阅读并同意本站的
        <Link href="/terms" className="text-accent hover:underline">
          《用户协议》
        </Link>
        与
        <Link href="/privacy" className="text-accent hover:underline">
          《隐私政策》
        </Link>
        。
      </p>
    </>
  );
}
