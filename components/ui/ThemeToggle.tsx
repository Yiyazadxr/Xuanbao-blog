"use client";

import { Icon } from "@iconify/react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

// 服务端渲染时返回 false、客户端返回 true（比 useEffect+setState 更规范的挂载检测）
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

// 亮/暗主题切换按钮（挂载前渲染占位，避免服务端/客户端不一致）
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return <span className="inline-block size-10" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "切换到亮色主题" : "切换到暗色主题"}
      className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Icon icon={isDark ? "ph:sun-bold" : "ph:moon-bold"} width={20} height={20} />
    </button>
  );
}
