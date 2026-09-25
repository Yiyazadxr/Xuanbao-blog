// 用于暂存后续需要取回的敏感数据。
// 密钥由 AUTH_SECRET 派生，AES-256-GCM 认证加密；密文格式 base64(iv) + ":" + base64(authTag+ciphertext)。
// 仅服务端使用。
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("缺少 AUTH_SECRET，无法加密敏感数据");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${Buffer.concat([authTag, encrypted]).toString("base64")}`;
}

// 密钥变更或数据损坏时抛错。
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
