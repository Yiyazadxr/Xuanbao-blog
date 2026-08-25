"use client";

import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { changePassword, updateProfile } from "@/app/settings/actions";
import { errorCls, inputCls, labelCls, successCls } from "@/components/ui/form-styles";

const submitBtnCls =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-accent-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

type Msg = { ok?: boolean; text?: string };

// 个人资料表单：改昵称（同步刷新会话）+ 改密码
export function ProfileForm({ name, email }: { name: string; email: string }) {
  const { update } = useSession();
  const [namePending, startName] = useTransition();
  const [pwPending, startPw] = useTransition();
  const [nameMsg, setNameMsg] = useState<Msg>({});
  const [pwMsg, setPwMsg] = useState<Msg>({});

  async function onSaveName(formData: FormData) {
    const newName = String(formData.get("name") ?? "").trim();
    const res = await updateProfile(formData);
    setNameMsg(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
    if (res.ok) await update({ name: newName });
  }

  async function onChangePassword(formData: FormData) {
    const res = await changePassword(formData);
    setPwMsg(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
  }

  return (
    <div className="mt-8 space-y-8">
      {/* 基本信息 */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-bold">基本信息</h2>
        <p className="mt-1 text-sm text-muted">
          邮箱：{email}（登录账号，不可修改）
        </p>
        <form
          action={(fd) => startName(() => onSaveName(fd))}
          className="mt-5 max-w-sm space-y-4"
        >
          {nameMsg.text && (
            <p role="alert" className={nameMsg.ok ? successCls : errorCls}>
              {nameMsg.text}
            </p>
          )}
          <div>
            <label htmlFor="name" className={labelCls}>
              昵称
            </label>
            <input
              id="name"
              name="name"
              defaultValue={name}
              required
              maxLength={50}
              className={inputCls}
            />
          </div>
          <button type="submit" disabled={namePending} className={submitBtnCls}>
            {namePending ? "保存中…" : "保存昵称"}
          </button>
        </form>
      </section>

      {/* 修改密码 */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-bold">修改密码</h2>
        <form
          action={(fd) => startPw(() => onChangePassword(fd))}
          className="mt-5 max-w-sm space-y-4"
        >
          {pwMsg.text && (
            <p role="alert" className={pwMsg.ok ? successCls : errorCls}>
              {pwMsg.text}
            </p>
          )}
          <div>
            <label htmlFor="currentPassword" className={labelCls}>
              当前密码
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="newPassword" className={labelCls}>
              新密码
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              placeholder="至少 8 位"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelCls}>
              确认新密码
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className={inputCls}
            />
          </div>
          <button type="submit" disabled={pwPending} className={submitBtnCls}>
            {pwPending ? "修改中…" : "修改密码"}
          </button>
        </form>
      </section>
    </div>
  );
}
