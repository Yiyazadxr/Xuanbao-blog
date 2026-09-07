// 骨架屏基础块：统一呼吸动画与色板，避免各页面各写一份 animate-pulse
// 圆角/尺寸由调用方通过 className 控制，保证与真实元素结构 1:1、切换时不跳动
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse bg-foreground/10 ${className ?? ""}`} />;
}
