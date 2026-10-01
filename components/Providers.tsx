"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { LazyMotion } from "framer-motion";
import { DisplaySync } from "@/components/settings/DisplaySync";
import { useEffect } from "react";
import { getFestivalsForDay, MONOCHROME_FESTIVALS } from "@/lib/festivals";
import { useFestivalDay } from "@/lib/use-festival-day";

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
          <MonochromeDay />
          {children}
        </LazyMotion>
      </NextThemesProvider>
    </SessionProvider>
  );
}

function MonochromeDay() {
  const day = useFestivalDay();

  useEffect(() => {
    const isMonochrome = getFestivalsForDay(day).some((id) => MONOCHROME_FESTIVALS.has(id));
    document.documentElement.toggleAttribute("data-monochrome-day", isMonochrome);
  }, [day]);

  return null;
}
