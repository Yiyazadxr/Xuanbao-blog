"use client";

import { useActionState, useState } from "react";
import { updateProfile, type SettingsState } from "@/app/settings/actions";
import { HCaptcha } from "@/components/ui/HCaptcha";
import { errorCls, inputCls, labelCls, primaryBtnCls, successCls } from "@/components/ui/form-styles";

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "";
const initialState: SettingsState = { ok: false };

// 修改昵称表单（独立页，带 hCaptcha）
export function NameForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
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
        <label htmlFor="name" className={labelCls}>
          昵称
        </label>
        <input
          id="name"
          name="name"
          defaultValue={name}
          required
          maxLength={50}
          placeholder="你的昵称"
          className={inputCls}
        />
      </div>
      {captchaRequired && <HCaptcha siteKey={HCAPTCHA_SITE_KEY} onVerify={setCaptchaToken} />}
      <button type="submit" disabled={pending || !canSubmit} className={primaryBtnCls}>
        {pending ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
