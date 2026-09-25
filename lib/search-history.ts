// 搜索历史存入 localStorage，按最近使用去重并截断。
export const SEARCH_HISTORY_KEY = "xr-search-history";
export const SEARCH_HISTORY_MAX = 8;

export function pushHistory(prev: string[], term: string, max = SEARCH_HISTORY_MAX): string[] {
  const t = term.trim();
  if (!t) return prev;
  return [t, ...prev.filter((h) => h !== t)].slice(0, max);
}

export function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((h): h is string => typeof h === "string") : [];
  } catch {
    return [];
  }
}

export function writeHistory(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(list));
  } catch {
    // localStorage 失败不影响搜索。
  }
}
