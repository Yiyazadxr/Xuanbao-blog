"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { getDisplayPreferences } from "@/app/settings/display-actions";
import {
  applyDisplay,
  isSyncEnabled,
  writeDensity,
  writeFontScale,
  writeFooterPy,
  writeHeaderH,
} from "@/lib/display";

// 登录后若开启跨设备同步，从账号拉取显示偏好并应用（否则仅用本地 localStorage）
export function DisplaySync() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !isSyncEnabled()) return;
    let cancelled = false;
    getDisplayPreferences().then((prefs) => {
      if (cancelled || !prefs) return;
      writeFontScale(prefs.fontScale);
      writeDensity(prefs.density);
      if (prefs.headerH != null) writeHeaderH(prefs.headerH);
      if (prefs.footerPy != null) writeFooterPy(prefs.footerPy);
      applyDisplay(prefs.fontScale, prefs.density, prefs.headerH ?? undefined, prefs.footerPy ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
