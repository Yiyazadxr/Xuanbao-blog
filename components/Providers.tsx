"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { LazyMotion } from "framer-motion";
import { DisplaySync } from "@/components/settings/DisplaySync";

// framer-motion 按需特性包：LazyMotion + m 组件只打包 domAnimation（约省 60% 体积），
// 全站动画组件一律用 m 而不是 motion
const loadFeatures = () => import("framer-motion").then((mod) => mod.domAnimation);

// 全局 Provider 汇总：主题 + 登录会话 + 显示偏好同步
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <LazyMotion features={loadFeatures} strict>
          <DisplaySync />
          {children}
        </LazyMotion>
      </NextThemesProvider>
    </SessionProvider>
  );
}
