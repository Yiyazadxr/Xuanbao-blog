"use client";

import { useActionState, useState } from "react";
import { signOut } from "next-auth/react";
import { changePassword, type SettingsState } from "@/app/settings/actions";
import { HCaptcha } from "@/components/ui/HCaptcha";
import { errorCls, inputCls, labelCls, primaryBtnCls, successCls } from "@/components/ui/form-styles";

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "";
const initialState: SettingsState = { ok: false };

// 修改密码表单（独立页，带 hCaptcha）
export function PasswordForm() {
  const [state, formAction, pending] = useActionState(async (previous: SettingsState, data: FormData) => {
    const result = await changePassword(previous, data);
    if (result.ok) await signOut({ callbackUrl: "/login" });
    return result;
  }, initialState);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRequired = Boolean(HCAPTCHA_SITE_KEY);
  const canSubmit = !captchaRequired || captchaToken;

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p role="alert" className={errorCls}>
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p role="status" className={successCls}>
          {state.message}
        </p>
      )}
      <input type="hidden" name="captcha" value={captchaToken} />
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
      {captchaRequired && <HCaptcha siteKey={HCAPTCHA_SITE_KEY} onVerify={setCaptchaToken} />}
      <button type="submit" disabled={pending || !canSubmit} className={primaryBtnCls}>
        {pending ? "修改中…" : "修改密码"}
      </button>
    </form>
  );
}
