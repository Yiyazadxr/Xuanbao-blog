"use client";

import { useEffect, useRef } from "react";

// 最小化 hCaptcha 接入（无第三方 npm 依赖）：
// 动态加载官方脚本，显式渲染 widget，回调向父级传递 token
declare global {
  interface Window {
    hcaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
    onHCaptchaLoad?: () => void;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    window.onHCaptchaLoad = () => resolve();
    const script = document.createElement("script");
    script.src = "https://js.hcaptcha.com/1/api.js?onload=onHCaptchaLoad&render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function HCaptcha({
  siteKey,
  onVerify,
}: {
  siteKey: string;
  onVerify: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    loadScript().then(() => {
      if (cancelled || !containerRef.current || !window.hcaptcha) return;
      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey: siteKey,
        size: "normal",
        theme: "light",
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onVerify(""),
        "error-callback": () => onVerify(""),
      });
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.hcaptcha) {
        window.hcaptcha.remove(widgetIdRef.current);
        widgetIdRef.current = "";
      }
    };
  }, [siteKey, onVerify]);

  return <div ref={containerRef} className="mt-2" />;
}
