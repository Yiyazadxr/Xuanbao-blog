import type { NextConfig } from "next";

// 基础安全响应头在开发和生产环境生效。
const baseSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// CSP 仅在生产环境启用，避免阻断 Turbopack HMR/eval。
// script-src 'unsafe-inline' 为 next-themes 注入内联脚本所需；style-src 'unsafe-inline' 为 React/framer-motion 内联样式所需
const cspHeader = {
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    // hCaptcha 脚本、挑战 iframe、图片和 API。
    "script-src 'self' 'unsafe-inline' https://js.hcaptcha.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://avatars.githubusercontent.com https://*.githubusercontent.com https://*.public.blob.vercel-storage.com https://*.hcaptcha.com",
    "font-src 'self' data:",
    "connect-src 'self' https://hcaptcha.com https://*.hcaptcha.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src https://hcaptcha.com https://*.hcaptcha.com",
  ].join("; "),
};

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 6MB 覆盖 5MB 图片及 multipart 开销。
      bodySizeLimit: "6mb",
    },
    // framer-motion 按需加载导出。
    optimizePackageImports: ["framer-motion"],
  },
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "**.githubusercontent.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        source: "/(.*)",
        headers: isProd ? [...baseSecurityHeaders, cspHeader] : baseSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
