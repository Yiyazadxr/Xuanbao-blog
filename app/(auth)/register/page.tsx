"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { applyAction, registerAction, type ActionState } from "@/app/(auth)/actions";
import {
  errorCls,
  inputCls,
  labelCls,
  primaryBtnCls,
  successCls,
} from "@/components/ui/form-styles";

const initialState: ActionState = { ok: false };

// 注册页（邀请码制）：两步 —— ①提交邮箱申请 ②凭邀请码注册
export default function RegisterPage() {
  const [tab, setTab] = useState<"apply" | "register">("apply");
  const [applyState, applyFormAction, applyPending] = useActionState(applyAction, initialState);
  const [regState, regFormAction, regPending] = useActionState(registerAction, initialState);

  const tabCls = (active: boolean) =>
    `flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-medium transition-colors duration-200 ${
      active ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
    }`;

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">加入这里</h1>
      <p className="mt-2 text-sm text-muted">
        本站注册采用邀请制：先提交申请，博主审核后会向你提供邀请码。已有账号？{" "}
        <Link href="/login" className="text-accent hover:underline">
          直接登录
        </Link>
      </p>

      {/* 两步切换 */}
      <div role="tablist" className="mt-8 flex gap-1 rounded-2xl border border-border p-1">
        <button
          role="tab"
          aria-selected={tab === "apply"}
          onClick={() => setTab("apply")}
          className={tabCls(tab === "apply")}
        >
          ① 申请账号
        </button>
        <button
          role="tab"
          aria-selected={tab === "register"}
          onClick={() => setTab("register")}
          className={tabCls(tab === "register")}
        >
          ② 我有邀请码
        </button>
      </div>

      {tab === "apply" ? (
        <form action={applyFormAction} className="mt-6 space-y-5">
          {applyState.error && (
            <p role="alert" className={errorCls}>
              {applyState.error}
            </p>
          )}
          {applyState.ok && applyState.message && (
            <p role="status" className={successCls}>
              {applyState.message}
            </p>
          )}
          <div>
            <label htmlFor="apply-email" className={labelCls}>
              邮箱
            </label>
            <input
              id="apply-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="apply-message" className={labelCls}>
              申请说明（选填）
            </label>
            <textarea
              id="apply-message"
              name="message"
              rows={3}
              maxLength={500}
              placeholder="介绍一下自己，或说明想注册的原因"
              className={`${inputCls} h-auto py-3`}
            />
          </div>
          <button type="submit" disabled={applyPending} className={primaryBtnCls}>
            {applyPending ? "提交中…" : "提交申请"}
          </button>
        </form>
      ) : (
        <form action={regFormAction} className="mt-6 space-y-5">
          {regState.error && (
            <p role="alert" className={errorCls}>
              {regState.error}
            </p>
          )}
          {regState.ok && regState.message && (
            <p role="status" className={successCls}>
              {regState.message}{" "}
              <Link href="/login" className="font-medium underline">
                去登录
              </Link>
            </p>
          )}
          <div>
            <label htmlFor="reg-code" className={labelCls}>
              邀请码
            </label>
            <input
              id="reg-code"
              name="code"
              type="text"
              required
              placeholder="XR-XXXXXXXX"
              className={`${inputCls} font-mono uppercase`}
            />
          </div>
          <div>
            <label htmlFor="reg-name" className={labelCls}>
              昵称
            </label>
            <input
              id="reg-name"
              name="name"
              type="text"
              autoComplete="nickname"
              required
              maxLength={30}
              placeholder="怎么称呼你"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="reg-email" className={labelCls}>
              邮箱
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="申请时使用的邮箱"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="reg-password" className={labelCls}>
              密码
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="至少 8 位"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-muted">建议使用字母 + 数字组合，至少 8 位</p>
          </div>
          <button type="submit" disabled={regPending} className={primaryBtnCls}>
            {regPending ? "注册中…" : "注册"}
          </button>
        </form>
      )}

      <p className="mt-6 text-xs leading-relaxed text-muted">
        提交即表示您已阅读并同意本站的
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
