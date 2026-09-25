"use client";

import { isValidElement, useRef, type ClassAttributes, type HTMLAttributes } from "react";
import type { ExtraProps } from "react-markdown";
import { useCopyFeedback } from "@/lib/use-copy-feedback";

// Clipboard API 不可用时回退到 execCommand。
export function CodeBlock({
  children,
  className,
  node: _node,
  ...props
}: ClassAttributes<HTMLPreElement> & HTMLAttributes<HTMLPreElement> & ExtraProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const { status, show } = useCopyFeedback();

  let language = "";
  if (isValidElement(children)) {
    const cls = (children.props as { className?: string })?.className ?? "";
    const m = /language-([\w-]+)/.exec(cls);
    if (m) language = m[1];
  }
  const preCls = ["hljs", className].filter(Boolean).join(" ") || undefined;
  const copied = status === "copied";
  const failed = status === "failed";

  async function handleCopy() {
    const text = preRef.current?.textContent ?? "";
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // 兼容旧浏览器和无剪贴板权限的环境。
      const range = document.createRange();
      const sel = window.getSelection();
      if (preRef.current && sel) {
        range.selectNodeContents(preRef.current);
        sel.removeAllRanges();
        sel.addRange(range);
        ok = document.execCommand("copy");
        sel.removeAllRanges();
      }
    }
    show(ok ? "copied" : "failed");
  }

  return (
    <div className="group relative" role="figure">
      {/* 触摸设备没有 hover，复制按钮保持可见。 */}
      <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-2 opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
        {language && (
          <span className="rounded bg-black/30 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">
            {language}
          </span>
        )}
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "已复制" : failed ? "复制失败" : "复制代码"}
          className="pointer-events-auto flex size-7 cursor-pointer items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
        >
          {copied ? (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M13.5 4.5L6 12l-3.5-3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : failed ? (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M3.5 10.5h-.5a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 3 1.5h6A1.5 1.5 0 0 1 10.5 3v.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>
      <pre ref={preRef} className={preCls} {...props}>
        {children}
      </pre>
    </div>
  );
}
