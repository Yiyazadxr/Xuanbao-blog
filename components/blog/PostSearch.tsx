"use client";

import { Icon } from "@/components/ui/Icon";
import { useEffect, useRef, useState } from "react";
import { pushHistory, readHistory, writeHistory } from "@/lib/search-history";

// 搜索框（受控）：输入交给父组件做列表过滤，自身只负责历史记录的读写与展示
export function PostSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  // 首帧回填搜索历史：只执行一次，属「同步外部系统后的收尾」，故允许 effect 内 setState
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setHistory(readHistory());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function addHistory(term: string) {
    const t = term.trim();
    if (!t) return;
    const next = pushHistory(history, t);
    setHistory(next);
    writeHistory(next);
  }

  function clearHistory() {
    setHistory([]);
    writeHistory([]);
  }

  // 点击历史词：回填到输入框（提到历史最前）并触发搜索
  function selectHistory(term: string) {
    addHistory(term);
    onChange(term);
    setOpen(false);
  }

  // 点击外部 / Escape 关闭历史下拉
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const showHistory = open && !value.trim() && history.length > 0;

  return (
    <div ref={boxRef} className="relative w-full sm:w-72">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          addHistory(value);
        }}
      >
        <label htmlFor="post-search" className="sr-only">
          搜索文章
        </label>
        <Icon
          icon="ph:magnifying-glass-bold"
          width={18}
          height={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          id="post-search"
          type="search"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="搜索文章…"
          className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm outline-none transition-colors duration-200 placeholder:text-muted focus:border-accent"
        />
      </form>

      {showHistory && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
            <span className="text-xs font-medium text-muted">搜索历史</span>
            <button
              type="button"
              onClick={clearHistory}
              className="cursor-pointer text-xs text-muted transition-colors duration-150 hover:text-foreground"
            >
              清空
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {history.map((term) => (
              <li key={term}>
                <button
                  type="button"
                  onClick={() => selectHistory(term)}
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
                >
                  <Icon icon="ph:clock-counter-clockwise-bold" width={14} height={14} aria-hidden />
                  <span className="truncate">{term}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
