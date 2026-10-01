"use client";

import { useSyncExternalStore } from "react";
import { dayKeyOf, dayKeyToStart, shiftDayKey } from "@/lib/day-key";

function subscribe(notify: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  function schedule() {
    clearTimeout(timer);
    const now = new Date();
    const midnight = dayKeyToStart(shiftDayKey(dayKeyOf(now), 1)).getTime();
    timer = setTimeout(refresh, Math.max(1, Math.min(60_000, midnight - now.getTime())));
  }
  function refresh() {
    notify();
    schedule();
  }
  // 初次快照由 useSyncExternalStore 读取，订阅阶段只注册边界检查。
  schedule();
  window.addEventListener("focus", refresh);
  window.addEventListener("pageshow", refresh);
  window.addEventListener("popstate", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", refresh);
    window.removeEventListener("pageshow", refresh);
    window.removeEventListener("popstate", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}

function getClientDay() {
  if (process.env.NODE_ENV !== "production") {
    const previewDay = new URLSearchParams(window.location.search).get("festivalDate");
    if (previewDay && /^\d{4}-\d{2}-\d{2}$/.test(previewDay)) {
      const parsed = dayKeyToStart(previewDay);
      if (Number.isFinite(parsed.getTime()) && dayKeyOf(parsed) === previewDay) return previewDay;
    }
  }
  return dayKeyOf();
}

export function useFestivalDay() {
  // 静态/ISR HTML 不把构建时的日期固化成当前节日，客户端 hydration 后再读取当日。
  return useSyncExternalStore(subscribe, getClientDay, () => "");
}
