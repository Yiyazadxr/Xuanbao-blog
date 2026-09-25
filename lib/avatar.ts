// 无头像时显示稳定底色和昵称首字。

// 低饱和色板
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

// FNV-1a 风格稳定哈希
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getAvatarColor(seed: string): string {
  if (!seed) return AVATAR_COLORS[0];
  return AVATAR_COLORS[hashString(seed) % AVATAR_COLORS.length];
}
