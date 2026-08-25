"use client";

import { useEffect, useState } from "react";

// 水合安全的 reduced-motion 检测。
// framer-motion 的 useReducedMotion 在服务端返回 null（falsy）、客户端首帧即返回真实偏好（如 true），
// 导致服务端与客户端首帧渲染不一致，触发 hydration 不匹配。
// 这里首帧固定返回 false 与服务端保持一致，挂载后再读取真实偏好。
export function usePrefersReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduceMotion;
}
