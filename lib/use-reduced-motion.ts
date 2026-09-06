"use client";

import { useSyncExternalStore } from "react";

// 手动「减少动效」开关（localStorage 驱动，响应式）。
// 此前全站忽略系统 reduced-motion；现改为可手动控制：
// 开启后全站入场/滚动动画跳过。SSR 快照恒 false，水合安全。
const KEY = "xr-reduce-motion";

const listeners = new Set<() => void>();
let cache: boolean | null = null;

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): boolean {
  if (cache === null) cache = read();
  return cache;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** 写入并广播，所有 usePrefersReducedMotion 订阅者同步更新 */
export function setReducedMotion(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
  cache = on;
  listeners.forEach((l) => l());
}
