// 图表配色（纯常量，客户端组件可安全引用）：
// 固定色值而非主题变量，避免亮/暗切换时系列色整体跳变导致图表难以辨认；
// 选色同时保证在 #fafaf9 与 #0a0a0b 两种底色上都有足够对比度。
export const CHART_COLORS = {
  views: "#2dd4bf", // 青绿
  comments: "#38bdf8", // 天蓝
  likes: "#fb7185", // 玫红
  users: "#a78bfa", // 紫
} as const;

// 趋势图系列定义（图例与曲线同源，避免两处各写一份导致颜色/名称割裂）
export const TREND_SERIES = [
  { key: "views", label: "浏览量", color: CHART_COLORS.views },
  { key: "comments", label: "评论", color: CHART_COLORS.comments },
  { key: "likes", label: "点赞", color: CHART_COLORS.likes },
  { key: "users", label: "新用户", color: CHART_COLORS.users },
] as const;

export type TrendSeriesKey = (typeof TREND_SERIES)[number]["key"];

// 分类分布环形图配色（分类数超出时循环取用）
export const DONUT_PALETTE = [
  "#2dd4bf",
  "#38bdf8",
  "#a78bfa",
  "#fbbf24",
  "#fb7185",
  "#34d399",
  "#f472b6",
  "#60a5fa",
] as const;
