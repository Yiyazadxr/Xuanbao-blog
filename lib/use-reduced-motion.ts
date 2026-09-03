"use client";

// 全站统一忽略系统「减少动画效果」偏好。
// 此前组件逐处判断 reduceMotion，导致开启系统减少动效时高级动画全部消失。
// 现由上层决定始终播放入场动画，此 hook 恒返回 false，保持 API 兼容不做逐文件改动。
export function usePrefersReducedMotion(): boolean {
  return false;
}
