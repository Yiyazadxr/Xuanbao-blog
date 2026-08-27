// 随机密码 / 邀请码生成（使用 crypto 密码学安全随机源）

import { randomBytes } from "crypto";

// 密码字符集：大小写字母 + 数字，剔除易混淆字符（0/O、1/l/I、o）
const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
// 邀请码字符集：大小写字母 + 数字，剔除易混淆字符
const CODE_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ";

function securePick(chars: string, length: number): string {
  const max = Math.floor(256 / chars.length) * chars.length; // 拒绝采样避免取模偏差
  const bytes = randomBytes(length * 2);
  let out = "";
  let i = 0;
  while (out.length < length && i < bytes.length) {
    const b = bytes[i];
    if (b < max) out += chars[b % chars.length];
    i++;
  }
  // 极端情况下字节不足则补齐（概率可忽略）
  while (out.length < length) {
    out += chars[randomBytes(1)[0] % chars.length];
  }
  return out;
}

// 生成 12 位随机初始密码（大小写字母 + 数字，无易混淆字符）
export function generateRandomPassword(length = 12): string {
  return securePick(PASSWORD_CHARS, length);
}

// 生成邀请码：XR- + 2 个随机大写字母 + - + 12 位随机字符
// 例：XR-AB-a1b2c3d4e5f6
export function generateInviteCode(): string {
  const letters = securePick(CODE_LETTERS, 2);
  const tail = securePick(CODE_CHARS, 12);
  return `XR-${letters}-${tail}`;
}
