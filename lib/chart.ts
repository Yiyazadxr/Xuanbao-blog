// 固定系列色，避免主题切换改变数据映射；兼顾明暗背景对比度。
export const CHART_COLORS = {
  views: "#2dd4bf", // 青绿
  comments: "#38bdf8", // 天蓝
  likes: "#fb7185", // 玫红
  users: "#a78bfa", // 紫
} as const;

// 图例和曲线共用系列定义。
export const TREND_SERIES = [
  { key: "views", label: "浏览量", color: CHART_COLORS.views },
  { key: "comments", label: "评论", color: CHART_COLORS.comments },
  { key: "likes", label: "点赞", color: CHART_COLORS.likes },
  { key: "users", label: "新用户", color: CHART_COLORS.users },
] as const;

export type TrendSeriesKey = (typeof TREND_SERIES)[number]["key"];

// 分类超出色板长度时循环取色。
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
