"use client";

import { useSyncExternalStore } from "react";

// 手动减少动效开关；SSR 快照恒为 false，避免水合差异。
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
