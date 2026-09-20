// 图片格式识别（纯函数，可独立单测）：只信任文件头，不信任客户端声明的 MIME / 扩展名
export type AllowedImageType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export const ALL_IMAGE_TYPES: readonly AllowedImageType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const EXTENSIONS: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extensionFor(type: AllowedImageType): string {
  return EXTENSIONS[type];
}

// 依据 magic bytes 判断真实图片类型；无法识别返回 null
export function detectImageType(data: Buffer): AllowedImageType | null {
  // JPEG: FF D8 FF
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF: "GIF8"
  if (data.length >= 4 && data.toString("ascii", 0, 4) === "GIF8") {
    return "image/gif";
  }
  // WebP: "RIFF" ....(4 字节大小).... "WEBP"
  if (
    data.length >= 12 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
