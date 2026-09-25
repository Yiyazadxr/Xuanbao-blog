// 开发环境存入 public/uploads，生产环境使用 Vercel Blob。
import { del, put } from "@vercel/blob";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  ALL_IMAGE_TYPES,
  detectImageType,
  extensionFor,
  type AllowedImageType,
} from "@/lib/image-type";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// 不使用用户文件名，防止路径穿越和覆盖。
function uniqueFilename(type: AllowedImageType): string {
  const rand = crypto.randomBytes(12).toString("hex");
  return `${Date.now().toString(36)}-${rand}.${extensionFor(type)}`;
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// 图片类型以文件头为准；allowedTypes 限制目录可用格式。
export async function saveImage(
  data: Buffer,
  dir = "covers",
  allowedTypes: readonly AllowedImageType[] = ALL_IMAGE_TYPES
): Promise<string> {
  if (data.length > MAX_IMAGE_SIZE) {
    throw new Error("图片大小不能超过 5MB");
  }
  const type = detectImageType(data);
  if (!type || !allowedTypes.includes(type)) {
    throw new Error("仅支持 JPEG / PNG / WebP / GIF 图片");
  }

  const filename = uniqueFilename(type);

  if (hasBlobToken()) {
    const { url } = await put(`${dir}/${filename}`, data, {
      access: "public",
      contentType: type,
    });
    return url;
  }

  const baseDir = path.join(process.cwd(), "public", "uploads", dir);
  await mkdir(baseDir, { recursive: true });
  await writeFile(path.join(baseDir, filename), data);
  return `/uploads/${dir}/${filename}`;
}

// 删除失败不阻断主流程。
export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (hasBlobToken()) {
      await del(url);
      return;
    }
    if (url.startsWith("/uploads/")) {
      // normalize 后仍向上跳转则拒绝删除。
      const rel = path.posix.normalize(url.slice("/uploads/".length));
      if (rel === "" || rel.startsWith("..") || path.posix.isAbsolute(rel)) {
        console.error("非法图片路径，拒绝删除：", url);
        return;
      }
      const base = path.resolve(process.cwd(), "public", "uploads");
      const target = path.resolve(base, rel);
      const relative = path.relative(base, target);
      if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
        await unlink(target);
      } else {
        console.error("图片路径越界，拒绝删除：", url);
      }
    }
  } catch (e) {
    console.error("删除图片失败：", e);
  }
}
