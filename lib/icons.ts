// 图标本地化：把项目实际用到的 Phosphor 图标注册到 @iconify/react 的离线存储，
// 避免运行时从 Iconify CDN 拉取。图标数据来自 lib/generated/ph-icons.json（由
// scripts/extract-icons.ts 从 @iconify-json/ph 提取，仅含用到的 29 个，约 11KB）。
import { addCollection } from "@iconify/react/offline";
import localPhIcons from "@/lib/generated/ph-icons.json";

let registered = false;

// 仅注册一次（模块可能被多处 import；addCollection 重复注册同前缀会覆盖，幂等安全）
export function registerLocalIcons() {
  if (registered) return;
  // 用 addCollection 而非逐图标 addIcon：保留集合级 width/height(Phosphor 256×256)，
  // 否则 viewBox 会被默认 16 裁剪导致图标不可见
  addCollection(localPhIcons as never);
  registered = true;
}
