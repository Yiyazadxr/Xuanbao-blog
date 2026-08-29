"use client";

import Cropper, { type Area } from "react-easy-crop";
import { useActionState, useEffect, useRef, useState } from "react";
import { updateAvatar, type SettingsState } from "@/app/settings/actions";
import { Avatar } from "@/components/ui/Avatar";
import { successCls } from "@/components/ui/form-styles";

const initialState: SettingsState = { ok: false };
const SIZE = 256; // 输出头像边长（px，正方形）

// 从原图按裁切区域像素裁出正方形 blob（含旋转，由 Cropper 的 cropPixels 决定）
function cropImage(imageSrc: string, pixels: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas 不可用"));
      ctx.drawImage(
        img,
        pixels.x,
        pixels.y,
        pixels.width,
        pixels.height,
        0,
        0,
        SIZE,
        SIZE
      );
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("裁切失败"))), "image/jpeg", 0.9);
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = imageSrc;
  });
}

// 头像编辑器：上传 → 缩放/旋转裁剪 → 输出上传（独立页使用）
export function AvatarEditor({ initialImage, name }: { initialImage?: string | null; name?: string }) {
  const [state, formAction, pending] = useActionState(updateAvatar, initialState);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }

  async function handleSubmit() {
    if (!imageSrc || !cropPixels) return;
    const blob = await cropImage(imageSrc, cropPixels);
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    const fd = new FormData();
    fd.append("avatar", file);
    formAction(fd);
  }

  // 清理 object URL
  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  return (
    <div className="space-y-6">
      {/* 当前头像 */}
      <div className="flex items-center gap-4">
        <Avatar image={imageSrc ?? initialImage} name={name} className="size-16 text-2xl" seed={name} />
        <div>
          <p className="text-sm font-medium">当前头像</p>
          <p className="mt-0.5 text-xs text-muted">上传后可缩放、旋转并裁剪为方形</p>
        </div>
      </div>

      {/* 选择图片 / 裁剪区 */}
      {!imageSrc ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-8 text-muted transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          <span className="text-sm">点击选择图片</span>
          <span className="text-xs">支持 JPEG / PNG / WebP，不超过 2MB</span>
        </button>
      ) : (
        <div className="space-y-4">
          <div className="relative h-64 overflow-hidden rounded-2xl bg-foreground/5">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={(_a, pixels) => setCropPixels(pixels)}
            />
          </div>

          {/* 缩放 / 旋转 控制 */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <span className="w-12 shrink-0 text-muted">缩放</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-foreground/10 accent-[var(--accent)]"
              />
            </label>
            <label className="flex items-center gap-3 text-sm">
              <span className="w-12 shrink-0 text-muted">旋转</span>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-foreground/10 accent-[var(--accent)]"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "上传中…" : "确认裁剪"}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="inline-flex h-11 cursor-pointer items-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors duration-200 hover:border-foreground/40 disabled:opacity-50"
            >
              换一张
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleSelect}
        className="hidden"
      />

      {state.message && <p className={`${successCls} mt-2`}>{state.message}</p>}
      {state.error && <p className="mt-2 text-sm text-red-500">{state.error}</p>}
    </div>
  );
}
