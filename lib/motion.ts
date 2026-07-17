// 全站动画常量：所有 framer-motion 动画共用，与 globals.css 的 --ease-custom 保持一致
// 灵感来自 shelby.ashfall.studio 的全局统一缓动做法

// 入场动画：快出缓收（easeOutQuint 风格），用于滚动 reveal / 元素淡入
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// 戏剧性缓动：慢起猛收，用于遮罩揭开 / 幕布转场（对应 CSS 的 --ease-custom）
export const EASE_DRAMATIC = [0.79, 0, 0.06, 1] as const;

// 常用时长（秒）
export const DURATION = {
  fast: 0.4,
  base: 0.7,
  slow: 1.1,
} as const;
