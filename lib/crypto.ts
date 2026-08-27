// 对称加密工具：用于保护需要暂存、事后又能取回的敏感数据（如邀请码路径的自设明文密码）。
// 密钥由 AUTH_SECRET 派生，AES-256-GCM 认证加密；密文格式 base64(iv) + ":" + base64(authTag+ciphertext)。
// 仅服务端使用（依赖 process.env.AUTH_SECRET，客户端不可 import）。
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

// 从 AUTH_SECRET 派生 32 字节密钥
function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("缺少 AUTH_SECRET，无法加密敏感数据");
  }
  return createHash("sha256").update(secret).digest();
}

// 加密：返回 "iv:authTag+ciphertext" 的 base64 字符串
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${Buffer.concat([authTag, encrypted]).toString("base64")}`;
}

// 解密；失败（密钥变更/数据损坏）抛错，调用方需捕获
export function decryptSecret(payload: string): string {
  const key = deriveKey();
  const [ivB64, dataB64] = payload.split(":");
  if (!ivB64 || !dataB64) throw new Error("密文格式非法");
  const iv = Buffer.from(ivB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const authTag = data.subarray(0, 16);
  const encrypted = data.subarray(16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
