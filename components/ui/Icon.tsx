"use client";

// 本地图标封装：用 @iconify/react 的 offline 版本 + 预注册的 Phosphor 图标集，
// 确保图标数据来自本地打包资源而非 Iconify CDN（零外部请求）。
import { Icon as IconifyIcon, type IconProps } from "@iconify/react/offline";
import { registerLocalIcons } from "@/lib/icons";

registerLocalIcons();

export function Icon(props: IconProps) {
  return <IconifyIcon {...props} />;
}
