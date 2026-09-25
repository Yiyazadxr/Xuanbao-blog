// Phosphor 图标离线注册，运行时不请求 Iconify CDN。
import { addCollection } from "@iconify/react/offline";
import localPhIcons from "@/lib/generated/ph-icons.json";

let registered = false;

// 同一前缀仅注册一次。
export function registerLocalIcons() {
  if (registered) return;
  // addCollection 保留集合尺寸，避免默认 16 viewBox 裁剪。
  addCollection(localPhIcons as never);
  registered = true;
}
