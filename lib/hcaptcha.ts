// hCaptcha 服务端校验：向官方站点校验 token 是否有效
// 未配置 HCAPTCHA_SECRET_KEY 时跳过校验（本地开发友好）

let warnedNoSecret = false;

type HCaptchaResponse = {
  success: boolean;
  "error-codes"?: string[];
  [key: string]: unknown;
};

export async function verifyHCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  // 未配置密钥时降级放行，避免本地/未配置环境无法使用表单；
  // 生产环境缺失密钥会导致人机验证无声失效，这里输出一次性告警以便及时发现
  if (!secret) {
    if (process.env.NODE_ENV === "production" && !warnedNoSecret) {
      warnedNoSecret = true;
      console.error("[安全] 生产环境未配置 HCAPTCHA_SECRET_KEY，人机验证已降级放行");
    }
    return true;
  }
  if (!token) return false;

  try {
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as HCaptchaResponse;
    return data.success === true;
  } catch (e) {
    console.error("hCaptcha 校验请求失败：", e);
    return false;
  }
}
