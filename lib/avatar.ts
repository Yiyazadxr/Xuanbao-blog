// 头像逻辑：有头像图显示图片，无头像用「随机纯色底 + 昵称首字」。
// 颜色由用户 id/名字稳定 hash 选中，同一用户永远同一色（不随刷新变化）。

// 中性高级色板（muted，白字/深字均清晰，避免刺眼高饱和）
const AVATAR_COLORS = [
  "#0f766e", // teal
  "#2563eb", // blue
  "#7c3aed", // violet
  "#c2410c", // orange
  "#be185d", // pink
  "#059669", // emerald
  "#4f46e5", // indigo
  "#b45309", // amber
  "#0e7490", // cyan
  "#9333ea", // purple
] as const;

// 简单稳定 hash（FNV-1a 风格），确保同输入同输出
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// 根据任意稳定标识（id 或名字）选中一个底色
export function getAvatarColor(seed: string): string {
  if (!seed) return AVATAR_COLORS[0];
  return AVATAR_COLORS[hashString(seed) % AVATAR_COLORS.length];
}
