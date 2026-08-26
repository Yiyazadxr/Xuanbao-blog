// 图片存储抽象：本地 public/uploads（开发）+ Vercel Blob（生产，需 BLOB_READ_WRITE_TOKEN）
import { del, put } from "@vercel/blob";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

// 允许的图片格式（MIME → 扩展名）
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export function isAllowedImageType(type: string): boolean {
  return type in ALLOWED_TYPES;
}

// 生成唯一文件名（不信任用户文件名，防路径穿越/覆盖）
function uniqueFilename(type: string): string {
  const ext = ALLOWED_TYPES[type] ?? "bin";
  const rand = crypto.randomBytes(12).toString("hex");
  return `${Date.now().toString(36)}-${rand}.${ext}`;
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// 保存图片，返回可公开访问的 URL
export async function saveImage(file: { type: string; data: Buffer }): Promise<string> {
  if (!isAllowedImageType(file.type)) {
    throw new Error("仅支持 JPEG / PNG / WebP / GIF 图片");
  }
  if (file.data.length > MAX_IMAGE_SIZE) {
    throw new Error("图片大小不能超过 5MB");
  }

  const filename = uniqueFilename(file.type);

  if (hasBlobToken()) {
    const { url } = await put(`covers/${filename}`, file.data, {
      access: "public",
      contentType: file.type,
    });
    return url;
  }

  // 本地开发：写入 public/uploads，由 Next 静态服务
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), file.data);
  return `/uploads/${filename}`;
}

// 删除图片（Blob URL 或本地 /uploads/ 路径）；失败静默，不阻断主流程
export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (hasBlobToken()) {
      await del(url);
      return;
    }
    if (url.startsWith("/uploads/")) {
      const filename = url.replace("/uploads/", "");
      await unlink(path.join(process.cwd(), "public", "uploads", filename));
    }
  } catch (e) {
    console.error("删除图片失败：", e);
  }
}
