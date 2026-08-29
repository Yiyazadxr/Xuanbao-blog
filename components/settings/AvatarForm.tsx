"use client";

import { useActionState, useRef, useState } from "react";
import { updateAvatar, type SettingsState } from "@/app/settings/actions";
import { Avatar } from "@/components/ui/Avatar";
import { successCls } from "@/components/ui/form-styles";

const initialState: SettingsState = { ok: false };

// 头像上传表单：预览 + 选择图片上传（自动提交）
export function AvatarForm({ image, name }: { image?: string | null; name?: string }) {
  const [state, formAction, pending] = useActionState(updateAvatar, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-6">
      <Avatar image={preview ?? image} name={name} className="size-14 text-xl" seed={name} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">头像</p>
        <p className="mt-0.5 text-xs text-muted">支持 JPEG / PNG / WebP，不超过 2MB</p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent"
          >
            选择图片
          </button>
          {pending && <span className="text-sm text-muted">上传中…</span>}
        </div>
        <input
          ref={fileRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleSelect}
          className="hidden"
        />
        {state.message && <p className={`${successCls} mt-2`}>{state.message}</p>}
        {state.error && <p className="mt-2 text-sm text-red-500">{state.error}</p>}
      </div>
    </form>
  );
}
