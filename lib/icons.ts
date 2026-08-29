// 图标本地化：把项目实际用到的 Phosphor 图标注册到 @iconify/react 的离线存储，
// 避免运行时从 Iconify CDN 拉取。图标数据来自 lib/generated/ph-icons.json（由
// scripts/extract-icons.ts 从 @iconify-json/ph 提取，仅含用到的 29 个，约 11KB）。
import { addIcon } from "@iconify/react/offline";
import localPhIcons from "@/lib/generated/ph-icons.json";

let registered = false;

// 仅注册一次（模块可能被多处 import；addIcon 重复注册同名前会覆盖，幂等安全）
export function registerLocalIcons() {
  if (registered) return;
  const set = localPhIcons as unknown as { prefix: string; icons: Record<string, { body: string }> };
  for (const [name, data] of Object.entries(set.icons)) {
    if (data) {
      // 完整图标名带前缀，如 "ph:bell-bold"，写入离线存储
      addIcon(`${set.prefix}:${name}`, data);
    }
  }
  registered = true;
}
