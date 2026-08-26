"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { DisplaySync } from "@/components/settings/DisplaySync";

// 全局 Provider 汇总：主题 + 登录会话 + 显示偏好同步
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <DisplaySync />
        {children}
      </NextThemesProvider>
    </SessionProvider>
  );
}
